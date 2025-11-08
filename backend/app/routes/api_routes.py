from flask import Blueprint, request, jsonify, current_app
from app.models.oauth_session import OAuthSession
from app.models.users import User
from app.models.groups import Group
from werkzeug.exceptions import Unauthorized
from functools import wraps
from app.middlewares.auth import require_auth
from datetime import datetime
from app import db

api_bp = Blueprint('api', __name__)

@api_bp.route('/user', methods=['GET'])
@require_auth
def get_user(user):  # Accept the user parameter from require_auth
    """Get current user information"""
    
    return jsonify({
        'user': user
    })

@api_bp.route('/users', methods=['GET'])
@require_auth
def get_users(user_info):
    """
    Get all users that share at least one group with the current user
    
    Query Parameters:
        collab_id (optional): Filter out users who already have access to this collaborative project
    """
    try:
        # Get current user
        current_user = User.query.get(user_info['user_id'])
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get all group IDs the current user belongs to
        user_group_ids = [group.id for group in current_user.groups]
        
        if not user_group_ids:
            return jsonify({'users': [], 'count': 0}), 200
        
        # Query users who share at least one group with current user
        user_ids = db.session.query(User.id)\
            .join(User.groups)\
            .filter(Group.id.in_(user_group_ids))\
            .filter(User.id != current_user.id)\
            .distinct()\
            .all()
        
        # Extract IDs from tuples
        user_ids = [uid[0] for uid in user_ids]
        
        # ✅ NEW: Filter out users who already have access to collaborative project
        collab_id = request.args.get('collab_id', type=int)
        
        if collab_id:
            from app.models.projects import CollaborativeProject, CollaborativeProjectPermission
            
            # Get collaborative project
            collab_project = CollaborativeProject.query.get(collab_id)
            
            if collab_project:
                # Get all users who already have access
                existing_user_ids = set()
                
                # 1. Add owner
                existing_user_ids.add(collab_project.created_by)
                
                # 2. Add users with direct permissions
                direct_perms = CollaborativeProjectPermission.query.filter_by(
                    collaborative_project_id=collab_id,
                    group_id=None  # Only direct user permissions
                ).all()
                
                for perm in direct_perms:
                    if perm.user_id:
                        existing_user_ids.add(perm.user_id)
                
                # 3. Add users from group permissions
                group_perms = CollaborativeProjectPermission.query.filter(
                    CollaborativeProjectPermission.collaborative_project_id == collab_id,
                    CollaborativeProjectPermission.group_id.isnot(None)
                ).all()
                
                for perm in group_perms:
                    if perm.group:
                        for member in perm.group.members:
                            existing_user_ids.add(member.id)
                
                # Filter out users who already have access
                user_ids = [uid for uid in user_ids if uid not in existing_user_ids]
                
                current_app.logger.info(
                    f"Filtered users for collab_id {collab_id}: "
                    f"{len(existing_user_ids)} excluded, {len(user_ids)} remaining"
                )
        
        # Now query full user objects
        users = User.query\
            .filter(User.id.in_(user_ids))\
            .order_by(User.username)\
            .all()
        
        # Format user data
        user_list = []
        for user in users:
            common_groups = [
                {'id': group.id, 'name': group.name}
                for group in user.groups
                if group.id in user_group_ids
            ]
            
            user_list.append({
                'id': user.id,
                'username': user.username,
                'email': user.email if hasattr(user, 'email') else None,
                'common_groups': common_groups,
                'role': user.role if hasattr(user, 'role') else None
            })
        
        return jsonify({
            'users': user_list,
            'count': len(user_list),
            'filtered_by_collab': collab_id is not None
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching users: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@api_bp.route('/status', methods=['GET'])
def api_status():
    """Check API status"""
    """Simple endpoint to check if the backend is online"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat()
    }), 200

@api_bp.route('/groups', methods=['GET'])
@require_auth
def get_user_groups(user_info):
    """Get all groups that the authenticated user is a member of"""
    try:
        user = User.query.get(user_info['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Get the groups the user belongs to
        groups = []
        for group in user.groups:
            groups.append({
                'id': group.id,
                'name': group.name,
                'external_id': group.external_id,
                'description': group.description
            })
            
        return jsonify({'groups': groups}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error retrieving user groups: {str(e)}")
        return jsonify({'error': str(e)}), 500