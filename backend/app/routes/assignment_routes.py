from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models.assignments import (
    Assignment,
    AssignmentUser,
    AssignmentGroup,
    AssignmentSubmission
)
from app.models.projects import CollaborativeProject
from app.models.users import User
from app.models.groups import Group
from app.middlewares.auth import require_auth
from datetime import datetime, timezone
import traceback

assignment_bp = Blueprint('assignments', __name__)


def parse_datetime_from_frontend(datetime_str):
    """
    Parse datetime string from frontend.
    Frontend sends datetime without timezone info (e.g., '2025-12-20T14:30').
    We treat this as UTC and make it timezone-aware.
    """
    if not datetime_str:
        return None
    
    try:
        # Parse the datetime string
        dt = datetime.fromisoformat(datetime_str)
        
        # If already timezone-aware, return as-is
        if dt.tzinfo is not None:
            return dt
        
        # If naive (no timezone), treat as UTC
        return dt.replace(tzinfo=timezone.utc)
    except (ValueError, AttributeError) as e:
        current_app.logger.error(f"Error parsing datetime '{datetime_str}': {e}")
        return None


def require_teacher_or_admin(func):
    """Decorator to require teacher or admin role"""
    def wrapper(user_info, *args, **kwargs):
        user = User.query.get(user_info['user_id'])
        if not user or user.role not in ['teacher', 'admin']:
            return jsonify({'error': 'Only teachers and admins can perform this action'}), 403
        return func(user_info, *args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper


# ============================================================
# ASSIGNMENT CRUD
# ============================================================

@assignment_bp.route('', methods=['POST'])
@require_auth
@require_teacher_or_admin
def create_assignment(user_info):
    """
    Create a new assignment
    Only teachers/admins can create assignments
    """
    try:
        user = User.query.get(user_info['user_id'])
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Assignment name is required'}), 400
        
        # Create assignment
        assignment = Assignment(
            name=data['name'],
            description=data.get('description', ''),
            due_date=parse_datetime_from_frontend(data.get('due_date')),
            auto_freeze_on_due=data.get('auto_freeze_on_due', False)
        )
        
        # Add creator as organizer
        assignment.organizers.append(user)
        
        # Add additional organizers if specified
        if data.get('organizer_ids'):
            for organizer_id in data['organizer_ids']:
                organizer = User.query.get(str(organizer_id))
                if organizer and organizer.role in ['teacher', 'admin'] and organizer.id != user.id:
                    assignment.organizers.append(organizer)
        
        db.session.add(assignment)
        db.session.flush()
        
        # Assign to users
        if data.get('user_ids'):
            for user_id in data['user_ids']:
                assignment.assign_to_user(User.query.get(str(user_id)))
        
        # Assign to groups
        if data.get('group_ids'):
            for group_id in data['group_ids']:
                assignment.assign_to_group(Group.query.get(group_id))
        
        db.session.commit()
        
        current_app.logger.info(f"Assignment {assignment.id} created by {user.username}")
        
        return jsonify({
            'success': True,
            'assignment': assignment.to_dict(include_assignments=True)
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error creating assignment: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Failed to create assignment', 'details': str(e)}), 500


@assignment_bp.route('', methods=['GET'])
@require_auth
def list_assignments(user_info):
    """
    List assignments
    - for_submission=true: Only show assignments the user is assigned to (regardless of role)
    - for_submission=false/unset: 
        - Teachers/admins: See assignments they organize
        - Students: See assignments assigned to them
    """
    try:
        user = User.query.get(user_info['user_id'])
        for_submission = request.args.get('for_submission', '').lower() == 'true'
        
        if for_submission:
            # For submission: Only show assignments user is actually assigned to
            # This applies to all users, including teachers/admins
            direct_assignments = AssignmentUser.query.filter_by(user_id=user.id).all()
            assignment_ids = set([a.assignment_id for a in direct_assignments])
            
            # Add group assignments
            if user.groups:
                user_group_ids = [g.id for g in user.groups]
                group_assignments = AssignmentGroup.query.filter(
                    AssignmentGroup.group_id.in_(user_group_ids)
                ).all()
                assignment_ids.update([a.assignment_id for a in group_assignments])
            
            current_app.logger.info(f"User {user.username} can submit to assignment IDs: {assignment_ids}")
            
            # Only query if user has any assignments
            if assignment_ids:
                assignments = Assignment.query.filter(
                    Assignment.id.in_(assignment_ids),
                    Assignment.deleted_at.is_(None)
                ).order_by(Assignment.created_at.desc()).all()
            else:
                assignments = []
        elif user.role in ['teacher', 'admin']:
            # For management: Get assignments where user is organizer
            assignments = Assignment.query.filter(
                Assignment.organizers.contains(user),
                Assignment.deleted_at.is_(None)
            ).order_by(Assignment.created_at.desc()).all()
        else:
            # Students: Get assignments assigned to user (directly or via group)
            direct_assignments = AssignmentUser.query.filter_by(user_id=user.id).all()
            assignment_ids = set([a.assignment_id for a in direct_assignments])
            
            # Add group assignments
            if user.groups:
                user_group_ids = [g.id for g in user.groups]
                group_assignments = AssignmentGroup.query.filter(
                    AssignmentGroup.group_id.in_(user_group_ids)
                ).all()
                assignment_ids.update([a.assignment_id for a in group_assignments])
            
            current_app.logger.info(f"Student {user.username} has access to assignment IDs: {assignment_ids}")
            
            # Only query if user has any assignments, otherwise return empty list
            if assignment_ids:
                assignments = Assignment.query.filter(
                    Assignment.id.in_(assignment_ids),
                    Assignment.deleted_at.is_(None)
                ).order_by(Assignment.created_at.desc()).all()
            else:
                assignments = []
        
        assignment_list = []
        for assignment in assignments:
            assignment_data = assignment.to_dict(include_assignments=True)
            
            # Add submission status for current user
            submission = assignment.get_submission(user)
            assignment_data['user_submission'] = submission.to_dict() if submission else None
            
            # For organizers, add statistics
            if assignment.is_organizer(user):
                total_assigned = len(assignment.get_all_assigned_users())
                total_submitted = len(assignment.submissions)
                
                assignment_data['statistics'] = {
                    'total_assigned': total_assigned,
                    'total_submitted': total_submitted,
                    'submission_rate': (total_submitted / total_assigned * 100) if total_assigned > 0 else 0
                }
            
            assignment_list.append(assignment_data)
        
        return jsonify({
            'success': True,
            'assignments': assignment_list
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error listing assignments: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': 'Failed to list assignments', 'details': str(e)}), 500


@assignment_bp.route('/<int:assignment_id>', methods=['GET'])
@require_auth
def get_assignment(user_info, assignment_id):
    """Get assignment details"""
    try:
        user = User.query.get(user_info['user_id'])
        assignment = Assignment.query.get(assignment_id)
        
        if not assignment or assignment.is_deleted:
            return jsonify({'error': 'Assignment not found'}), 404
        
        # Check access
        is_organizer = assignment.is_organizer(user)
        has_access = is_organizer or assignment.has_access(user)
        
        if not has_access:
            return jsonify({'error': 'Access denied'}), 403
        
        assignment_data = assignment.to_dict(
            include_assignments=is_organizer,
            include_submissions=is_organizer
        )
        assignment_data['is_organizer'] = is_organizer
        
        # Add user's submission
        submission = assignment.get_submission(user)
        assignment_data['user_submission'] = submission.to_dict() if submission else None
        
        return jsonify({
            'success': True,
            'assignment': assignment_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting assignment: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': 'Failed to get assignment', 'details': str(e)}), 500


@assignment_bp.route('/<int:assignment_id>', methods=['PUT'])
@require_auth
def update_assignment(user_info, assignment_id):
    """Update assignment (only organizers)"""
    try:
        user = User.query.get(user_info['user_id'])
        assignment = Assignment.query.get(assignment_id)
        
        if not assignment or assignment.is_deleted:
            return jsonify({'error': 'Assignment not found'}), 404
        
        if not assignment.is_organizer(user):
            return jsonify({'error': 'Only organizers can update assignments'}), 403
        
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            assignment.name = data['name']
        
        if 'description' in data:
            assignment.description = data['description']
        
        if 'due_date' in data:
            assignment.due_date = parse_datetime_from_frontend(data.get('due_date'))
        
        if 'auto_freeze_on_due' in data:
            assignment.auto_freeze_on_due = data['auto_freeze_on_due']
        
        assignment.updated_at = datetime.now(timezone.utc)
        
        db.session.commit()
        
        current_app.logger.info(f"Assignment {assignment_id} updated by {user.username}")
        
        return jsonify({
            'success': True,
            'assignment': assignment.to_dict(include_assignments=True)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error updating assignment: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Failed to update assignment', 'details': str(e)}), 500


@assignment_bp.route('/<int:assignment_id>', methods=['DELETE'])
@require_auth
def delete_assignment(user_info, assignment_id):
    """Soft delete assignment (only organizers)"""
    try:
        user = User.query.get(user_info['user_id'])
        assignment = Assignment.query.get(assignment_id)
        
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404
        
        if not assignment.is_organizer(user):
            return jsonify({'error': 'Only organizers can delete assignments'}), 403
        
        # Unfreeze all projects that were frozen for this assignment and delete submissions
        unfrozen_count = 0
        deleted_submissions_count = 0
        
        # Get all submissions before deleting them
        submissions_to_delete = list(assignment.submissions)
        
        for submission in submissions_to_delete:
            collab_project = submission.collaborative_project
            if collab_project and collab_project.is_frozen():
                # Unfreeze all permissions that were frozen for this assignment
                reason_prefix = f"Assignment submission: Assignment #{assignment_id}"
                for permission in collab_project.permissions:
                    if permission.is_frozen and permission.frozen_reason and permission.frozen_reason.startswith(reason_prefix):
                        permission.unfreeze()
                        unfrozen_count += 1
                
                current_app.logger.info(f"Unfroze project {collab_project.id} (assignment {assignment_id})")
            
            # Delete the submission entry
            db.session.delete(submission)
            deleted_submissions_count += 1
        
        assignment.soft_delete(user.id)
        db.session.commit()
        
        current_app.logger.info(
            f"Assignment {assignment_id} deleted by {user.username}, "
            f"unfroze {unfrozen_count} permissions, deleted {deleted_submissions_count} submissions"
        )
        
        return jsonify({
            'success': True,
            'message': 'Assignment deleted successfully',
            'unfrozen_permissions': unfrozen_count,
            'deleted_submissions': deleted_submissions_count
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting assignment: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Failed to delete assignment', 'details': str(e)}), 500


# ============================================================
# ASSIGNMENT USER/GROUP MANAGEMENT
# ============================================================

@assignment_bp.route('/<int:assignment_id>/assign-user', methods=['POST'])
@require_auth
def assign_user(user_info, assignment_id):
    """Assign assignment to a user (only organizers)"""
    try:
        user = User.query.get(user_info['user_id'])
        assignment = Assignment.query.get(assignment_id)
        
        if not assignment or assignment.is_deleted:
            return jsonify({'error': 'Assignment not found'}), 404
        
        if not assignment.is_organizer(user):
            return jsonify({'error': 'Only organizers can assign users'}), 403
        
        data = request.get_json()
        target_user_id = data.get('user_id')
        
        if not target_user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        # Convert to string since User.id is String type
        target_user = User.query.get(str(target_user_id))
        if not target_user:
            return jsonify({'error': 'User not found'}), 404
        
        assignment.assign_to_user(target_user)
        db.session.commit()
        
        current_app.logger.info(f'User {target_user.username} assigned to assignment {assignment.id}')
        
        return jsonify({
            'success': True,
            'message': f'Assignment assigned to {target_user.username}',
            'assignment': assignment.to_dict(include_assignments=True)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error assigning user: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to assign user', 'details': str(e)}), 500


@assignment_bp.route('/<int:assignment_id>/assign-group', methods=['POST'])
@require_auth
def assign_group(user_info, assignment_id):
    """Assign assignment to a group (only organizers)"""
    try:
        user = User.query.get(user_info['user_id'])
        assignment = Assignment.query.get(assignment_id)
        
        if not assignment or assignment.is_deleted:
            return jsonify({'error': 'Assignment not found'}), 404
        
        if not assignment.is_organizer(user):
            return jsonify({'error': 'Only organizers can assign groups'}), 403
        
        data = request.get_json()
        group_id = data.get('group_id')
        
        if not group_id:
            return jsonify({'error': 'Group ID is required'}), 400
        
        group = Group.query.get(group_id)
        if not group:
            return jsonify({'error': 'Group not found'}), 404
        
        assignment.assign_to_group(group)
        db.session.commit()
        
        current_app.logger.info(f'Group {group.name} assigned to assignment {assignment.id}')
        
        return jsonify({
            'success': True,
            'message': f'Assignment assigned to group {group.name}',
            'assignment': assignment.to_dict(include_assignments=True)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error assigning group: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to assign group', 'details': str(e)}), 500


# ============================================================
# SUBMISSION MANAGEMENT
# ============================================================

@assignment_bp.route('/<int:assignment_id>/submit', methods=['POST'])
@require_auth
def submit_assignment(user_info, assignment_id):
    """Submit a collaborative project to an assignment"""
    try:
        user = User.query.get(user_info['user_id'])
        assignment = Assignment.query.get(assignment_id)
        
        if not assignment or assignment.is_deleted:
            return jsonify({'error': 'Assignment not found'}), 404
        
        if not assignment.has_access(user):
            return jsonify({'error': 'You are not assigned to this assignment'}), 403
        
        data = request.get_json()
        collab_project_id = data.get('collaborative_project_id')
        
        if not collab_project_id:
            return jsonify({'error': 'Collaborative project ID is required'}), 400
        
        collab_project = CollaborativeProject.query.get(collab_project_id)
        if not collab_project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Check if user has access to the project
        if collab_project.created_by != user.id and not collab_project.get_user_permission(user):
            return jsonify({'error': 'You do not have access to this project'}), 403
        
        # Check if user has already submitted ANY project to this assignment
        existing_submission = AssignmentSubmission.query.filter_by(
            assignment_id=assignment_id,
            user_id=user.id
        ).first()
        
        if existing_submission:
            return jsonify({
                'error': 'You have already submitted a project to this assignment',
                'submitted_project_id': existing_submission.collaborative_project_id
            }), 400
        
        # Create submission (do NOT freeze automatically)
        submission = AssignmentSubmission(
            assignment_id=assignment.id,
            user_id=user.id,
            collaborative_project_id=collab_project.id,
            submitted_commit_id=collab_project.latest_commit_id
        )
        
        db.session.add(submission)
        db.session.commit()
        
        current_app.logger.info(
            f"User {user.username} submitted project {collab_project.id} to assignment {assignment_id}"
        )
        
        return jsonify({
            'success': True,
            'message': 'Project submitted successfully',
            'submission': submission.to_dict()
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error submitting assignment: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Failed to submit assignment', 'details': str(e)}), 500


@assignment_bp.route('/<int:assignment_id>/withdraw', methods=['POST'])
@require_auth
def withdraw_submission(user_info, assignment_id):
    """Withdraw a project submission from an assignment (only if not overdue)"""
    try:
        user = User.query.get(user_info['user_id'])
        assignment = Assignment.query.get(assignment_id)
        
        if not assignment or assignment.is_deleted:
            return jsonify({'error': 'Assignment not found'}), 404
        
        if not assignment.has_access(user):
            return jsonify({'error': 'You are not assigned to this assignment'}), 403
        
        data = request.get_json()
        collab_project_id = data.get('collaborative_project_id')
        
        if not collab_project_id:
            return jsonify({'error': 'Collaborative project ID is required'}), 400
        
        # Find the submission
        submission = AssignmentSubmission.query.filter_by(
            assignment_id=assignment_id,
            user_id=user.id,
            collaborative_project_id=collab_project_id
        ).first()
        
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404
        
        # Check if assignment is overdue
        if assignment.due_date:
            now = datetime.now(timezone.utc)
            due_date = assignment.due_date
            # Ensure due_date is timezone-aware for comparison
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)
            if now > due_date:
                return jsonify({'error': 'Cannot withdraw submission after due date'}), 403
        
        # Delete the submission
        db.session.delete(submission)
        db.session.commit()
        
        current_app.logger.info(
            f"User {user.username} withdrew project {collab_project_id} from assignment {assignment_id}"
        )
        
        return jsonify({
            'success': True,
            'message': 'Submission withdrawn successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error withdrawing submission: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Failed to withdraw submission', 'details': str(e)}), 500


@assignment_bp.route('/<int:assignment_id>/submissions', methods=['GET'])
@require_auth
def get_submissions(user_info, assignment_id):
    """Get all submissions for an assignment (only organizers)"""
    try:
        user = User.query.get(user_info['user_id'])
        assignment = Assignment.query.get(assignment_id)
        
        if not assignment or assignment.is_deleted:
            return jsonify({'error': 'Assignment not found'}), 404
        
        if not assignment.is_organizer(user):
            return jsonify({'error': 'Only organizers can view all submissions'}), 403
        
        submissions = assignment.submissions
        submission_list = [s.to_dict() for s in submissions]
        
        # Add freeze status for each submission
        for i, submission in enumerate(submissions):
            submission_list[i]['is_frozen'] = submission.collaborative_project.is_frozen()
        
        return jsonify({
            'success': True,
            'submissions': submission_list,
            'total': len(submissions)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting submissions: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': 'Failed to get submissions', 'details': str(e)}), 500


# ============================================================
# FREEZE/UNFREEZE MANAGEMENT
# ============================================================

@assignment_bp.route('/submissions/<int:submission_id>/freeze', methods=['POST'])
@require_auth
def freeze_submission(user_info, submission_id):
    """Freeze a submitted project (only organizers)"""
    try:
        user = User.query.get(user_info['user_id'])
        submission = AssignmentSubmission.query.get(submission_id)
        
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404
        
        if not submission.assignment.is_organizer(user):
            return jsonify({'error': 'Only organizers can freeze submissions'}), 403
        
        collab_project = submission.collaborative_project
        
        if collab_project.is_frozen():
            return jsonify({'error': 'Project is already frozen'}), 400
        
        # Freeze the project
        collab_project.freeze_for_assignment(user.id, submission.assignment_id)
        db.session.commit()
        
        current_app.logger.info(
            f"Project {collab_project.id} frozen by {user.username} for assignment {submission.assignment_id}"
        )
        
        return jsonify({
            'success': True,
            'message': 'Project frozen successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error freezing submission: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Failed to freeze submission', 'details': str(e)}), 500


@assignment_bp.route('/submissions/<int:submission_id>/unfreeze', methods=['POST'])
@require_auth
def unfreeze_submission(user_info, submission_id):
    """Unfreeze a submitted project (only organizers)"""
    try:
        user = User.query.get(user_info['user_id'])
        submission = AssignmentSubmission.query.get(submission_id)
        
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404
        
        if not submission.assignment.is_organizer(user):
            return jsonify({'error': 'Only organizers can unfreeze submissions'}), 403
        
        collab_project = submission.collaborative_project
        
        if not collab_project.is_frozen():
            return jsonify({'error': 'Project is not frozen'}), 400
        
        # Unfreeze all permissions
        for perm in collab_project.permissions:
            perm.unfreeze()
        
        db.session.commit()
        
        current_app.logger.info(
            f"Project {collab_project.id} unfrozen by {user.username}"
        )
        
        return jsonify({
            'success': True,
            'message': 'Project unfrozen successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error unfreezing submission: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Failed to unfreeze submission', 'details': str(e)}), 500


@assignment_bp.route('/<int:assignment_id>/freeze-all', methods=['POST'])
@require_auth
def freeze_all_submissions(user_info, assignment_id):
    """Freeze all submissions for an assignment (only organizers)"""
    try:
        user = User.query.get(user_info['user_id'])
        assignment = Assignment.query.get(assignment_id)
        
        if not assignment or assignment.is_deleted:
            return jsonify({'error': 'Assignment not found'}), 404
        
        if not assignment.is_organizer(user):
            return jsonify({'error': 'Only organizers can freeze submissions'}), 403
        
        frozen_count = 0
        for submission in assignment.submissions:
            if not submission.collaborative_project.is_frozen():
                submission.collaborative_project.freeze_for_assignment(user.id, assignment_id)
                frozen_count += 1
        
        db.session.commit()
        
        current_app.logger.info(
            f"All submissions for assignment {assignment_id} frozen by {user.username}"
        )
        
        return jsonify({
            'success': True,
            'message': f'Froze {frozen_count} submissions',
            'frozen_count': frozen_count
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error freezing all submissions: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Failed to freeze submissions', 'details': str(e)}), 500


@assignment_bp.route('/<int:assignment_id>/unfreeze-all', methods=['POST'])
@require_auth
def unfreeze_all_submissions(user_info, assignment_id):
    """Unfreeze all submissions for an assignment (only organizers)"""
    try:
        user = User.query.get(user_info['user_id'])
        assignment = Assignment.query.get(assignment_id)
        
        if not assignment or assignment.is_deleted:
            return jsonify({'error': 'Assignment not found'}), 404
        
        if not assignment.is_organizer(user):
            return jsonify({'error': 'Only organizers can unfreeze submissions'}), 403
        
        unfrozen_count = 0
        for submission in assignment.submissions:
            if submission.collaborative_project.is_frozen():
                for perm in submission.collaborative_project.permissions:
                    perm.unfreeze()
                unfrozen_count += 1
        
        db.session.commit()
        
        current_app.logger.info(
            f"All submissions for assignment {assignment_id} unfrozen by {user.username}"
        )
        
        return jsonify({
            'success': True,
            'message': f'Unfroze {unfrozen_count} submissions',
            'unfrozen_count': unfrozen_count
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error unfreezing all submissions: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Failed to unfreeze submissions', 'details': str(e)}), 500


# ============================================================
# HELPER ENDPOINTS
# ============================================================

@assignment_bp.route('/<int:assignment_id>/available-users', methods=['GET'])
@require_auth
def get_available_users(user_info, assignment_id):
    """Get users available to assign (only organizers)"""
    try:
        user = User.query.get(user_info['user_id'])
        
        # For new assignments (assignment_id=0), return all students
        if assignment_id == 0:
            # Only teachers/admins can create assignments
            if user.role not in ['teacher', 'admin']:
                return jsonify({'error': 'Only teachers and admins can create assignments'}), 403
            assigned_user_ids = []
        else:
            assignment = Assignment.query.get(assignment_id)
            
            if not assignment or assignment.is_deleted:
                return jsonify({'error': 'Assignment not found'}), 404
            
            if not assignment.is_organizer(user):
                return jsonify({'error': 'Only organizers can view available users'}), 403
            
            # Get already assigned user IDs
            assigned_user_ids = [au.user_id for au in assignment.user_assignments]
        
        # Get all users except already assigned
        search = request.args.get('search', '')
        query = User.query.filter(
            User.role == 'student',
            ~User.id.in_(assigned_user_ids)
        )
        
        if search:
            query = query.filter(User.username.ilike(f'%{search}%'))
        
        available_users = query.limit(50).all()
        
        return jsonify({
            'success': True,
            'users': [{
                'id': u.id,
                'username': u.username,
                'email': u.email
            } for u in available_users]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting available users: {str(e)}")
        return jsonify({'error': 'Failed to get available users', 'details': str(e)}), 500


@assignment_bp.route('/<int:assignment_id>/available-groups', methods=['GET'])
@require_auth
def get_available_groups(user_info, assignment_id):
    """Get groups available to assign (only organizers)"""
    try:
        user = User.query.get(user_info['user_id'])
        
        # For new assignments (assignment_id=0), return all groups
        if assignment_id == 0:
            # Only teachers/admins can create assignments
            if user.role not in ['teacher', 'admin']:
                return jsonify({'error': 'Only teachers and admins can create assignments'}), 403
            assigned_group_ids = []
        else:
            assignment = Assignment.query.get(assignment_id)
            
            if not assignment or assignment.is_deleted:
                return jsonify({'error': 'Assignment not found'}), 404
            
            if not assignment.is_organizer(user):
                return jsonify({'error': 'Only organizers can view available groups'}), 403
            
            # Get already assigned group IDs
            assigned_group_ids = [ag.group_id for ag in assignment.group_assignments]
        
        # Get all groups except already assigned
        available_groups = Group.query.filter(
            ~Group.id.in_(assigned_group_ids)
        ).all()
        
        return jsonify({
            'success': True,
            'groups': [{
                'id': g.id,
                'name': g.name,
                'external_id': g.external_id,
                'member_count': len(g.members)
            } for g in available_groups]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting available groups: {str(e)}")
        return jsonify({'error': 'Failed to get available groups', 'details': str(e)}), 500


# ============================================================
# ORGANIZER MANAGEMENT
# ============================================================

@assignment_bp.route('/<int:assignment_id>/add-organizer', methods=['POST'])
@require_auth
def add_organizer(user_info, assignment_id):
    """Add an organizer to assignment (only existing organizers can do this)"""
    try:
        user = User.query.get(user_info['user_id'])
        assignment = Assignment.query.get(assignment_id)
        
        if not assignment or assignment.is_deleted:
            return jsonify({'error': 'Assignment not found'}), 404
        
        if not assignment.is_organizer(user):
            return jsonify({'error': 'Only organizers can add other organizers'}), 403
        
        data = request.get_json()
        organizer_id = data.get('user_id')
        
        if not organizer_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        # Convert to string since User.id is String type
        new_organizer = User.query.get(str(organizer_id))
        if not new_organizer:
            return jsonify({'error': 'User not found'}), 404
        
        if new_organizer.role not in ['teacher', 'admin']:
            return jsonify({'error': 'Only teachers and admins can be organizers'}), 400
        
        if new_organizer in assignment.organizers:
            return jsonify({'error': 'User is already an organizer'}), 400
        
        assignment.organizers.append(new_organizer)
        db.session.commit()
        
        current_app.logger.info(f"User {new_organizer.username} added as organizer to assignment {assignment.id}")
        
        return jsonify({
            'success': True,
            'assignment': assignment.to_dict(include_assignments=True)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error adding organizer: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to add organizer', 'details': str(e)}), 500


@assignment_bp.route('/<int:assignment_id>/remove-organizer/<organizer_id>', methods=['DELETE'])
@require_auth
def remove_organizer(user_info, assignment_id, organizer_id):
    """Remove an organizer from assignment (only organizers can do this, but not the last one)"""
    try:
        user = User.query.get(user_info['user_id'])
        assignment = Assignment.query.get(assignment_id)
        
        if not assignment or assignment.is_deleted:
            return jsonify({'error': 'Assignment not found'}), 404
        
        if not assignment.is_organizer(user):
            return jsonify({'error': 'Only organizers can remove other organizers'}), 403
        
        # Convert to string since User.id is String type
        organizer_to_remove = User.query.get(str(organizer_id))
        if not organizer_to_remove:
            return jsonify({'error': 'User not found'}), 404
        
        if organizer_to_remove not in assignment.organizers:
            return jsonify({'error': 'User is not an organizer'}), 400
        
        if len(assignment.organizers) <= 1:
            return jsonify({'error': 'Cannot remove the last organizer'}), 400
        
        assignment.organizers.remove(organizer_to_remove)
        db.session.commit()
        
        current_app.logger.info(f"User {organizer_to_remove.username} removed as organizer from assignment {assignment.id}")
        
        return jsonify({
            'success': True,
            'assignment': assignment.to_dict(include_assignments=True)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error removing organizer: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to remove organizer', 'details': str(e)}), 500


@assignment_bp.route('/<int:assignment_id>/available-organizers', methods=['GET'])
@require_auth
def get_available_organizers(user_info, assignment_id):
    """Get teachers/admins available to be added as organizers"""
    try:
        user = User.query.get(user_info['user_id'])
        assignment = Assignment.query.get(assignment_id)
        
        if not assignment or assignment.is_deleted:
            return jsonify({'error': 'Assignment not found'}), 404
        
        if not assignment.is_organizer(user):
            return jsonify({'error': 'Only organizers can view available organizers'}), 403
        
        # Get already assigned organizer IDs
        organizer_ids = [o.id for o in assignment.organizers]
        
        # Get all teachers/admins except already organizers
        available_users = User.query.filter(
            User.role.in_(['teacher', 'admin']),
            ~User.id.in_(organizer_ids)
        ).all()
        
        return jsonify({
            'success': True,
            'users': [{
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'role': u.role
            } for u in available_users]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting available organizers: {str(e)}")
        return jsonify({'error': 'Failed to get available organizers', 'details': str(e)}), 500


# ============================================================
# ASSIGNMENT MANAGEMENT (REMOVE USERS/GROUPS)
# ============================================================

@assignment_bp.route('/<int:assignment_id>/remove-user/<user_id>', methods=['DELETE'])
@require_auth
def remove_user_assignment(user_info, assignment_id, user_id):
    """Remove a user from assignment (only organizers can do this)"""
    try:
        user = User.query.get(user_info['user_id'])
        assignment = Assignment.query.get(assignment_id)
        
        if not assignment or assignment.is_deleted:
            return jsonify({'error': 'Assignment not found'}), 404
        
        if not assignment.is_organizer(user):
            return jsonify({'error': 'Only organizers can remove users'}), 403
        
        # Convert to string since User.id is String type
        assignment_user = AssignmentUser.query.filter_by(
            assignment_id=assignment_id,
            user_id=str(user_id)
        ).first()
        
        if not assignment_user:
            return jsonify({'error': 'User is not assigned to this assignment'}), 404
        
        db.session.delete(assignment_user)
        db.session.commit()
        
        current_app.logger.info(f"User {user_id} removed from assignment {assignment.id}")
        
        return jsonify({
            'success': True,
            'assignment': assignment.to_dict(include_assignments=True)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error removing user from assignment: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to remove user', 'details': str(e)}), 500


@assignment_bp.route('/<int:assignment_id>/remove-group/<int:group_id>', methods=['DELETE'])
@require_auth
def remove_group_assignment(user_info, assignment_id, group_id):
    """Remove a group from assignment (only organizers can do this)"""
    try:
        user = User.query.get(user_info['user_id'])
        assignment = Assignment.query.get(assignment_id)
        
        if not assignment or assignment.is_deleted:
            return jsonify({'error': 'Assignment not found'}), 404
        
        if not assignment.is_organizer(user):
            return jsonify({'error': 'Only organizers can remove groups'}), 403
        
        assignment_group = AssignmentGroup.query.filter_by(
            assignment_id=assignment_id,
            group_id=group_id
        ).first()
        
        if not assignment_group:
            return jsonify({'error': 'Group is not assigned to this assignment'}), 404
        
        db.session.delete(assignment_group)
        db.session.commit()
        
        current_app.logger.info(f"Group {group_id} removed from assignment {assignment.id}")
        
        return jsonify({
            'success': True,
            'assignment': assignment.to_dict(include_assignments=True)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error removing group from assignment: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to remove group', 'details': str(e)}), 500
