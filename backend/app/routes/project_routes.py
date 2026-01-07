from app.models.projects import (
    Project, 
    CollaborativeProject, 
    Commit, 
    WorkingCopy,
    CollaborativeProjectPermission,
    PermissionLevel
)
from app.models.assignments import AssignmentSubmission
from app.models.groups import Group
from app.models.users import User
from app.middlewares.auth import require_auth
from app.middlewares.auth import check_auth
from app.utils.date_utils import to_iso_string
from datetime import datetime, timezone
from app import db
from flask import Blueprint, request, current_app, jsonify, send_file, g
import os, shutil
from werkzeug.utils import secure_filename

projects_bp = Blueprint('projects', __name__)

# ============================================================
# BASIC PROJECT ENDPOINTS
# ============================================================

@projects_bp.route('/can-save', methods=['GET'])
@check_auth
def can_save():
    """Check if the user is authenticated and can save projects"""
    return jsonify({
        'canSave': g.user_authenticated,
        'userId': request.user.id if g.user_authenticated else None,
        'username': request.user.username if g.user_authenticated else None
    })


@projects_bp.route('', methods=['POST'])
@require_auth
def create_project(user_info):
    """
    Create a new project
    ✅ Automatically creates CollaborativeProject with initial commit
    ✅ Owner gets ADMIN permission automatically
    """
    try:
        data = request.form
        
        name = data.get('name', 'Untitled Project')
        description = data.get('description', '')
        
        if 'project_file' not in request.files:
            return jsonify({'error': 'No project file provided'}), 400
        
        project_file = request.files['project_file']
        thumbnail_file = request.files.get('thumbnail')
        
        # ============================================================
        # CREATE COLLABORATIVE PROJECT
        # ============================================================
        
        collab_project = CollaborativeProject(
            name=name,
            description=description,
            created_by=user_info['user_id']
        )
        db.session.add(collab_project)
        db.session.flush()
        
        # ============================================================
        # CREATE FIRST COMMIT
        # ============================================================
        
        initial_project = Project(
            name=f"{name} - Commit 1",
            description="Projekt erstellt",
            owner_id=user_info['user_id']
        )
        db.session.add(initial_project)
        db.session.flush()
        
        # Save files
        upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'projects')
        os.makedirs(upload_folder, exist_ok=True)
        
        filename = secure_filename(f"{initial_project.id}_{user_info['user_id']}.sb3")
        file_path = os.path.join(upload_folder, filename)
        project_file.save(file_path)
        initial_project.sb3_file_path = file_path
        
        if thumbnail_file:
            thumbnail_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'thumbnails')
            os.makedirs(thumbnail_folder, exist_ok=True)
            thumbnail_filename = secure_filename(f"thumb_{initial_project.id}.png")
            thumbnail_path = os.path.join(thumbnail_folder, thumbnail_filename)
            thumbnail_file.save(thumbnail_path)
            initial_project.thumbnail_path = thumbnail_path
        
        # Create initial commit
        commit = Commit(
            project_id=initial_project.id,
            collaborative_project_id=collab_project.id,
            commit_number=1,
            commit_message="Projekt erstellt",
            committed_by=user_info['user_id']
        )
        db.session.add(commit)
        
        # Set latest commit
        collab_project.latest_commit_id = initial_project.id
        
        db.session.commit()
        
        current_app.logger.info(
            f"New project created: CollaborativeProject {collab_project.id} by user {user_info['user_id']}. Initial commit {initial_project.id} created."
        )
        
        return jsonify({
            'id': initial_project.id,  # Return project ID for frontend compatibility
            'collaborative_project': collab_project.to_dict(),
            'initial_commit': commit.to_dict(),
            'success': True
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error creating project: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@projects_bp.route('/<int:project_id>', methods=['PUT'])
@require_auth
def update_project(user_info, project_id):
    """
    Update/save a project
    ✅ Uses permission system
    ✅ Handles both working copies and commits
    
    If project_id is a working copy: save directly
    If project_id is a commit: create new working copy and save to it
    """
    try:
        title = request.args.get('title')
        user = User.query.get(user_info.get('user_id'))
        
        project = Project.query.filter_by(id=project_id).with_for_update().first()
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        # ============================================================
        # DETERMINE PROJECT TYPE AND COLLABORATIVE PROJECT
        # ============================================================
        
        collab_project = None
        wc = None  # Initialize working copy variable

        # Check if this is a working copy
        if project.is_working_copy:
            wc = project.working_copy_info
            
            # Check if user owns this working copy
            if wc.user_id != user.id:
                return jsonify({'error': 'You can only update your own working copies'}), 403
            
            collab_project = wc.collaborative_project
            
        # Check if this is a commit
        elif project.is_commit:
            commit = project.commit_info
            collab_project = commit.collaborative_project
            
            # Check if user has write permission on the collaborative project
            if not collab_project.has_permission(user, PermissionLevel.WRITE):
                return jsonify({'error': 'You need write permission to save this project'}), 403
            
            # ============================================================
            # CREATE NEW WORKING COPY FROM COMMIT
            # ============================================================
            
            current_app.logger.info(
                f"User {user.id} attempting to save commit {project_id}, creating working copy"
            )
            
            # Check if user already has a working copy for this collaborative project
            existing_wc = user.get_working_copy(collab_project.id)
            
            if existing_wc:
                # User already has a working copy, use it instead
                project = Project.query.get(existing_wc.project_id)
                wc = existing_wc
                current_app.logger.info(
                    f"User already has working copy {project.id} for collab project {collab_project.id}"
                )
            else:
                # Create new working copy from the commit
                new_wc_project = Project(
                    name=f"{collab_project.name} - Working Copy",
                    description="Working copy",
                    owner_id=user.id
                )
                db.session.add(new_wc_project)
                db.session.flush()
                
                # Copy files from commit to new working copy
                upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'projects')
                os.makedirs(upload_folder, exist_ok=True)
                
                if project.sb3_file_path and os.path.exists(project.sb3_file_path):
                    filename = secure_filename(f"{new_wc_project.id}_{user.id}.sb3")
                    file_path = os.path.join(upload_folder, filename)
                    shutil.copy2(project.sb3_file_path, file_path)
                    new_wc_project.sb3_file_path = file_path
                
                if project.thumbnail_path and os.path.exists(project.thumbnail_path):
                    thumbnail_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'thumbnails')
                    os.makedirs(thumbnail_folder, exist_ok=True)
                    thumbnail_filename = secure_filename(f"thumb_{new_wc_project.id}.png")
                    thumbnail_path = os.path.join(thumbnail_folder, thumbnail_filename)
                    shutil.copy2(project.thumbnail_path, thumbnail_path)
                    new_wc_project.thumbnail_path = thumbnail_path
                
                # Create WorkingCopy entry
                wc = WorkingCopy(
                    project_id=new_wc_project.id,
                    collaborative_project_id=collab_project.id,
                    user_id=user.id,
                    based_on_commit_id=project_id,
                    has_changes=False
                )
                db.session.add(wc)
                db.session.flush()
                
                # Switch to the new working copy project for saving
                project = new_wc_project
                
                current_app.logger.info(
                    f"Created new working copy {project.id} from commit {project_id}"
                )
        
        else:
            # Not a working copy or commit - this shouldn't happen
            return jsonify({'error': 'Project is neither a working copy nor a commit'}), 400
        
        # Verify user has write permission on the collaborative project
        if not collab_project.has_permission(user, PermissionLevel.WRITE):
            return jsonify({'error': 'You need write permission to update this project'}), 403
        
        if 'project_file' not in request.files:
            return jsonify({'error': 'No project file provided'}), 400
        
        project_file = request.files['project_file']
        if project_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save file (overwrite)
        upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'projects')
        os.makedirs(upload_folder, exist_ok=True)
        
        # Delete old file
        if project.sb3_file_path and os.path.exists(project.sb3_file_path):
            try:
                os.remove(project.sb3_file_path)
            except OSError:
                pass
        
        # Save new file
        filename = secure_filename(f"{project.id}_{user_info.get('user_id')}.sb3")
        file_path = os.path.join(upload_folder, filename)
        project_file.save(file_path)
        project.sb3_file_path = file_path
        
        # Update title if provided
        if title:
            project.name = title
        
        # Handle thumbnail
        if 'thumbnail' in request.files:
            thumbnail_file = request.files['thumbnail']
            if thumbnail_file.filename != '':
                thumbnail_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'thumbnails')
                os.makedirs(thumbnail_folder, exist_ok=True)
                
                if project.thumbnail_path and os.path.exists(project.thumbnail_path):
                    try:
                        os.remove(project.thumbnail_path)
                    except OSError:
                        pass
                
                thumbnail_filename = secure_filename(f"thumb_{user_info.get('user_id')}_{project.id}.png")
                thumbnail_path = os.path.join(thumbnail_folder, thumbnail_filename)
                thumbnail_file.save(thumbnail_path)
                project.thumbnail_path = thumbnail_path
        
        project.updated_at = datetime.now(timezone.utc)
        wc.updated_at = datetime.now(timezone.utc)
        wc.has_changes = True
        
        db.session.commit()
        
        current_app.logger.info(f"Working copy {project.id} updated by {user.username}")
        
        return jsonify({
            'id': project.id,
            'title': project.name,
            'description': project.description,
            'created_at': to_iso_string(project.created_at),
            'updated_at': to_iso_string(project.updated_at),
            'is_working_copy': True,
            'has_changes': True,
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error updating project: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@projects_bp.route('/<int:project_id>/metadata', methods=['GET'])
@require_auth
def get_project_metadata(user_info, project_id):
    """
    Get project metadata
    ✅ Uses permission system
    """
    try:
        user = User.query.get(user_info['user_id'])
        project = Project.query.get(project_id)
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        has_access = False
        access_reason = None
        permission_level = None
        collaborative_project = None
        
        # Get collaborative project
        if project.is_commit and project.commit_info:
            collaborative_project = project.commit_info.collaborative_project
        elif project.is_working_copy and project.working_copy_info:
            collaborative_project = project.working_copy_info.collaborative_project
        
        if not collaborative_project:
            return jsonify({'error': 'Project has no collaborative project'}), 404
        
        # Check permission
        permission_level = collaborative_project.get_user_permission(user)
        
        if permission_level:
            has_access = True
            
            # Determine access reason
            if collaborative_project.created_by == user.id:
                access_reason = 'owner'
            else:
                access_via = user._get_access_via(collaborative_project)
                if access_via == 'direct':
                    access_reason = 'direct_permission'
                elif access_via and access_via.startswith('group:'):
                    access_reason = 'group_permission'
        
        # Working copy owner check
        if project.is_working_copy:
            wc = project.working_copy_info
            if wc.user_id != user.id:
                # Can't access other people's working copies
                has_access = False
                access_reason = None
            else:
                access_reason = 'working_copy_owner'
        
        if not has_access and user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Access denied'}), 403
        
        # Build response
        # Note: title comes from CollaborativeProject, not Project (Project.name is deprecated)
        response = {
            'id': project.id,
            'title': collaborative_project.name,
            'description': collaborative_project.description,
            'owner': {
                'id': project.owner.id,
                'username': project.owner.username
            },
            'is_collaborative': True,
            'is_commit': project.is_commit,
            'is_working_copy': project.is_working_copy,
            'access_reason': access_reason,
            'permission_level': permission_level.value if permission_level else None,
            'can_edit': permission_level in [PermissionLevel.ADMIN, PermissionLevel.WRITE] and project.is_working_copy,
            'is_read_only': permission_level == PermissionLevel.READ or project.is_commit,
            'collaborative_project': {
                'id': collaborative_project.id,
                'name': collaborative_project.name,
                'description': collaborative_project.description,
                'created_by': collaborative_project.creator.username if collaborative_project.creator else None,
                'latest_commit_id': collaborative_project.latest_commit_id
            },
            'success': True
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting metadata: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@projects_bp.route('/plain_project', methods=['GET'])
def download_plain_project():
    """
    Download a plain new project SB3 file
    Public endpoint
    """
    try:
        filename = "newProject.sb3"
        file_path = os.path.join(current_app.config['ASSET_FOLDER'], filename)
        
        return send_file(
            file_path,
            mimetype='application/octet-stream',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        current_app.logger.error(f"Error downloading plain project: {str(e)}")
        return jsonify({'error': str(e)}), 500


@projects_bp.route('/<project_id>/download', methods=['GET'])
@require_auth
def download_project(user_info, project_id):
    """
    Download a project SB3 file
    ✅ Uses permission system
    """
    try:

        if project_id == "0" or project_id == 0:
            filename = "newProject.sb3"
            file_path = os.path.join(current_app.config['ASSET_FOLDER'], filename)
            
            return send_file(
                file_path,
                mimetype='application/octet-stream',
                as_attachment=True,
                download_name=filename
            )

        user = User.query.get(user_info.get('user_id'))
        project = Project.query.get(project_id)
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        collaborative_project = None
        
        if project.is_commit and project.commit_info:
            collaborative_project = project.commit_info.collaborative_project
        elif project.is_working_copy and project.working_copy_info:
            collaborative_project = project.working_copy_info.collaborative_project
        
        if not collaborative_project:
            return jsonify({'error': 'Project has no collaborative project'}), 404
        
        # Check if project is frozen (unless user is admin/teacher)
        if user.role not in ['admin', 'teacher'] and collaborative_project.is_frozen():
            # Check if user's permission is frozen
            user_permission = collaborative_project.get_user_permission_object(user)
            if user_permission and user_permission.is_frozen:
                return jsonify({'error': 'This project has been frozen and cannot be accessed'}), 403
        
        # Check permission
        has_access = False
        
        # Check permission level (any level allows download)
        if collaborative_project.get_user_permission(user) and user.role not in ['admin', 'teacher']:
            has_access = True
            
            # Additional check for working copies
            if project.is_working_copy:
                wc = project.working_copy_info
                if wc.user_id != user.id:
                    has_access = False
                    current_app.logger.warning(
                        f"User {user.id} tried to download working copy {project_id} "
                        f"owned by user {wc.user_id}"
                    )
        
        if not has_access and user.role not in ['admin', 'teacher']:
            current_app.logger.warning(
                f"Download access denied for user {user.id} to project {project_id}"
            )
            return jsonify({'error': 'Access denied'}), 403
        
        # Send file
        if project.sb3_file_path and os.path.exists(project.sb3_file_path):
            filename = f"{project.name.replace(' ', '_')}.sb3"
            
            return send_file(
                project.sb3_file_path,
                mimetype='application/octet-stream',
                as_attachment=True,
                download_name=filename
            )
        else:
            return jsonify({'error': 'No project data available'}), 404
        
    except Exception as e:
        current_app.logger.error(f"Error downloading project: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@projects_bp.route('/<project_id>/thumbnail', methods=['GET'])
def get_project_thumbnail(project_id):
    """Get project thumbnail (public)"""
    try:
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        if project.thumbnail_path and os.path.exists(project.thumbnail_path):
            return send_file(project.thumbnail_path, mimetype='image/png')
        
        # Return default thumbnail
        thumbnail_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'thumbnails')
        default_thumbnail = os.path.join(thumbnail_folder, 'default.png')
        if os.path.exists(default_thumbnail):
            return send_file(default_thumbnail, mimetype='image/png')
        
        return jsonify({'error': 'Thumbnail not found'}), 404
        
    except Exception as e:
        current_app.logger.error(f"Error getting thumbnail: {str(e)}")
        return jsonify({'error': str(e)}), 500


@projects_bp.route('/all-with-collaborative', methods=['GET'])
@require_auth
def get_all_user_projects(user_info):
    """
    Get ALL user-accessible collaborative projects
    ✅ Uses permission system
    """
    try:
        user = User.query.get(user_info['user_id'])
        
        # Get all accessible projects via permission system
        accessible_projects = user.get_all_collaborative_projects()
        
        projects_list = []
        
        for proj in accessible_projects:
            # Get permission level
            permission = proj.get_user_permission(user)
            
            project_data = {
                'id': proj.id,
                'name': proj.name,
                'description': proj.description,
                'created_by': proj.created_by,
                'creator_username': proj.creator.username if proj.creator else None,
                'created_at': to_iso_string(proj.created_at),
                'updated_at': to_iso_string(proj.updated_at),
                'latest_commit_id': proj.latest_commit_id,
                'is_collaborative': True,
                'permission': permission.value if permission else None,
                'access_via': user._get_access_via(proj)
            }
            
            # Check for working copy
            wc = user.get_working_copy(proj.id)
            project_data['has_working_copy'] = wc is not None
            if wc:
                project_data['working_copy_id'] = wc.project_id
                project_data['working_copy_has_changes'] = wc.has_changes
            
            # Get thumbnail from latest commit
            if proj.latest_commit_id:
                latest_commit_project = Project.query.get(proj.latest_commit_id)
                if latest_commit_project:
                    project_data['thumbnail_url'] = latest_commit_project.thumbnail_url
            
            # Get permissions (for display)
            all_users_with_access = proj.get_all_users_with_access()
            project_data['collaborator_count'] = len(all_users_with_access)
            
            projects_list.append(project_data)
        
        current_app.logger.info(
            f"Loaded {len(projects_list)} projects for user {user.username}"
        )
        
        return jsonify({
            'projects': projects_list,
            'count': len(projects_list),
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting all projects: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@projects_bp.route('/owned', methods=['GET'])
@require_auth
def get_owned_projects(user_info):
    """
    Get projects owned by user (owner)
    ✅ Uses permission system
    ✅ Sorted by last edited time (last commit or working copy save)
    """
    try:
        user = User.query.get(user_info.get('user_id'))
        
        all_projects = user.get_all_collaborative_projects()
        
        owned_projects = []
        
        for proj in all_projects:
            # Only include if user is owner
            if proj.created_by == user.id:
                permission = proj.get_user_permission(user)
                
                project_data = {
                    'id': proj.id,
                    'name': proj.name,
                    'description': proj.description,
                    'created_by': proj.created_by,
                    'creator_username': proj.creator.username if proj.creator else None,
                    'created_at': to_iso_string(proj.created_at),
                    'updated_at': to_iso_string(proj.updated_at),
                    'latest_commit_id': proj.latest_commit_id,
                    'is_collaborative': True,
                    'permission': permission.value if permission else None,
                    'access_via': 'owner'
                }
                
                # Calculate last_edited_at from latest commit or working copy
                last_edited_at = proj.created_at  # Default to creation time
                
                # Check latest commit time
                if proj.latest_commit_id:
                    latest_commit = Commit.query.filter_by(
                        collaborative_project_id=proj.id
                    ).order_by(Commit.committed_at.desc()).first()
                    
                    if latest_commit:
                        last_edited_at = max(last_edited_at, latest_commit.committed_at)
                        latest_commit_project = Project.query.get(proj.latest_commit_id)
                        if latest_commit_project:
                            project_data['thumbnail_url'] = latest_commit_project.thumbnail_url
                
                # Check working copy time
                wc = user.get_working_copy(proj.id)
                project_data['has_working_copy'] = wc is not None
                if wc:
                    project_data['working_copy_id'] = wc.project_id
                    project_data['working_copy_has_changes'] = wc.has_changes
                    last_edited_at = max(last_edited_at, wc.updated_at)
                
                project_data['last_edited_at'] = to_iso_string(last_edited_at)
                
                # Get permissions (for display)
                all_users_with_access = proj.get_all_users_with_access()
                project_data['collaborator_count'] = len(all_users_with_access)
                
                # Check if project is frozen
                project_data['is_frozen'] = proj.is_frozen()
                
                # Get assignment submissions for this project
                submissions = AssignmentSubmission.query.filter_by(
                    collaborative_project_id=proj.id,
                    user_id=user.id
                ).all()
                project_data['assignment_submissions'] = [{
                    'id': sub.id,
                    'assignment_id': sub.assignment_id,
                    'assignment_name': sub.assignment.name,
                    'submitted_at': to_iso_string(sub.submitted_at),
                    'organizers': [{
                        'id': org.id,
                        'username': org.username
                    } for org in sub.assignment.organizers]
                } for sub in submissions]
                
                owned_projects.append(project_data)
        
        # Sort by last_edited_at descending (most recent first)
        owned_projects.sort(key=lambda p: p['last_edited_at'], reverse=True)
        
        return jsonify({
            'projects': owned_projects,
            'count': len(owned_projects),
            'success': True
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error retrieving owned projects: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@projects_bp.route('/collaboration', methods=['GET'])
@require_auth
def get_collaboration_projects(user_info):
    """
    Get projects where user has write or admin permission but is NOT owner
    ✅ Uses permission system
    ✅ Sorted by last edited time (last commit or working copy save)
    """
    try:
        user = User.query.get(user_info.get('user_id'))
        
        all_projects = user.get_all_collaborative_projects()
        
        collaboration_projects = []
        
        for proj in all_projects:
            # Only include if:
            # 1. User is not owner
            # 2. User has write or admin permission
            if proj.created_by != user.id:
                permission = proj.get_user_permission(user)
                
                if permission and permission in [PermissionLevel.WRITE, PermissionLevel.ADMIN]:
                    access_via = user._get_access_via(proj)
                    
                    project_data = {
                        'id': proj.id,
                        'name': proj.name,
                        'description': proj.description,
                        'created_by': proj.created_by,
                        'creator_username': proj.creator.username if proj.creator else None,
                        'created_at': to_iso_string(proj.created_at),
                        'updated_at': to_iso_string(proj.updated_at),
                        'latest_commit_id': proj.latest_commit_id,
                        'is_collaborative': True,
                        'permission': permission.value,
                        'access_via': access_via
                    }
                    
                    # Calculate last_edited_at from latest commit or working copy
                    last_edited_at = proj.created_at  # Default to creation time
                    
                    # Check latest commit time
                    if proj.latest_commit_id:
                        latest_commit = Commit.query.filter_by(
                            collaborative_project_id=proj.id
                        ).order_by(Commit.committed_at.desc()).first()
                        
                        if latest_commit:
                            last_edited_at = max(last_edited_at, latest_commit.committed_at)
                            latest_commit_project = Project.query.get(proj.latest_commit_id)
                            if latest_commit_project:
                                project_data['thumbnail_url'] = latest_commit_project.thumbnail_url
                    
                    # Check working copy time
                    wc = user.get_working_copy(proj.id)
                    project_data['has_working_copy'] = wc is not None
                    if wc:
                        project_data['working_copy_id'] = wc.project_id
                        project_data['working_copy_has_changes'] = wc.has_changes
                        last_edited_at = max(last_edited_at, wc.updated_at)
                    
                    # Get assignment submissions for this project
                    submissions = AssignmentSubmission.query.filter_by(
                        collaborative_project_id=proj.id,
                        user_id=user.id
                    ).all()
                    project_data['assignment_submissions'] = [{
                        'id': sub.id,
                        'assignment_id': sub.assignment_id,
                        'assignment_name': sub.assignment.name,
                        'submitted_at': to_iso_string(sub.submitted_at),
                        'organizers': [{
                            'id': org.id,
                            'username': org.username
                        } for org in sub.assignment.organizers]
                    } for sub in submissions]
                    
                    project_data['last_edited_at'] = to_iso_string(last_edited_at)
                    
                    # Get permissions (for display)
                    all_users_with_access = proj.get_all_users_with_access()
                    project_data['collaborator_count'] = len(all_users_with_access)
                    
                    # Check if project is frozen
                    project_data['is_frozen'] = proj.is_frozen()
                    
                    collaboration_projects.append(project_data)
        
        # Sort by last_edited_at descending (most recent first)
        collaboration_projects.sort(key=lambda p: p['last_edited_at'], reverse=True)
        
        return jsonify({
            'projects': collaboration_projects,
            'count': len(collaboration_projects),
            'success': True
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error retrieving collaboration projects: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@projects_bp.route('/shared', methods=['GET'])
@require_auth
def get_shared_projects(user_info):
    """
    Get projects shared with user (READ permission only, not owner)
    ✅ Uses permission system
    ✅ Sorted by last edited time (last commit)
    """
    try:
        user = User.query.get(user_info.get('user_id'))
        
        # Get projects where user has READ permission via groups
        all_projects = user.get_all_collaborative_projects()
        
        shared_projects = []
        
        for proj in all_projects:
            # Only include if:
            # 1. User is not owner
            # 2. User has READ permission only
            if proj.created_by != user.id:
                permission = proj.get_user_permission(user)
                
                if permission == PermissionLevel.READ:
                    access_via = user._get_access_via(proj)
                    
                    # Calculate last_edited_at from latest commit
                    last_edited_at = proj.created_at  # Default to creation time
                    
                    # Get thumbnail and last commit time
                    thumbnail_url = None
                    if proj.latest_commit_id:
                        latest_commit = Commit.query.filter_by(
                            collaborative_project_id=proj.id
                        ).order_by(Commit.committed_at.desc()).first()
                        
                        if latest_commit:
                            last_edited_at = max(last_edited_at, latest_commit.committed_at)
                        
                        latest_project = Project.query.get(proj.latest_commit_id)
                        if latest_project:
                            thumbnail_url = latest_project.thumbnail_url
                    
                    shared_projects.append({
                        'id': proj.id,
                        'name': proj.name,
                        'title': proj.name,  # Alias for backwards compatibility
                        'description': proj.description,
                        'created_at': to_iso_string(proj.created_at),
                        'updated_at': to_iso_string(proj.updated_at),
                        'last_edited_at': to_iso_string(last_edited_at),
                        'thumbnail_url': thumbnail_url,
                        'latest_commit_id': proj.latest_commit_id,
                        'owner': {
                            'id': proj.creator.id,
                            'username': proj.creator.username
                        } if proj.creator else None,
                        'permission': permission.value,
                        'access_via': access_via,
                        'is_collaborative': True
                    })
        
        # Sort by last_edited_at descending (most recent first)
        shared_projects.sort(key=lambda p: p['last_edited_at'], reverse=True)
        
        return jsonify({
            'projects': shared_projects,
            'count': len(shared_projects),
            'success': True
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error retrieving shared projects: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
