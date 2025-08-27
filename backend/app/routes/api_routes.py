from flask import Blueprint, request, jsonify, current_app
from app.models.oauth_session import OAuthSession
from app.models.users import User
from werkzeug.exceptions import Unauthorized
from functools import wraps
from app.middlewares.auth import require_auth
from datetime import datetime

api_bp = Blueprint('api', __name__)

@api_bp.route('/user', methods=['GET'])
@require_auth
def get_user(user):  # Accept the user parameter from require_auth
    """Get current user information"""
    
    return jsonify({
        'user': user
    })

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