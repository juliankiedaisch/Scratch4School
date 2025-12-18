from flask import Blueprint, jsonify, request, current_app
from app.models.users import User
from app.models.projects import Project, Commit, WorkingCopy, CollaborativeProject
from app.middlewares.auth import require_auth, require_teacher
from app.utils.date_utils import to_iso_string
from app import db
import os

teacher_bp = Blueprint('teacher', __name__)


def _delete_project_files(project):
    """Helper to delete project files (SB3 and thumbnail)"""
    if not project:
        return
    
    if project.sb3_file_path and os.path.exists(project.sb3_file_path):
        try:
            os.remove(project.sb3_file_path)
            current_app.logger.debug(f"Deleted SB3 file: {project.sb3_file_path}")
        except OSError as e:
            current_app.logger.warning(f"Could not delete SB3 file: {e}")
    
    if project.thumbnail_path and os.path.exists(project.thumbnail_path):
        try:
            os.remove(project.thumbnail_path)
            current_app.logger.debug(f"Deleted thumbnail: {project.thumbnail_path}")
        except OSError as e:
            current_app.logger.warning(f"Could not delete thumbnail: {e}")

@teacher_bp.route('/students', methods=['GET'])
@require_auth
@require_teacher
def get_teacher_students(user_info):
    """Get all students assigned to the authenticated teacher"""
    try:
        teacher = User.query.get(user_info['user_id'])
        if not teacher:
            return jsonify({'error': 'Teacher not found'}), 404
        
        # Get students assigned to this teacher
        if user_info.get('role') == 'admin':
            students = User.query.all()
        else:
            students = User.query.filter(User.role.in_(["student", "user"])).all()

        # Format student data
        student_list = []
        for student in students:
            # ✅ Count both normal AND collaborative projects
            normal_projects = db.session.query(Project)\
                .outerjoin(Commit, Project.id == Commit.project_id)\
                .outerjoin(WorkingCopy, Project.id == WorkingCopy.project_id)\
                .filter(Project.owner_id == student.id)\
                .filter(Commit.id == None)\
                .filter(WorkingCopy.id == None)\
                .filter(Project.deleted_at == None)\
                .count()
            
            collab_projects = CollaborativeProject.query.filter_by(
                created_by=student.id,
                deleted_at=None
            ).count()
            
            student_list.append({
                'id': student.id,
                'username': student.username,
                'project_count': normal_projects + collab_projects
            })
        
        return jsonify({
            'students': student_list,
            'count': len(student_list)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching teacher's students: {str(e)}")
        return jsonify({'error': str(e)}), 500


@teacher_bp.route('/students/<student_id>/projects', methods=['GET'])
@require_auth
@require_teacher
def get_student_projects(user_info, student_id):
    """
    Get ALL projects for a specific student (normal + collaborative)
    ✅ Teachers see both active AND deleted projects
    ✅ Sorted by last edited time (last commit or working copy save)
    """
    try:
        student = User.query.get(student_id)
        
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Check if teacher has access (admin always has access)
        if user_info.get('role') not in ['admin', 'teacher']:
            return jsonify({'error': 'Access denied'}), 403
        
        include_deleted = request.args.get('include_deleted', 'true').lower() == 'true'
        
        # ============================================================
        # GET NORMAL PROJECTS (owned by student)
        # ============================================================
        
        normal_query = Project.query.filter_by(owner_id=student.id)
        
        # Exclude projects that are commits or working copies
        normal_query = normal_query.outerjoin(Commit, Project.id == Commit.project_id)
        normal_query = normal_query.outerjoin(WorkingCopy, Project.id == WorkingCopy.project_id)
        normal_query = normal_query.filter(Commit.id == None, WorkingCopy.id == None)
        
        if not include_deleted:
            normal_query = normal_query.filter(Project.deleted_at == None)
        
        normal_projects = normal_query.all()

        # ============================================================
        # GET COLLABORATIVE PROJECTS (owned by student)
        # ============================================================
        
        collab_query = CollaborativeProject.query.filter_by(created_by=student.id)
        
        if not include_deleted:
            collab_query = collab_query.filter(CollaborativeProject.deleted_at == None)
        
        collab_projects_owned = collab_query.all()
        
        # ============================================================
        # GET COLLABORATIVE PROJECTS (where student is a collaborator with WRITE access)
        # ============================================================
        
        from app.models.projects import CollaborativeProjectPermission, PermissionLevel
        
        collab_as_collaborator_query = db.session.query(CollaborativeProject).join(
            CollaborativeProjectPermission,
            CollaborativeProject.id == CollaborativeProjectPermission.collaborative_project_id
        ).filter(
            CollaborativeProjectPermission.user_id == student.id,
            CollaborativeProjectPermission.permission == PermissionLevel.WRITE,
            CollaborativeProject.created_by != student.id  # Don't duplicate owned projects
        )
        
        if not include_deleted:
            collab_as_collaborator_query = collab_as_collaborator_query.filter(
                CollaborativeProject.deleted_at == None
            )
        
        collab_projects_collaborator = collab_as_collaborator_query.all()
        
        # ============================================================
        # FORMAT RESPONSE
        # ============================================================
        
        projects_data = []
        
        # Add normal projects
        for project in normal_projects:
            project_dict = project.to_dict()
            project_dict['project_type'] = 'normal'
            project_dict['is_deleted'] = project.is_deleted
            project_dict['deleted_at'] = to_iso_string(project.deleted_at) if project.deleted_at else None
            project_dict['deleted_by'] = project.deleted_by
            project_dict['last_edited_at'] = to_iso_string(project.updated_at)
            project_dict['is_collaborator'] = False  # Student is owner
            projects_data.append(project_dict)
        
        # Add collaborative projects (owned by student)
        for collab in collab_projects_owned:
            collab_dict = collab.to_dict(include_commits=False)
            collab_dict['project_type'] = 'collaborative'
            collab_dict['is_deleted'] = collab.is_deleted
            collab_dict['deleted_at'] = to_iso_string(collab.deleted_at) if collab.deleted_at else None
            collab_dict['deleted_by'] = collab.deleted_by
            collab_dict['is_collaborator'] = False  # Student is owner
            
            # Count users with write/admin access
            all_users_with_access = collab.get_all_users_with_access()
            write_admin_count = sum(1 for user_data in all_users_with_access 
                                   if user_data['permission'] in [PermissionLevel.WRITE, PermissionLevel.ADMIN])
            collab_dict['write_admin_count'] = write_admin_count
            
            # Add commit count
            collab_dict['commit_count'] = len(collab.commits)
            
            # Calculate last_edited_at from latest commit or any working copy
            last_edited_at = collab.created_at  # Default to creation time
            
            # Check latest commit time
            if collab.latest_commit_id:
                latest_commit = Commit.query.filter_by(
                    collaborative_project_id=collab.id
                ).order_by(Commit.committed_at.desc()).first()
                
                if latest_commit:
                    last_edited_at = max(last_edited_at, latest_commit.committed_at)
                    latest_commit_project = Project.query.get(collab.latest_commit_id)
                    if latest_commit_project:
                        collab_dict['thumbnail_url'] = latest_commit_project.thumbnail_url
            
            # Check all working copies times (not just student's)
            working_copies = WorkingCopy.query.filter_by(
                collaborative_project_id=collab.id
            ).all()
            
            for wc in working_copies:
                last_edited_at = max(last_edited_at, wc.updated_at)
            
            collab_dict['last_edited_at'] = to_iso_string(last_edited_at)
            
            projects_data.append(collab_dict)
        
        # Add collaborative projects (where student is a collaborator)
        for collab in collab_projects_collaborator:
            collab_dict = collab.to_dict(include_commits=False)
            collab_dict['project_type'] = 'collaborative'
            collab_dict['is_deleted'] = collab.is_deleted
            collab_dict['deleted_at'] = to_iso_string(collab.deleted_at) if collab.deleted_at else None
            collab_dict['deleted_by'] = collab.deleted_by
            collab_dict['is_collaborator'] = True  # Student is collaborator, not owner
            
            # Get the owner's username for display
            owner = User.query.get(collab.created_by)
            if owner:
                collab_dict['owner_username'] = owner.username
            
            # Count users with write/admin access
            all_users_with_access = collab.get_all_users_with_access()
            write_admin_count = sum(1 for user_data in all_users_with_access 
                                   if user_data['permission'] in [PermissionLevel.WRITE, PermissionLevel.ADMIN])
            collab_dict['write_admin_count'] = write_admin_count
            
            # Add commit count
            collab_dict['commit_count'] = len(collab.commits)
            
            # Calculate last_edited_at from latest commit or any working copy
            last_edited_at = collab.created_at  # Default to creation time
            
            # Check latest commit time
            if collab.latest_commit_id:
                latest_commit = Commit.query.filter_by(
                    collaborative_project_id=collab.id
                ).order_by(Commit.committed_at.desc()).first()
                
                if latest_commit:
                    last_edited_at = max(last_edited_at, latest_commit.committed_at)
                    latest_commit_project = Project.query.get(collab.latest_commit_id)
                    if latest_commit_project:
                        collab_dict['thumbnail_url'] = latest_commit_project.thumbnail_url
            
            # Check all working copies times (not just student's)
            working_copies = WorkingCopy.query.filter_by(
                collaborative_project_id=collab.id
            ).all()
            
            for wc in working_copies:
                last_edited_at = max(last_edited_at, wc.updated_at)
            
            collab_dict['last_edited_at'] = to_iso_string(last_edited_at)
            
            projects_data.append(collab_dict)
        
        # Sort projects by last_edited_at (newest first)
        projects_data.sort(
            key=lambda p: p.get('last_edited_at') or p.get('updated_at') or p.get('created_at'),
            reverse=True
        )
        
        return jsonify({
            'projects': projects_data,
            'student': {
                'id': student.id,
                'username': student.username
            },
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting student projects: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@teacher_bp.route('/students/<student_id>/projects/<int:project_id>/restore', methods=['POST'])
@require_auth
@require_teacher
def restore_student_project(user_info, student_id, project_id):
    """
    Restore a deleted project (normal or collaborative)
    Accepts optional 'project_type' in request body to disambiguate
    """
    try:
        student = User.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Get project_type from request body if provided
        data = request.get_json() or {}
        project_type = data.get('project_type')
        
        # If project_type is specified, query the appropriate table directly
        if project_type == 'collaborative':
            collab_project = CollaborativeProject.query.get(project_id)
            
            if not collab_project:
                return jsonify({'error': 'Collaborative project not found'}), 404
            
            if collab_project.created_by != student.id:
                return jsonify({'error': 'Project does not belong to this student'}), 403
            
            if not collab_project.is_deleted:
                return jsonify({'error': 'Project is not deleted'}), 400
            
            # Restore collaborative project
            collab_project.restore()
            
            # Restore all commits
            commits = Commit.query.filter_by(collaborative_project_id=collab_project.id).all()
            for commit in commits:
                commit_project = Project.query.get(commit.project_id)
                if commit_project and commit_project.is_deleted:
                    commit_project.restore()
            
            # Restore all working copies
            working_copies = WorkingCopy.query.filter_by(
                collaborative_project_id=collab_project.id
            ).all()
            for wc in working_copies:
                wc_project = Project.query.get(wc.project_id)
                if wc_project and wc_project.is_deleted:
                    wc_project.restore()
            
            db.session.commit()
            
            return jsonify({
                'message': 'Collaborative project restored successfully',
                'project_type': 'collaborative',
                'restored_commits': len(commits),
                'restored_working_copies': len(working_copies),
                'success': True
            }), 200
        
        elif project_type == 'normal':
            project = Project.query.get(project_id)
            
            if not project:
                return jsonify({'error': 'Project not found'}), 404
            
            if project.owner_id != student.id:
                return jsonify({'error': 'Project does not belong to this student'}), 403
            
            if not project.is_deleted:
                return jsonify({'error': 'Project is not deleted'}), 400
            
            project.restore()
            db.session.commit()
            
            return jsonify({
                'message': 'Project restored successfully',
                'project_type': 'normal',
                'success': True
            }), 200
        
        # Fallback: Try to find the project (check collaborative first to avoid ID collision)
        # Check collaborative project first
        collab_project = CollaborativeProject.query.get(project_id)
        
        if collab_project:
            if collab_project.created_by != student.id:
                return jsonify({'error': 'Project does not belong to this student'}), 403
            
            if not collab_project.is_deleted:
                return jsonify({'error': 'Project is not deleted'}), 400
            
            # Restore collaborative project
            collab_project.restore()
            
            # Restore all commits
            commits = Commit.query.filter_by(collaborative_project_id=collab_project.id).all()
            for commit in commits:
                commit_project = Project.query.get(commit.project_id)
                if commit_project and commit_project.is_deleted:
                    commit_project.restore()
            
            # Restore all working copies
            working_copies = WorkingCopy.query.filter_by(
                collaborative_project_id=collab_project.id
            ).all()
            for wc in working_copies:
                wc_project = Project.query.get(wc.project_id)
                if wc_project and wc_project.is_deleted:
                    wc_project.restore()
            
            db.session.commit()
            
            return jsonify({
                'message': 'Collaborative project restored successfully',
                'project_type': 'collaborative',
                'restored_commits': len(commits),
                'restored_working_copies': len(working_copies),
                'success': True
            }), 200
        
        # Try normal project
        project = Project.query.get(project_id)
        
        if project:
            # Normal project
            if project.owner_id != student.id:
                return jsonify({'error': 'Project does not belong to this student'}), 403
            
            if not project.is_deleted:
                return jsonify({'error': 'Project is not deleted'}), 400
            
            project.restore()
            db.session.commit()
            
            return jsonify({
                'message': 'Project restored successfully',
                'project_type': 'normal',
                'success': True
            }), 200
        
        return jsonify({'error': 'Project not found'}), 404
        
    except Exception as e:
        current_app.logger.error(f"Error restoring project: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@teacher_bp.route('/students/<student_id>/projects/<int:project_id>/permanent', methods=['DELETE'])
@require_auth
@require_teacher
def permanently_delete_student_project(user_info, student_id, project_id):
    """
    Permanently delete a project (normal or collaborative)
    Must be in trash first
    Accepts optional 'project_type' in request body to disambiguate
    """
    try:
        student = User.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Get project_type from request body if provided
        data = request.get_json() or {}
        project_type = data.get('project_type')
        
        # If project_type is specified, query the appropriate table directly
        if project_type == 'collaborative':
            collab_project = CollaborativeProject.query.get(project_id)
            
            if not collab_project:
                return jsonify({'error': 'Collaborative project not found'}), 404
            
            if collab_project.created_by != student.id:
                return jsonify({'error': 'Project does not belong to this student'}), 403
            
            if not collab_project.is_deleted:
                return jsonify({'error': 'Project must be in trash first'}), 400
            
            # Clear latest_commit_id
            collab_project.latest_commit_id = None
            db.session.flush()
            
            # Delete all working copies
            working_copies = WorkingCopy.query.filter_by(
                collaborative_project_id=collab_project.id
            ).all()
            
            for wc in working_copies:
                db.session.delete(wc)
            
            db.session.flush()
            
            for wc in working_copies:
                wc_project = Project.query.get(wc.project_id)
                if wc_project:
                    _delete_project_files(wc_project)
                    db.session.delete(wc_project)
            
            db.session.flush()
            
            # Delete all commits
            commits = Commit.query.filter_by(collaborative_project_id=collab_project.id).all()
            
            for commit in commits:
                db.session.delete(commit)
            
            db.session.flush()
            
            for commit in commits:
                commit_project = Project.query.get(commit.project_id)
                if commit_project:
                    _delete_project_files(commit_project)
                    db.session.delete(commit_project)
            
            db.session.flush()
            
            # Delete permission entries (handled by cascade='all, delete-orphan')
            # No need to manually delete permissions as they will be deleted automatically
            
            db.session.flush()
            
            # Delete collaborative project
            db.session.delete(collab_project)
            db.session.commit()
            
            return jsonify({
                'message': 'Collaborative project permanently deleted',
                'project_type': 'collaborative',
                'success': True
            }), 200
        
        elif project_type == 'normal':
            project = Project.query.get(project_id)
            
            if not project:
                return jsonify({'error': 'Project not found'}), 404
            
            if project.owner_id != student.id:
                return jsonify({'error': 'Project does not belong to this student'}), 403
            
            if not project.is_deleted:
                return jsonify({'error': 'Project must be in trash first'}), 400
            
            # Delete files
            _delete_project_files(project)
            
            db.session.delete(project)
            db.session.commit()
            
            return jsonify({
                'message': 'Project permanently deleted',
                'project_type': 'normal',
                'success': True
            }), 200
        
        # Fallback: Try to find the project (check collaborative first to avoid ID collision)
        # Check collaborative project first
        collab_project = CollaborativeProject.query.get(project_id)
        
        if collab_project:
            if collab_project.created_by != student.id:
                return jsonify({'error': 'Project does not belong to this student'}), 403
            
            if not collab_project.is_deleted:
                return jsonify({'error': 'Project must be in trash first'}), 400
            
            # Clear latest_commit_id
            collab_project.latest_commit_id = None
            db.session.flush()
            
            # Delete all working copies
            working_copies = WorkingCopy.query.filter_by(
                collaborative_project_id=collab_project.id
            ).all()
            
            for wc in working_copies:
                db.session.delete(wc)
            
            db.session.flush()
            
            for wc in working_copies:
                wc_project = Project.query.get(wc.project_id)
                if wc_project:
                    _delete_project_files(wc_project)
                    db.session.delete(wc_project)
            
            db.session.flush()
            
            # Delete all commits
            commits = Commit.query.filter_by(collaborative_project_id=collab_project.id).all()
            
            for commit in commits:
                db.session.delete(commit)
            
            db.session.flush()
            
            for commit in commits:
                commit_project = Project.query.get(commit.project_id)
                if commit_project:
                    _delete_project_files(commit_project)
                    db.session.delete(commit_project)
            
            db.session.flush()
            
            # Delete permission entries (handled by cascade='all, delete-orphan')
            # No need to manually delete permissions as they will be deleted automatically
            
            db.session.flush()
            
            # Delete collaborative project
            db.session.delete(collab_project)
            db.session.commit()
            
            return jsonify({
                'message': 'Collaborative project permanently deleted',
                'project_type': 'collaborative',
                'success': True
            }), 200
        
        # Try normal project
        project = Project.query.get(project_id)
        
        if project:
            # Normal project
            if project.owner_id != student.id:
                return jsonify({'error': 'Project does not belong to this student'}), 403
            
            if not project.is_deleted:
                return jsonify({'error': 'Project must be in trash first'}), 400
            
            # Delete files
            _delete_project_files(project)
            
            db.session.delete(project)
            db.session.commit()
            
            return jsonify({
                'message': 'Project permanently deleted',
                'project_type': 'normal',
                'success': True
            }), 200
        
        return jsonify({'error': 'Project not found'}), 404
        
    except Exception as e:
        current_app.logger.error(f"Error permanently deleting project: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': str(e)}), 500