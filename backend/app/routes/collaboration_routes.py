from flask import Blueprint, request, jsonify, current_app, send_file
from app import db
from app.models.projects import (
    Project, 
    CollaborativeProject, 
    Commit, 
    WorkingCopy,
    CollaborativeProjectPermission,
    PermissionLevel
)
from app.models.groups import Group
from app.models.users import User
from app.middlewares.auth import require_auth
from datetime import datetime, timezone
import os
import shutil
from werkzeug.utils import secure_filename

collaboration_bp = Blueprint('collaboration', __name__)


# ============================================================
# PERMISSION MANAGEMENT (NEW UNIFIED SYSTEM)
# ============================================================

@collaboration_bp.route('/<int:collab_id>/permissions', methods=['POST'])
@require_auth
def grant_permission(user_info, collab_id):
    """
    Grant permission to user or group
    """
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Only admin can grant permissions
        if not collab_project.has_permission(user, PermissionLevel.ADMIN):
            return jsonify({'error': 'Only admins can grant permissions'}), 403
        
        data = request.get_json()
        
        target_user_id = data.get('user_id')
        target_group_id = data.get('group_id')
        permission_level = data.get('permission', 'READ')  # Default: READ
        
        # Validate permission level
        try:
            permission = PermissionLevel(permission_level)
        except ValueError:
            return jsonify({'error': 'Invalid permission level. Must be: ADMIN, WRITE, or READ'}), 400
        
        # Must specify either user OR group
        if not (bool(target_user_id) ^ bool(target_group_id)):
            return jsonify({'error': 'Specify either user_id or group_id, not both'}), 400
        
        # Verify group membership if sharing with group
        if target_group_id:
            group = Group.query.get(target_group_id)
            if not group:
                return jsonify({'error': 'Group not found'}), 404
        
        # Create or update permission
        if target_user_id:
            # Check if user exists
            target_user = User.query.get(target_user_id)
            if not target_user:
                return jsonify({'error': 'User not found'}), 404
            
            perm = CollaborativeProjectPermission.query.filter_by(
                collaborative_project_id=collab_id,
                user_id=target_user_id
            ).first()
            
            if perm:
                # Update existing
                old_permission = perm.permission
                perm.permission = permission
                perm.granted_by = user.id
                perm.granted_at = datetime.utcnow()
                message = f'Permission updated from {old_permission.value} to {permission.value}'
            else:
                # Create new
                perm = CollaborativeProjectPermission(
                    collaborative_project_id=collab_id,
                    user_id=target_user_id,
                    permission=permission,
                    granted_by=user.id
                )
                db.session.add(perm)
                message = f'Permission {permission.value} granted to user {target_user.username}'
        
        else:  # target_group_id
            perm = CollaborativeProjectPermission.query.filter_by(
                collaborative_project_id=collab_id,
                group_id=target_group_id
            ).first()
            
            if perm:
                # Update existing
                old_permission = perm.permission
                perm.permission = permission
                perm.granted_by = user.id
                perm.granted_at = datetime.utcnow()
                message = f'Permission updated from {old_permission.value} to {permission.value}'
            else:
                # Create new
                perm = CollaborativeProjectPermission(
                    collaborative_project_id=collab_id,
                    group_id=target_group_id,
                    permission=permission,
                    granted_by=user.id
                )
                db.session.add(perm)
                
                group = Group.query.get(target_group_id)
                message = f'Permission {permission.value} granted to group {group.name}'
        
        db.session.commit()
        
        current_app.logger.info(
            f"User {user.id} granted {permission.value} permission on project {collab_id}"
        )
        
        return jsonify({
            'message': message,
            'permission': perm.to_dict(),
            'success': True
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error granting permission: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@collaboration_bp.route('/<int:collab_id>/permissions', methods=['GET'])
@require_auth
def list_permissions(user_info, collab_id):
    """List all permissions for a project"""
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Must have at least read access
        if not collab_project.has_permission(user, PermissionLevel.READ):
            return jsonify({'error': 'Access denied'}), 403
        
        # Get all users with access (includes owner + permissions)
        all_users_with_access = collab_project.get_all_users_with_access()

        # Get all groups with access (includes permissions)
        all_groups_with_access = collab_project.get_all_groups_with_access()

        # Format for response
        collaborators_list = []
        
        for user_data in all_users_with_access:
            user_obj = user_data['user']
            permission = user_data['permission']
            via = user_data['via']
            
            collaborators_list.append({
                'user': {
                    'id': user_obj.id,
                    'username': user_obj.username
                },
                'permission': permission.value,
                'access_via': via
            })

        group_list = []
        for group_data in all_groups_with_access:
            group_obj = group_data['group']
            permission = group_data['permission']
            via = group_data['via']
            
            group_list.append({
                'group': {
                    'id': group_obj.id,
                    'name': group_obj.name
                },
                'permission': permission.value,
                'access_via': via,
                'permission_id': group_data["permission_id"]
            })
        # Get permission entries
        permissions = collab_project.permissions
        
        return jsonify({
            'permissions': [p.to_dict() for p in permissions],
            'collaborators': collaborators_list,
            'groups': group_list,
            'count': len(permissions),
            'total_users_with_access': len(collaborators_list),
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error listing permissions: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@collaboration_bp.route('/<int:collab_id>/permissions/<int:permission_id>', methods=['DELETE'])
@require_auth
def revoke_permission(user_info, collab_id, permission_id):
    """Revoke a permission"""
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Only admin can revoke
        if not collab_project.has_permission(user, PermissionLevel.ADMIN):
            return jsonify({'error': 'Only admins can revoke permissions'}), 403
        
        permission = CollaborativeProjectPermission.query.get(permission_id)
        
        if not permission or permission.collaborative_project_id != collab_id:
            return jsonify({'error': 'Permission not found'}), 404
        
        # Store info for response
        target_info = f"user {permission.user.username}" if permission.user else f"group {permission.group.name}"
        
        db.session.delete(permission)
        db.session.commit()
        
        current_app.logger.info(
            f"Permission {permission_id} revoked from project {collab_id}"
        )
        
        return jsonify({
            'message': f'Permission revoked from {target_info}',
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error revoking permission: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================
# PROJECT MANAGEMENT
# ============================================================

@collaboration_bp.route('/my-projects', methods=['GET'])
@require_auth
def get_my_collaborative_projects(user_info):
    """Get all collaborative projects user has access to"""
    try:
        user = User.query.get(user_info['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        projects = user.get_all_collaborative_projects()
        
        project_list = []
        for proj in projects:
            permission = proj.get_user_permission(user)
            
            project_data = {
                'id': proj.id,
                'name': proj.name,
                'description': proj.description,
                'created_by': proj.created_by,
                'creator_username': proj.creator.username if proj.creator else None,
                'permission': permission.value if permission else None,
                'access_via': user._get_access_via(proj),
                'latest_commit_id': proj.latest_commit_id
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
            
            project_list.append(project_data)
        
        return jsonify({
            'collaborative_projects': project_list,
            'count': len(project_list),
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting collaborative projects: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@collaboration_bp.route('/<int:collab_id>', methods=['GET'])
@require_auth
def get_collaborative_project(user_info, collab_id):
    """Get details of a specific collaborative project"""
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        # Check access
        permission = collab_project.get_user_permission(user)
        if not permission:
            return jsonify({'error': 'Access denied'}), 403
        
        project_data = collab_project.to_dict(include_permissions=True)
        project_data['user_permission'] = permission.value
        project_data['access_via'] = user._get_access_via(collab_project)
        
        return jsonify({
            'collaborative_project': project_data,
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting collaborative project: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@collaboration_bp.route('/<int:collab_id>', methods=['PUT'])
@require_auth
def update_collaborative_project(user_info, collab_id):
    """
    Update collaborative project properties (name, description)
    Only owner or admin can update
    """
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        # Check permission - only owner or admin can update
        permission = collab_project.get_user_permission(user)
        if permission != PermissionLevel.ADMIN:
            return jsonify({'error': 'Only admins can update project properties'}), 403
        
        data = request.get_json()
        
        # Update name if provided
        if 'name' in data:
            name = data['name']
            if not name or not name.strip():
                return jsonify({'error': 'Project name cannot be empty'}), 400
            if len(name) > 255:
                return jsonify({'error': 'Project name is too long (max 255 characters)'}), 400
            collab_project.name = name.strip()
        
        # Update description if provided
        if 'description' in data:
            collab_project.description = data['description']
        
        collab_project.updated_at = datetime.now(timezone.utc)
        
        db.session.commit()
        
        current_app.logger.info(
            f"Collaborative project {collab_id} updated by user {user.username}"
        )
        
        return jsonify({
            'collaborative_project': collab_project.to_dict(),
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error updating collaborative project: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': 'Failed to update project'}), 500


@collaboration_bp.route('/<int:collab_id>/metadata', methods=['GET'])
@require_auth
def get_collaborative_project_metadata(user_info, collab_id):
    """
    Get metadata for a collaborative project
    ✅ Returns metadata of latest commit
    """
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        # Check permission
        permission = collab_project.get_user_permission(user)
        if not permission and user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Access denied'}), 403
        if not permission:
            permission = PermissionLevel.READ  # Default for admins/teachers without explicit permission
        
        # Get latest commit
        if not collab_project.latest_commit_id:
            return jsonify({'error': 'No commits found in project'}), 404
        
        latest_project = Project.query.get(collab_project.latest_commit_id)
        if not latest_project:
            return jsonify({'error': 'Latest commit not found'}), 404
        
        response = {
            'id': collab_project.id,
            'title': collab_project.name,
            'description': collab_project.description,
            'owner': {
                'id': collab_project.creator.id,
                'username': collab_project.creator.username
            } if collab_project.creator else None,
            'latest_commit_id': collab_project.latest_commit_id,
            'permission': permission.value,
            'can_edit': permission in [PermissionLevel.ADMIN, PermissionLevel.WRITE],
            'can_commit': permission in [PermissionLevel.ADMIN, PermissionLevel.WRITE],
            'is_read_only': permission == PermissionLevel.READ,
            'is_collaborative': True,
            'success': True
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting metadata: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@collaboration_bp.route('/<int:collab_id>/download', methods=['GET'])
@require_auth
def download_collaborative_project(user_info, collab_id):
    """Download latest commit of a collaborative project"""
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        # Check permission (any level can download)
        permission = collab_project.get_user_permission(user)
        if not permission and user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get latest commit
        if not collab_project.latest_commit_id:
            return jsonify({'error': 'No commits found in project'}), 404
        
        latest_project = Project.query.get(collab_project.latest_commit_id)
        if not latest_project:
            return jsonify({'error': 'Latest commit not found'}), 404
        
        # Send file
        if latest_project.sb3_file_path and os.path.exists(latest_project.sb3_file_path):
            filename = f"{collab_project.name.replace(' ', '_')}_latest.sb3"
            
            return send_file(
                latest_project.sb3_file_path,
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


@collaboration_bp.route('/<int:collab_id>/copy', methods=['POST'])
@require_auth
def copy_collaborative_project(user_info, collab_id):
    """
    Create a copy of a shared collaborative project
    ✅ For users with READ permission (e.g., group members)
    """
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        # Check if user has access
        permission = collab_project.get_user_permission(user)
        if not permission:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get latest commit
        if not collab_project.latest_commit_id:
            return jsonify({'error': 'No commits found in project'}), 404
        
        latest_commit_project = Project.query.get(collab_project.latest_commit_id)
        
        # Create NEW collaborative project for the copy
        copy_collab = CollaborativeProject(
            name=f"{collab_project.name} (Copy)",
            description=f"Copy of shared project",
            created_by=user.id
        )
        db.session.add(copy_collab)
        db.session.flush()
        
        # Create new project as first commit
        copy_project = Project(
            name=f"{copy_collab.name} - Commit 1",
            description="Copied from shared project",
            owner_id=user.id
        )
        db.session.add(copy_project)
        db.session.flush()
        
        # Copy files
        upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'projects')
        os.makedirs(upload_folder, exist_ok=True)
        
        if latest_commit_project.sb3_file_path and os.path.exists(latest_commit_project.sb3_file_path):
            new_filename = f"{copy_project.id}_{user.id}.sb3"
            new_file_path = os.path.join(upload_folder, new_filename)
            shutil.copy2(latest_commit_project.sb3_file_path, new_file_path)
            copy_project.sb3_file_path = new_file_path
        
        if latest_commit_project.thumbnail_path and os.path.exists(latest_commit_project.thumbnail_path):
            thumbnail_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'thumbnails')
            os.makedirs(thumbnail_folder, exist_ok=True)
            new_thumb_filename = f"thumb_{copy_project.id}.png"
            new_thumb_path = os.path.join(thumbnail_folder, new_thumb_filename)
            shutil.copy2(latest_commit_project.thumbnail_path, new_thumb_path)
            copy_project.thumbnail_path = new_thumb_path
        
        # Create first commit
        commit = Commit(
            project_id=copy_project.id,
            collaborative_project_id=copy_collab.id,
            commit_number=1,
            commit_message="Copied from shared project",
            committed_by=user.id
        )
        db.session.add(commit)
        
        copy_collab.latest_commit_id = copy_project.id
        
        db.session.commit()
        
        return jsonify({
            'collaborative_project': copy_collab.to_dict(),
            'success': True,
            'message': 'Project copied successfully'
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error copying project: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================
# WORKING COPY MANAGEMENT
# ============================================================

@collaboration_bp.route('/<int:collab_id>/working-copy', methods=['GET'])
@require_auth
def get_or_load_working_copy(user_info, collab_id):
    """
    Get or create user's working copy
    ✅ Requires WRITE permission
    """
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        # Check WRITE permission
        if not collab_project.has_permission(user, PermissionLevel.WRITE):
            return jsonify({'error': 'You need write permission to create a working copy'}), 403
        
        # Get or create working copy
        wc = user.get_working_copy(collab_id)
        
        if not wc:
            # Create from latest commit
            if not collab_project.latest_commit_id:
                return jsonify({'error': 'No commits found in project'}), 404
            
            latest_commit_project = Project.query.get(collab_project.latest_commit_id)
            
            new_wc_project = Project(
                name=f"{collab_project.name} - Working Copy",
                description="Working copy",
                owner_id=user.id
            )
            db.session.add(new_wc_project)
            db.session.flush()
            
            # Copy files
            upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'projects')
            os.makedirs(upload_folder, exist_ok=True)
            
            if latest_commit_project.sb3_file_path and os.path.exists(latest_commit_project.sb3_file_path):
                filename = secure_filename(f"{new_wc_project.id}_{user.id}.sb3")
                file_path = os.path.join(upload_folder, filename)
                shutil.copy2(latest_commit_project.sb3_file_path, file_path)
                new_wc_project.sb3_file_path = file_path
            
            if latest_commit_project.thumbnail_path and os.path.exists(latest_commit_project.thumbnail_path):
                thumbnail_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'thumbnails')
                os.makedirs(thumbnail_folder, exist_ok=True)
                thumbnail_filename = secure_filename(f"thumb_{new_wc_project.id}.png")
                thumbnail_path = os.path.join(thumbnail_folder, thumbnail_filename)
                shutil.copy2(latest_commit_project.thumbnail_path, thumbnail_path)
                new_wc_project.thumbnail_path = thumbnail_path
            
            wc = WorkingCopy(
                project_id=new_wc_project.id,
                collaborative_project_id=collab_id,
                user_id=user.id,
                based_on_commit_id=collab_project.latest_commit_id,
                has_changes=False
            )
            db.session.add(wc)
            db.session.commit()
        
        # Load working copy
        wc_project = Project.query.get(wc.project_id)
        
        if not wc_project or not wc_project.sb3_file_path or not os.path.exists(wc_project.sb3_file_path):
            return jsonify({'error': 'Working copy file not found'}), 404
        
        return send_file(
            wc_project.sb3_file_path,
            mimetype='application/x.scratch.sb3',
            as_attachment=True,
            download_name=f'{collab_project.name}_working_copy.sb3'
        ), 200, {
            'X-Project-Id': str(wc_project.id),
            'X-Collaborative-Project-Id': str(collab_id),
            'X-Based-On-Commit-Id': str(wc.based_on_commit_id),
            'X-Has-Changes': str(wc.has_changes).lower()
        }
        
    except Exception as e:
        current_app.logger.error(f"Error loading working copy: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@collaboration_bp.route('/<int:collab_id>/working-copy/info', methods=['GET'])
@require_auth
def get_working_copy_info(user_info, collab_id):
    """
    Get information about user's working copy for a collaborative project
    Returns metadata including project_id and has_working_copy flag
    """
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        # Check WRITE permission
        if not collab_project.has_permission(user, PermissionLevel.WRITE):
            return jsonify({'error': 'You need write permission to access working copy'}), 403
        
        # Get working copy
        wc = user.get_working_copy(collab_id)
        
        if not wc:
            return jsonify({
                'has_working_copy': False,
                'collaborative_project_id': collab_id,
                'success': True
            }), 200
        
        wc_project = Project.query.get(wc.project_id)
        
        return jsonify({
            'has_working_copy': True,
            'project_id': wc.project_id,
            'collaborative_project_id': collab_id,
            'based_on_commit_id': wc.based_on_commit_id,
            'has_changes': wc.has_changes,
            'updated_at': wc.updated_at.isoformat(),
            'created_at': wc.created_at.isoformat(),
            'project_name': wc_project.name if wc_project else None,
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting working copy info: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


# ============================================================
# COMMIT MANAGEMENT
# ============================================================

@collaboration_bp.route('/<int:collab_id>/commit', methods=['POST'])
@require_auth
def commit_working_copy(user_info, collab_id):
    """
    Commit user's working copy
    ✅ Requires WRITE permission
    """
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        # Check WRITE permission
        if not collab_project.has_permission(user, PermissionLevel.WRITE):
            return jsonify({'error': 'You need write permission to commit'}), 403
        
        # Get working copy
        wc = user.get_working_copy(collab_id)
        if not wc:
            return jsonify({'error': 'No working copy found'}), 404
        
        data = request.json or {}
        commit_message = data.get('message', 'Update')
        
        # Get next commit number
        last_commit = db.session.query(Commit)\
            .filter_by(collaborative_project_id=collab_id)\
            .order_by(Commit.commit_number.desc())\
            .first()
        
        next_commit_num = (last_commit.commit_number + 1) if last_commit else 1
        
        # Working copy project becomes commit
        wc_project = Project.query.get(wc.project_id)
        wc_project.name = f"{collab_project.name} - Commit {next_commit_num}"
        
        # Create Commit entry
        commit = Commit(
            project_id=wc.project_id,
            collaborative_project_id=collab_id,
            commit_number=next_commit_num,
            parent_commit_id=wc.based_on_commit_id,
            commit_message=commit_message,
            committed_by=user.id
        )
        db.session.add(commit)
        
        # Update latest commit
        collab_project.latest_commit_id = wc.project_id
        
        # Delete WorkingCopy entry
        db.session.delete(wc)
        
        # Create new working copy
        new_wc_project = Project(
            name=f"{collab_project.name} - Working Copy",
            description="Working copy",
            owner_id=user.id
        )
        db.session.add(new_wc_project)
        db.session.flush()
        
        # Copy files
        upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'projects')
        
        if wc_project.sb3_file_path and os.path.exists(wc_project.sb3_file_path):
            filename = secure_filename(f"{new_wc_project.id}_{user.id}.sb3")
            file_path = os.path.join(upload_folder, filename)
            shutil.copy2(wc_project.sb3_file_path, file_path)
            new_wc_project.sb3_file_path = file_path
        
        if wc_project.thumbnail_path and os.path.exists(wc_project.thumbnail_path):
            thumbnail_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'thumbnails')
            thumbnail_filename = secure_filename(f"thumb_{new_wc_project.id}.png")
            thumbnail_path = os.path.join(thumbnail_folder, thumbnail_filename)
            shutil.copy2(wc_project.thumbnail_path, thumbnail_path)
            new_wc_project.thumbnail_path = thumbnail_path
        
        # Create new WorkingCopy
        new_wc = WorkingCopy(
            project_id=new_wc_project.id,
            collaborative_project_id=collab_id,
            user_id=user.id,
            based_on_commit_id=wc.project_id
        )
        db.session.add(new_wc)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Committed successfully',
            'commit': commit.to_dict(),
            'new_working_copy_id': new_wc_project.id,
            'success': True
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error committing: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@collaboration_bp.route('/<int:collab_id>/commits', methods=['GET'])
@require_auth
def get_commit_history(user_info, collab_id):
    """Get all commits (requires READ permission)"""
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        # Check READ permission
        if not collab_project.get_user_permission(user):
            return jsonify({'error': 'Access denied'}), 403
        
        commits = db.session.query(Commit)\
            .filter_by(collaborative_project_id=collab_id)\
            .order_by(Commit.commit_number.desc())\
            .all()
        
        commits_data = []
        for commit in commits:
            commit_dict = commit.to_dict()
            commit_project = Project.query.get(commit.project_id)
            if commit_project:
                commit_dict['thumbnail_url'] = commit_project.thumbnail_url
            commits_data.append(commit_dict)
        
        return jsonify({
            'commits': commits_data,
            'latest_commit_id': collab_project.latest_commit_id,
            'count': len(commits),
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting commits: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@collaboration_bp.route('/<int:collab_id>/data', methods=['GET'])
@require_auth
def get_collaboration_data(user_info, collab_id):
    """
    Get all collaboration data in one call
    ✅ Uses permission system
    """
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        # Check permission
        user_permission = collab_project.get_user_permission(user)
        if not user_permission and user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Access denied'}), 403
        
        if not user_permission:
            user_permission = PermissionLevel.READ  # Default for admins/teachers without explicit permission
        # Get commits
        commits = db.session.query(Commit)\
            .filter_by(collaborative_project_id=collab_id)\
            .order_by(Commit.commit_number.desc())\
            .all()

        commits_data = []
        for commit in commits:
            commit_dict = commit.to_dict()
            commit_project = Project.query.get(commit.project_id)
            if commit_project:
                commit_dict['thumbnail_url'] = commit_project.thumbnail_url
            commits_data.append(commit_dict)

        # Get all users with access
        all_users_with_access = collab_project.get_all_users_with_access()
        
        collaborators_list = []
        for user_data in all_users_with_access:
            user_obj = user_data['user']
            permission = user_data['permission']
            via = user_data['via']
            permission_id = None
            try:
                permission_id = user_data['permission_id']
            except:
                pass


            
            collaborators_list.append({
                'user': {
                    'id': user_obj.id,
                    'username': user_obj.username
                },
                'permission': permission.value,
                'permission_id': permission_id,
                'access_via': via
            })

        all_groups_with_access = collab_project.get_all_groups_with_access()

        group_list = []
        for group_data in all_groups_with_access:
            group_obj = group_data['group']
            permission = group_data['permission']
            via = group_data['via']
            
            group_list.append({
                'group': {
                    'id': group_obj.id,
                    'name': group_obj.name
                },
                'permission': permission.value,
                'access_via': via,
                'permission_id': group_data["permission_id"]
            })
        # Get working copies
        working_copies_dict = user.get_all_working_copies(collab_id)
        
        working_copies_formatted = {}
        for commit_id, wc in working_copies_dict.items():
            working_copies_formatted[commit_id] = {
                'project_id': wc.project_id,
                'based_on_commit_id': wc.based_on_commit_id,
                'has_changes': wc.has_changes,
                'updated_at': wc.updated_at.isoformat(),
                'created_at': wc.created_at.isoformat()
            }
        
        return jsonify({
            'commits': commits_data,
            'collaborators': collaborators_list,
            'groups': group_list,
            'working_copies': working_copies_formatted,
            'user_permission': user_permission.value,
            'can_commit': user_permission in [PermissionLevel.ADMIN, PermissionLevel.WRITE],
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting collaboration data: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@collaboration_bp.route('/<int:collab_id>/commits/<int:commit_num>/load', methods=['POST'])
@require_auth
def load_commit_as_working_copy(user_info, collab_id, commit_num):
    """
    Create working copy from a specific commit
    (Replaces current working copy if exists)
    """
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        if not user.has_access_to_collaborative_project(collab_project):
            return jsonify({'error': 'Access denied'}), 403
        
        # Get the commit
        commit = Commit.query.filter_by(
            collaborative_project_id=collab_id,
            commit_number=commit_num
        ).first()
        
        if not commit:
            return jsonify({'error': 'Commit not found'}), 404
        
        # Check if working copy already exists for THIS commit
        existing_wc = user.get_working_copy(collab_id, commit.project_id)
        
        if existing_wc:
            current_app.logger.info(
                f"Working copy already exists for commit #{commit_num}"
            )
            return jsonify({
                'message': 'Working copy already exists',
                'working_copy_id': existing_wc.project_id,
                'based_on_commit': commit.project_id,
                'success': True
            }), 200
        
        # Create new working copy from commit
        commit_project = Project.query.get(commit.project_id)
        
        new_wc_project = Project(
            name=f"{collab_project.name} - Working Copy",
            description="Working copy",
            owner_id=user_info['user_id']
        )
        db.session.add(new_wc_project)
        db.session.flush()
        
        # Copy files
        upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'projects')
        os.makedirs(upload_folder, exist_ok=True)
        
        if commit_project.sb3_file_path and os.path.exists(commit_project.sb3_file_path):
            filename = secure_filename(f"{new_wc_project.id}_{user_info['user_id']}.sb3")
            file_path = os.path.join(upload_folder, filename)
            shutil.copy2(commit_project.sb3_file_path, file_path)
            new_wc_project.sb3_file_path = file_path
        
        if commit_project.thumbnail_path and os.path.exists(commit_project.thumbnail_path):
            thumbnail_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'thumbnails')
            thumbnail_filename = secure_filename(f"thumb_{new_wc_project.id}.png")
            thumbnail_path = os.path.join(thumbnail_folder, thumbnail_filename)
            shutil.copy2(commit_project.thumbnail_path, thumbnail_path)
            new_wc_project.thumbnail_path = thumbnail_path
        
        # Create WorkingCopy entry
        new_wc = WorkingCopy(
            project_id=new_wc_project.id,
            collaborative_project_id=collab_id,
            user_id=user_info['user_id'],
            based_on_commit_id=commit.project_id,
            has_changes=False  # Neu erstellt, keine Änderungen
        )
        db.session.add(new_wc)
        
        db.session.commit()
        
        current_app.logger.info(
            f"Working copy created for commit #{commit_num} by user {user_info['user_id']}"
        )
        
        # ✅ WICHTIG: Return working_copy_id for auto-loading
        return jsonify({
            'message': 'Commit loaded as working copy',
            'working_copy_id': new_wc_project.id,
            'based_on_commit': commit.project_id,
            'success': True
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error creating working copy: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@collaboration_bp.route('/<int:collab_id>/commits/<int:commit_num>', methods=['GET'])
@require_auth
def get_commit(user_info, collab_id, commit_num):
    """Get details of a specific commit"""
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        if not user.has_access_to_collaborative_project(collab_project):
            return jsonify({'error': 'Access denied'}), 403
        
        commit = Commit.query.filter_by(
            collaborative_project_id=collab_id,
            commit_number=commit_num
        ).first()
        
        if not commit:
            return jsonify({'error': 'Commit not found'}), 404
        
        return jsonify({
            'commit': commit.to_dict(),
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting commit: {str(e)}")
        return jsonify({'error': str(e)}), 500


@collaboration_bp.route('/<int:collab_id>/commits/<int:commit_num>/download', methods=['GET'])
@require_auth
def download_commit(user_info, collab_id, commit_num):
    """Download a specific commit as SB3 file"""
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        if not user.has_access_to_collaborative_project(collab_project):
            return jsonify({'error': 'Access denied'}), 403
        
        commit = Commit.query.filter_by(
            collaborative_project_id=collab_id,
            commit_number=commit_num
        ).first()
        
        if not commit:
            return jsonify({'error': 'Commit not found'}), 404
        
        commit_project = Project.query.get(commit.project_id)
        
        if not commit_project.sb3_file_path or not os.path.exists(commit_project.sb3_file_path):
            return jsonify({'error': 'Commit file not found'}), 404
        
        return send_file(
            commit_project.sb3_file_path,
            mimetype='application/x.scratch.sb3',
            as_attachment=True,
            download_name=f'{collab_project.name}_commit_{commit_num}.sb3'
        )
        
    except Exception as e:
        current_app.logger.error(f"Error downloading commit: {str(e)}")
        return jsonify({'error': str(e)}), 500


@collaboration_bp.route('/<int:collab_id>/commits/<int:commit_num>/working-copy', methods=['DELETE'])
@require_auth
def delete_working_copy_for_commit(user_info, collab_id, commit_num):
    """
    Delete user's working copy for a specific commit
    """
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        # Check WRITE permission
        if not collab_project.has_permission(user, PermissionLevel.WRITE):
            return jsonify({'error': 'You need write permission to delete working copy'}), 403
        
        # Get the commit
        commit = Commit.query.filter_by(
            collaborative_project_id=collab_id,
            commit_number=commit_num
        ).first()
        
        if not commit:
            return jsonify({'error': 'Commit not found'}), 404
        
        # Get working copy based on this commit
        wc = user.get_working_copy(collab_id, commit.project_id)
        
        if not wc:
            return jsonify({'error': 'Working copy not found'}), 404
        
        # Delete the working copy project
        wc_project = Project.query.get(wc.project_id)
        
        if wc_project:
            # Delete files
            if wc_project.sb3_file_path and os.path.exists(wc_project.sb3_file_path):
                try:
                    os.remove(wc_project.sb3_file_path)
                except OSError as e:
                    current_app.logger.warning(f"Could not delete SB3 file: {e}")
            
            if wc_project.thumbnail_path and os.path.exists(wc_project.thumbnail_path):
                try:
                    os.remove(wc_project.thumbnail_path)
                except OSError as e:
                    current_app.logger.warning(f"Could not delete thumbnail: {e}")
            
            # Delete project
            db.session.delete(wc_project)
        
        # Delete working copy entry
        db.session.delete(wc)
        db.session.commit()
        
        current_app.logger.info(
            f"Working copy for commit #{commit_num} deleted by user {user.id}"
        )
        
        return jsonify({
            'message': 'Working copy deleted successfully',
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting working copy: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

    
@collaboration_bp.route('/<int:collab_id>/available-collaborators', methods=['GET'])
@require_auth
def get_available_collaborators(user_info, collab_id):
    """
    Get users available to add as collaborators
    Filters out owner and existing collaborators
    Supports search query
    """
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        # Only owner can view available collaborators
        if collab_project.created_by != user.id:
            return jsonify({'error': 'Access denied'}), 403
        
        search_query = request.args.get('search', '').lower()
        
        # Get all users
        all_users = User.query.all()
        
        # Get existing collaborator IDs
        existing_collaborator_ids = set()
        
        # Add owner
        existing_collaborator_ids.add(collab_project.created_by)
        
        # Add group members
        if collab_project.group:
            for member in collab_project.group.members:
                existing_collaborator_ids.add(member.id)
        
        # Add individually invited
        for collab in collab_project.collaborators:
            existing_collaborator_ids.add(collab.user_id)
        
        # Filter users
        available_users = []
        for u in all_users:
            # Skip if already a collaborator
            if u.id in existing_collaborator_ids:
                continue
            
            # Apply search filter
            if search_query:
                if search_query not in u.username.lower():
                    if not u.email or search_query not in u.email.lower():
                        continue
            
            available_users.append({
                'id': u.id,
                'username': u.username,
                'email': u.email
            })
        
        current_app.logger.info(
            f"Found {len(available_users)} available collaborators for project {collab_id}"
        )
        
        return jsonify({
            'users': available_users,
            'count': len(available_users),
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting available collaborators: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@collaboration_bp.route('/<int:collab_id>', methods=['DELETE'])
@require_auth
def delete_or_leave_collaborative_project(user_info, collab_id):
    """
    Soft-delete or leave a collaborative project
    
    OWNER: Soft-deletes entire project (moves to trash)
    COLLABORATOR: Leaves project, converts WCs to standalone
    """
    try:
        user = User.query.get(user_info['user_id'])
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        if not user.has_access_to_collaborative_project(collab_project):
            return jsonify({'error': 'Access denied'}), 403
        
        # Check if already deleted
        if collab_project.is_deleted:
            return jsonify({'error': 'Project is already deleted'}), 400
        
        is_owner = (collab_project.created_by == user.id)
        
        # ============================================================
        # CASE 1: OWNER SOFT-DELETES ENTIRE PROJECT
        # ============================================================
        
        if is_owner:
            current_app.logger.info(
                f"Owner {user.id} soft-deleting collaborative project {collab_id}"
            )
            
            # ✅ Soft delete the collaborative project
            collab_project.soft_delete(user.id)
            
            # ✅ Also soft-delete all commits (Projects)
            commits = Commit.query.filter_by(collaborative_project_id=collab_id).all()
            
            for commit in commits:
                commit_project = Project.query.get(commit.project_id)
                if commit_project and not commit_project.is_deleted:
                    commit_project.soft_delete(user.id)
            
            # ✅ Soft-delete all working copies (Projects)
            all_working_copies = WorkingCopy.query.filter_by(
                collaborative_project_id=collab_id
            ).all()
            
            for wc in all_working_copies:
                wc_project = Project.query.get(wc.project_id)
                if wc_project and not wc_project.is_deleted:
                    wc_project.soft_delete(user.id)
            
            db.session.commit()
            
            current_app.logger.info(
                f"Collaborative project {collab_id} soft-deleted by owner "
                f"({len(commits)} commits, {len(all_working_copies)} working copies)"
            )
            
            return jsonify({
                'message': 'Project moved to trash',
                'action': 'soft_deleted_as_owner',
                'deleted_commits': len(commits),
                'deleted_working_copies': len(all_working_copies),
                'success': True
            }), 200
        
        # ============================================================
        # CASE 2: COLLABORATOR LEAVES PROJECT
        # ============================================================
        
        else:
            current_app.logger.info(
                f"Collaborator {user.id} leaving collaborative project {collab_id}"
            )
            
            # Get user's working copies
            user_working_copies = WorkingCopy.query.filter_by(
                collaborative_project_id=collab_id,
                user_id=user.id
            ).all()
            
            standalone_projects = []
            
            # Convert working copies to standalone
            for wc in user_working_copies:
                wc_project = Project.query.get(wc.project_id)
                
                if wc_project:
                    # Convert to standalone project
                    wc_project.name = f"{collab_project.name} (Your Copy)"
                    
                    standalone_projects.append({
                        'id': wc_project.id,
                        'name': wc_project.name
                    })
                
                # Delete working copy entry (project becomes standalone)
                db.session.delete(wc)
            
            db.session.flush()
            
            # Remove user permission entry (if exists)
            permission_entry = CollaborativeProjectPermission.query.filter_by(
                collaborative_project_id=collab_id,
                user_id=user.id
            ).first()
            
            if permission_entry:
                db.session.delete(permission_entry)
            
            db.session.commit()
            
            current_app.logger.info(
                f"User {user.id} left project {collab_id}, "
                f"converted {len(standalone_projects)} WCs to standalone"
            )
            
            return jsonify({
                'message': 'You have left the project',
                'action': 'left_as_collaborator',
                'standalone_projects': standalone_projects,
                'success': True
            }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting/leaving project: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@collaboration_bp.route('/<int:collab_id>/restore', methods=['POST'])
@require_auth
def restore_collaborative_project(user_info, collab_id):
    """
    Restore a soft-deleted collaborative project
    Only owner or teacher/admin can restore
    """
    try:
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        # Check permission (owner or teacher/admin)
        if collab_project.created_by != user_info['user_id']:
            if user_info.get('role') not in ['teacher', 'admin']:
                return jsonify({'error': 'Access denied'}), 403
        
        # Check if deleted
        if not collab_project.is_deleted:
            return jsonify({'error': 'Project is not deleted'}), 400
        
        # ✅ Restore collaborative project
        collab_project.restore()
        
        # ✅ Restore all commits
        commits = Commit.query.filter_by(collaborative_project_id=collab_id).all()
        
        for commit in commits:
            commit_project = Project.query.get(commit.project_id)
            if commit_project and commit_project.is_deleted:
                commit_project.restore()
        
        # ✅ Restore all working copies
        all_working_copies = WorkingCopy.query.filter_by(
            collaborative_project_id=collab_id
        ).all()
        
        for wc in all_working_copies:
            wc_project = Project.query.get(wc.project_id)
            if wc_project and wc_project.is_deleted:
                wc_project.restore()
        
        db.session.commit()
        
        current_app.logger.info(
            f"Collaborative project {collab_id} restored by user {user_info['user_id']}"
        )
        
        return jsonify({
            'message': 'Project restored successfully',
            'restored_commits': len(commits),
            'restored_working_copies': len(all_working_copies),
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error restoring collaborative project: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@collaboration_bp.route('/<int:collab_id>/permanent', methods=['DELETE'])
@require_auth
def permanently_delete_collaborative_project(user_info, collab_id):
    """
    Permanently delete a collaborative project
    Only teachers/admins can do this
    Project must be in trash first
    """
    try:
        collab_project = CollaborativeProject.query.get(collab_id)
        
        if not collab_project:
            return jsonify({'error': 'Collaborative project not found'}), 404
        
        # Only teachers/admins can permanently delete
        if user_info.get('role') not in ['teacher', 'admin']:
            return jsonify({'error': 'Access denied'}), 403
        
        # Must be in trash first
        if not collab_project.is_deleted:
            return jsonify({'error': 'Project must be in trash first'}), 400
        
        current_app.logger.info(
            f"Permanently deleting collaborative project {collab_id} by user {user_info['user_id']}"
        )
        
        # Clear latest_commit_id reference
        collab_project.latest_commit_id = None
        db.session.flush()
        
        # Get all working copies
        all_working_copies = WorkingCopy.query.filter_by(
            collaborative_project_id=collab_id
        ).all()
        
        # Delete working copy entries
        for wc in all_working_copies:
            db.session.delete(wc)
        
        db.session.flush()
        
        # Delete working copy projects and files
        for wc in all_working_copies:
            wc_project = Project.query.get(wc.project_id)
            if wc_project:
                _delete_project_files(wc_project)
                db.session.delete(wc_project)
        
        db.session.flush()
        
        # Get all commits
        commits = Commit.query.filter_by(collaborative_project_id=collab_id).all()
        
        # Delete commit entries
        for commit in commits:
            db.session.delete(commit)
        
        db.session.flush()
        
        # Delete commit projects and files
        for commit in commits:
            commit_project = Project.query.get(commit.project_id)
            if commit_project:
                _delete_project_files(commit_project)
                db.session.delete(commit_project)
        
        db.session.flush()
        
        # Delete permission entries (handled by cascade='all, delete-orphan')
        # No need to manually delete permissions as they will be deleted automatically
        
        db.session.flush()
        
        # Finally, delete the collaborative project itself
        db.session.delete(collab_project)
        
        db.session.commit()
        
        current_app.logger.info(
            f"Collaborative project {collab_id} permanently deleted"
        )
        
        return jsonify({
            'message': 'Project permanently deleted',
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error permanently deleting project: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


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
