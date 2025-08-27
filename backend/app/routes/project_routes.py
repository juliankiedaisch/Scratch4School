from app.models.projects import Project, project_groups
from app.models.groups import Group
from app.models.users import User
from app.middlewares.auth import require_auth
from app.middlewares.auth import check_auth
from datetime import datetime, timezone
from app import db
from flask import Blueprint, request, current_app, jsonify, send_file, g
import os, shutil
from werkzeug.utils import secure_filename

projects_bp = Blueprint('projects', __name__)

# Route to check if user can save (for the frontend)
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
    """Create a new project for the authenticated user"""
    try:
        # Get query parameters
        title = request.args.get('title', 'Untitled Project')
    
        
        # Check if we have a project file in the request
        if 'project_file' in request.files:
            project_file = request.files['project_file']
            
            if project_file.filename == '':
                return jsonify({'error': 'No file selected'}), 400

            # Create new project record
            project = Project(
                name=title,
                description=f"Created on {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
                owner_id=user_info.get("user_id"),
                is_published=False
            )
            db.session.add(project)
            db.session.flush()
            # Store the SB3 file
            # You could either store it as a binary file or extract its contents
            
            #Store as binary file
            upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'projects')
            os.makedirs(upload_folder, exist_ok=True)
            # Generate a secure filename with timestamp
            filename = secure_filename(f"{project.id}_{user_info.get('user_id')}.sb3")
            file_path = os.path.join(upload_folder, filename)
            project_file.save(file_path)
            
            # Handle thumbnail if provided
            thumbnail_path = None
            thumbnail_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'thumbnails')
            if 'thumbnail' in request.files:
                thumbnail_file = request.files['thumbnail']
                if thumbnail_file.filename != '':
                    # Save thumbnail
                    thumbnail_filename = secure_filename(f"thumb_{user_info.get('user_id')}_{project.id}.png")
                    thumbnail_path = os.path.join(thumbnail_folder, thumbnail_filename)
                    thumbnail_file.save(thumbnail_path)

            project.sb3_file_path = file_path  # Store the file path
            project.thumbnail_path = thumbnail_path

            db.session.commit()
            current_app.logger.info(f"Project created: {project.id} by {user_info.get('username')}")
            
            # Return the project info
            return jsonify({
                'id': project.id,
                'title': project.name,
                'description': project.description,
                'created_at': project.created_at.isoformat(),
                'updated_at': project.updated_at.isoformat(),
                'success': True
            }), 200
            
        # If no project file was uploaded, check if we have JSON content
        elif request.json:
            # Create new project with JSON content
            project = Project(
                name=title,
                description=f"Created on {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
                owner_id=user_info.user_id,
                is_published=False
            )
            
            db.session.add(project)
            db.session.commit()
            
            current_app.logger.info(f"Project created (JSON): {project.id} by {user_info.get('username')}")
            
            # Return the project info
            return jsonify({
                'id': project.id,
                'title': project.name,
                'description': project.description,
                'created_at': project.created_at.isoformat(),
                'updated_at': project.updated_at.isoformat(),
                'success': True
            }), 200
            
        else:
            # Neither file nor JSON content provided
            return jsonify({'error': 'No project content provided'}), 400
            
    except Exception as e:
        current_app.logger.error(f"Error creating project: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@projects_bp.route('/<project_id>', methods=['PUT'])
@require_auth
def update_project(user_info, project_id):
    """Update an existing project"""
    try:
        # Get query parameters
        title = request.args.get('title')
        
        # Get the current user from request
        user = User.query.get(user_info.get('user_id'))
        
        # Find the project
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
            
        # Check ownership
        if project.owner_id != user.id:
            return jsonify({'error': 'You do not have permission to update this project'}), 403
        
        # Check if we have a project file in the request
        if 'project_file' in request.files:
            project_file = request.files['project_file']
            
            if project_file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            # Store the SB3 file
            # Generate a secure filename with timestamp
            filename = secure_filename(f"{project.id}_{user_info.get('user_id')}.sb3")
            upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'projects')
            os.makedirs(upload_folder, exist_ok=True)
            file_path = os.path.join(upload_folder, filename)
            project_file.save(file_path)

            # Handle thumbnail if provided
            if 'thumbnail' in request.files:
                thumbnail_file = request.files['thumbnail']
                thumbnail_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'thumbnails')

                thumbnail_filename = secure_filename(f"thumb__{user_info.get('user_id')}_{project.id}.png")
                thumbnail_path = os.path.join(thumbnail_folder, thumbnail_filename)
                thumbnail_file.save(thumbnail_path)
                project.thumbnail_path = thumbnail_path


            # Update project record
            if title:
                project.name = title
            
            project.sb3_file_path = file_path
            project.updated_at = datetime.now(timezone.utc)
            
            db.session.commit()
            
            current_app.logger.info(f"Project updated with SB3 file: {project.id} by {user.username}")
            
            # Return the project info
            return jsonify({
                'id': project.id,
                'title': project.name,
                'description': project.description,
                'created_at': project.created_at.isoformat(),
                'updated_at': project.updated_at.isoformat(),
                'success': True

            }), 200
            
        # If no project file was uploaded, check if we have JSON content
        elif request.json:
            # Update project with JSON content
            if title:
                project.name = title
                
            project.content = request.json
            project.updated_at = datetime.now(timezone.utc)
            
            db.session.commit()
            
            current_app.logger.info(f"Project updated with JSON: {project.id} by {user.username}")
            
            # Return the project info
            return jsonify({
                'id': project.id,
                'title': project.name,
                'description': project.description,
                'created_at': project.created_at.isoformat(),
                'updated_at': project.updated_at.isoformat(),
                'success': True
            }), 200
            
        else:
            # Neither file nor JSON content provided
            return jsonify({'error': 'No project content provided'}), 400
            
    except Exception as e:
        current_app.logger.error(f"Error updating project: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@projects_bp.route('/<project_id>/metadata', methods=['GET'])
@require_auth
def get_project(user_info, project_id):
    """Get a specific project by ID"""
    try:
        # Get the current user from request
        user = request.user
        
        # Find the project
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
            
        # Check ownership or if project is shared with user's groups
        is_owner = (project.owner_id == user.id)
        is_shared = False
        

        shared_groups = [
            {
                'id': group.id,
                'name': group.name,
                'external_id': group.external_id
            } for group in project.shared_groups
            ]
        print(f"Project {project.id} shared with groups: {shared_groups}")
            
        if not (is_owner or is_shared or user_info.get("role") =="admin" or user_info.get("role") == "teacher"):
            return jsonify({'error': 'You do not have permission to view this project'}), 403
        
        return jsonify({
            'id': project.id,
            'title': project.name,
            'is_shared': is_shared,
            'description': project.description,
            'created_at': project.created_at.isoformat(),
            'updated_at': project.updated_at.isoformat(),
            'success': True,
            'is_published': project.is_published,
            'shared_with_groups': shared_groups
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error retrieving project: {str(e)}")
        return jsonify({'error': str(e)}), 500

@projects_bp.route('/<project_id>/download', methods=['GET'])
@require_auth
def download_project(user_info, project_id):
    """Download a project as an SB3 file"""
    try:
        # Get the current user from request
        user = User.query.get(user_info.get('user_id'))
        # Find the project
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
            
        # Check ownership or shared permissions
        is_owner = (project.owner_id == user_info.get('user_id'))
        is_shared = False
        
        if not is_owner and project.is_published:
            user_group_ids = [g.id for g in user.groups]
            project_group_ids = [g.id for g in project.shared_groups]
            
            is_shared = any(group_id in user_group_ids for group_id in project_group_ids)
            
        if not (is_owner or is_shared or user_info.get("role") =="admin" or user_info.get("role") == "teacher"):
            return jsonify({'error': 'You do not have permission to download this project'}), 403
        
        # Check if the project has an SB3 file
        if project.sb3_file_path and os.path.exists(project.sb3_file_path):
            # Serve the SB3 file
            filename = f"{project.name.replace(' ', '_')}.sb3"
            return send_file(
                project.sb3_file_path,
                mimetype='application/octet-stream',
                as_attachment=True,
                download_name=filename
            )
        else:
            return jsonify({'error': 'No project data available for download'}), 404
                
    except Exception as e:
        current_app.logger.error(f"Error downloading project: {str(e)}")
        return jsonify({'error': str(e)}), 500

@projects_bp.route('/<project_id>/thumbnail', methods=['GET'])
def get_project_thumbnail(project_id):
    """Get a project's thumbnail image"""
    try:
        # Find the project
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Check if project has a thumbnail
        if not project.thumbnail_path or not os.path.exists(project.thumbnail_path):
            # Return a default thumbnail
            thumbnail_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'thumbnails')
            default_thumbnail = os.path.join(thumbnail_folder, 'default.png')
            if os.path.exists(default_thumbnail):
                return send_file(default_thumbnail, mimetype='image/png')
            else:
                return jsonify({'error': 'Thumbnail not found'}), 404
        else:
            print(f"No thumbnail for project {project_id}: {project.thumbnail_path}")
        
        # Return the thumbnail image
        return send_file(project.thumbnail_path, mimetype='image/png')
            
    except Exception as e:
        current_app.logger.error(f"Error retrieving thumbnail: {str(e)}")
        return jsonify({'error': str(e)}), 500

@projects_bp.route('/recent', methods=['GET'])
@require_auth
def get_recent_project(user_info):
    """Get the user's most recent project"""
    try:
        # Get the current user from request
        user = request.user
        
        # Find the most recent project for this user
        # Order by updated_at descending and limit to 1
        recent_project = Project.query.filter_by(owner_id=user.id) \
                              .order_by(Project.updated_at.desc()) \
                              .first()
        
        if not recent_project:
            return jsonify({'message': 'No projects found for this user'}), 404
        
        # Return the project metadata
        return jsonify({
            'project': {
                'id': recent_project.id,
                'title': recent_project.name,
                'description': recent_project.description,
                'created_at': recent_project.created_at.isoformat(),
                'updated_at': recent_project.updated_at.isoformat(),
                'success': True
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error retrieving recent project: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@projects_bp.route('', methods=['GET'])
@require_auth
def get_all_projects(user_info):
    print("Fetching all projects for user")
    """Get all projects for the authenticated user"""
    try:
        # Find all projects for this user
        projects = Project.query.filter_by(owner_id=user_info.get("user_id")) \
                          .order_by(Project.updated_at.desc()) \
                          .all()
        
        # Format the projects as a list of dictionaries
        project_list = []
        for project in projects:
            # Include shared groups information for THIS specific project
            shared_groups = [
                {
                    'id': group.id,
                    'name': group.name,
                    'external_id': group.external_id
                } for group in project.shared_groups
            ]
            
            # Add this project with its specific shared groups
            project_list.append({
                'id': project.id,
                'title': project.name,
                'description': project.description,
                'created_at': project.created_at.isoformat(),
                'updated_at': project.updated_at.isoformat(),
                'thumbnail_url': f'/backend/api/projects/{project.id}/thumbnail',
                'is_published': project.is_published,
                'shared_with_groups': shared_groups  # Now using the correct shared_groups for each project
            })
            
            print(f"Project {project.id} shared with groups: {shared_groups}")
        
        return jsonify({
            'projects': project_list,
            'count': len(project_list),
            'success': True
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error retrieving projects: {str(e)}")
        return jsonify({'error': str(e)}), 500
    

@projects_bp.route('/<project_id>', methods=['DELETE'])
@require_auth
def delete_project(user_info, project_id):
    """Delete a project"""
    try:
        # Get the current user from request
        user = request.user
        
        # Find the project
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
            
        # Check ownership
        if project.owner_id != user.id:
            return jsonify({'error': 'You do not have permission to delete this project'}), 403
        
        # Delete the project file if it exists
        if project.sb3_file_path and os.path.exists(project.sb3_file_path):
            try:
                os.remove(project.sb3_file_path)
                current_app.logger.info(f"Project file deleted: {project.sb3_file_path}")
            except OSError as e:
                current_app.logger.warning(f"Could not delete project file: {project.sb3_file_path}, {str(e)}")
        # Delete the project thumbnail if it exists
        if project.thumbnail_path and os.path.exists(project.thumbnail_path):
            try:
                os.remove(project.thumbnail_path)
                current_app.logger.info(f"Project thumbnail deleted: {project.thumbnail_path}")
            except OSError as e:
                current_app.logger.warning(f"Could not delete project thumbnail: {project.thumbnail_path}, {str(e)}")
        
        # Delete the project from the database
        db.session.delete(project)
        db.session.commit()
        
        current_app.logger.info(f"Project deleted: {project_id} by {user.username}")
        
        return jsonify({
            'success': True,
            'message': 'Project successfully deleted',
            'id': project_id
        }), 200
            
    except Exception as e:
        current_app.logger.error(f"Error deleting project: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@projects_bp.route('/<int:project_id>/share', methods=['POST'])
@require_auth
def share_project_with_groups(user_info, project_id):
    """Share a project with specified groups"""
    try:
        # Get the project
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
            
        # Check if user is the project owner
        if project.owner_id != user_info['user_id']:
            return jsonify({'error': 'You can only share projects that you own'}), 403
            
        # Get request data
        data = request.get_json()
        if not data or 'group_ids' not in data:
            return jsonify({'error': 'Missing group_ids parameter'}), 400
            
        # Get group IDs from request
        group_ids = data['group_ids']
        if group_ids:
            project.is_published = True
        else:
            project.is_published = False
        
        # Clear existing group associations
        project.shared_groups = []
        db.session.flush()
        
        # Add new group associations
        if group_ids and len(group_ids) > 0:
            # Verify that user is a member of these groups
            user = User.query.get(user_info['user_id'])
            user_groups = [g.id for g in user.groups]
            
            # Filter to only include groups the user is a member of
            valid_group_ids = [gid for gid in group_ids if gid in user_groups]
            
            # Add groups to project's shared_groups
            if valid_group_ids:
                groups = Group.query.filter(Group.id.in_(valid_group_ids)).all()
                project.shared_groups = groups
        
        # Update project
        project.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        
        # Return updated project info
        result = {
            'id': project.id,
            'title': project.name,
            'shared_with_groups': [
                {
                    'id': group.id,
                    'name': group.name,
                    'external_id': group.external_id
                } for group in project.shared_groups
            ]
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        current_app.logger.error(f"Error sharing project: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@projects_bp.route('/shared', methods=['GET'])
@require_auth
def get_shared_projects(user_info):
    """Get all projects shared with the authenticated user via groups"""
    try:
        # Get the current user
        user = User.query.get(user_info.get('user_id'))
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Get all groups the user is a member of
        user_groups = user.groups
        if not user_groups:
            return jsonify({
                'projects': [],
                'count': 0,
                'success': True
            }), 200
            
        # Get IDs of all the user's groups
        user_group_ids = [group.id for group in user_groups]
        
        # Find projects shared with any of these groups
        # We need to use a more complex query to get projects shared with the user's groups
        # that aren't owned by the user
        shared_projects = (Project.query
            .join(project_groups, Project.id == project_groups.c.project_id)
            .filter(project_groups.c.group_id.in_(user_group_ids))
            .filter(Project.owner_id != user.id)  # Exclude projects owned by the user
            .filter(Project.is_published == True)  # Only include published projects
            .order_by(Project.updated_at.desc())
            .distinct()
            .all())
        
        # Format projects for response
        project_list = []
        for project in shared_projects:
            # Get owner information
            owner = User.query.get(project.owner_id)
            owner_info = {
                'id': owner.id,
                'username': owner.username
            } if owner else {'id': None, 'username': 'Unknown'}
            
            # Include shared groups information
            shared_groups = [
                {
                    'id': group.id,
                    'name': group.name,
                    'external_id': group.external_id
                } for group in project.shared_groups if group.id in user_group_ids
            ]
            
            project_list.append({
                'id': project.id,
                'title': project.name,
                'description': project.description,
                'created_at': project.created_at.isoformat(),
                'updated_at': project.updated_at.isoformat(),
                'thumbnail_url': f'/backend/api/projects/{project.id}/thumbnail',
                'owner': owner_info,
                'is_published': project.is_published,
                'shared_with_groups': shared_groups
            })
        
        current_app.logger.info(f"Found {len(project_list)} projects shared with user {user.id}")
        
        return jsonify({
            'projects': project_list,
            'count': len(project_list),
            'success': True
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error retrieving shared projects: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@projects_bp.route('/<int:project_id>/copy', methods=['POST'])
@require_auth
def copy_project(user_info, project_id):
    """Create a copy of an existing project for the authenticated user"""
    try:
        # Get the original project
        original_project = Project.query.get(project_id)
        if not original_project:
            return jsonify({'error': 'Project not found'}), 404
            
        # Check if user has access to the project
        current_user = User.query.get(user_info.get('user_id'))
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
            
        # Check if user can access this project
        can_access = False
        
        # User owns the project
        if original_project.owner_id == current_user.id:
            can_access = True
        
        # Project is shared with user's groups
        if not can_access and original_project.is_published:
            user_group_ids = {group.id for group in current_user.groups}
            project_group_ids = {group.id for group in original_project.shared_groups}
            
            if user_group_ids.intersection(project_group_ids):
                can_access = True
        
        if not can_access:
            return jsonify({'error': 'You do not have permission to copy this project'}), 403
        
        # Create a new project record
        new_project = Project(
            name=f"Copy of {original_project.name}",
            description=original_project.description,
            owner_id=current_user.id,
            is_published=False  # New copies are not published by default
        )
        
        db.session.add(new_project)
        db.session.flush()  # Get ID without committing
        
        # Copy the project file if it exists
        if original_project.sb3_file_path:
            # Create paths
            upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'projects')
            os.makedirs(upload_folder, exist_ok=True)
            # Generate a secure filename with timestamp
            new_filename = secure_filename(f"{new_project.id}_{current_user.id}.sb3")
            # Generate a new filename
            new_file_path = os.path.join(upload_folder, new_filename)
            
            # Copy the file
            shutil.copy2(original_project.sb3_file_path, new_file_path)
            new_project.sb3_file_path = new_file_path
        
        # Copy the thumbnail if it exists
        if original_project.thumbnail_path and os.path.exists(original_project.thumbnail_path):
            # Create paths
            thumbnail_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'thumbnails')
            os.makedirs(thumbnail_folder, exist_ok=True)
            
            # Generate a new filename
            new_thumbnail_name = secure_filename(f"thumb_{current_user.id}_{new_project.id}.png")
            new_thumbnail_path = os.path.join(thumbnail_folder, new_thumbnail_name)
            
            # Copy the thumbnail
            shutil.copy2(original_project.thumbnail_path, new_thumbnail_path)
            new_project.thumbnail_path = new_thumbnail_path
        
        # Set timestamps
        new_project.created_at = datetime.now(timezone.utc)
        new_project.updated_at = datetime.now(timezone.utc)
        
        # Commit to the database
        db.session.commit()
        
        current_app.logger.info(f"Project {project_id} copied to new project {new_project.id} by user {current_user.id}")
        
        # Return the new project data
        return jsonify({
            'id': new_project.id,
            'title': new_project.name,
            'description': new_project.description,
            'created_at': new_project.created_at.isoformat(),
            'updated_at': new_project.updated_at.isoformat(),
            'thumbnail_url': f'/backend/api/projects/{new_project.id}/thumbnail',
            'success': True
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error copying project: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500