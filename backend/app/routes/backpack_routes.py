from flask import Blueprint, request, jsonify, current_app, url_for
from app import db
from app.models.backpack import BackpackItem
from app.models.users import User
from app.models.asset import Asset
from app.middlewares.auth import require_auth
import base64
import os
import uuid
from werkzeug.utils import secure_filename
import hashlib

backpack_bp = Blueprint('backpack', __name__)

def get_base_url():
    """Get the base URL for constructing asset URLs"""
    if request.headers.get('X-Forwarded-Proto') and request.headers.get('X-Forwarded-Host'):
        return f"{request.headers.get('X-Forwarded-Proto')}://{request.headers.get('X-Forwarded-Host')}"
    return request.host_url.rstrip('/')

@backpack_bp.route('', methods=['GET'])
@require_auth
def get_backpack_contents(user_info):
    """Get backpack items for a user"""
    try:
            
        # Get pagination parameters
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
        
        # Query backpack items
        items = BackpackItem.query.filter_by(owner_id=user_info['user_id']) \
                                 .order_by(BackpackItem.updated_at.desc()) \
                                 .limit(limit) \
                                 .offset(offset) \
                                 .all()
                                 
        # Get total count for pagination
        total_count = BackpackItem.query.filter_by(owner_id=user_info['user_id']).count()
        
        # Convert items to dictionaries with full URLs
        base_url = get_base_url()
        items_data = [item.to_dict() for item in items]
        
        # Check if there are more items available
        has_more = (offset + len(items)) < total_count
        
        return jsonify({
            'items': items_data,
            'offset': offset,
            'limit': limit,
            'total': total_count,
            'hasMore': has_more
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting backpack contents: {str(e)}")
        return jsonify({'error': str(e)}), 500

@backpack_bp.route('', methods=['POST'])
@require_auth
def save_backpack_item(user_info):
    """Save an item to the backpack"""
    try:
            
        # Get request data
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        # Check required fields
        required_fields = ['type', 'mime', 'name', 'body', 'thumbnail']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
                
        # Store the body asset
        body_asset_id = store_asset_data(data['body'], check_asset_mime_type(data['mime']), data['type'], user_info['user_id'])
        
        # Store the thumbnail asset
        thumbnail_asset_id = store_asset_data(
            data['thumbnail'], 
            'image/jpeg', 
            'thumbnail', 
            user_info['user_id']
        )
        
        # Create new backpack item
        backpack_item = BackpackItem(
            type=data['type'],
            name=data['name'],
            mime=check_asset_mime_type(data['mime']),
            body=body_asset_id,
            thumbnail=thumbnail_asset_id,
            owner_id=user_info['user_id']
        )
        
        db.session.add(backpack_item)
        db.session.commit()
        
        # Return the created item with full URLs
        base_url = get_base_url()
        return jsonify(backpack_item.to_dict()), 200
        
    except Exception as e:
        current_app.logger.error(f"Error saving backpack item: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@backpack_bp.route('/<item_id>', methods=['DELETE'])
@require_auth
def delete_backpack_item(user_info, item_id):
    """Delete an item from the backpack"""
    try:
            
        # Find the backpack item
        backpack_item = BackpackItem.query.filter_by(id=item_id, owner_id=user_info['user_id']).first()
        if not backpack_item:
            return jsonify({'error': 'Item not found or you do not have permission to delete it'}), 404
            
        # Delete the item
        db.session.delete(backpack_item)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Backpack item deleted successfully',
            'id': item_id
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting backpack item: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def store_asset_data(base64_data, mime_type, asset_type, user_id):
    """Store asset data and return the asset ID"""
    try:
        # Remove potential data URL prefix
        if ',' in base64_data:
            base64_data = base64_data.split(',', 1)[1]
            
        # Decode base64 data
        file_data = base64.b64decode(base64_data)
        
        # Calculate MD5 hash
        md5hash = hashlib.md5(file_data).hexdigest()
        
        # Check if asset with this hash already exists
        existing_asset = Asset.query.filter_by(md5=md5hash).first()
        if existing_asset:
            return existing_asset.asset_id
            
        # Determine file extension based on mime type
        extension = mime_type.split('/')[-1]
        if extension == 'jpeg':
            extension = 'jpg'
            
        # Generate filename with hash
        filename = secure_filename(f"{md5hash}.{extension}")
        upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], asset_type)
        
        # Create directory if it doesn't exist
        os.makedirs(upload_folder, exist_ok=True)
        
        # Write file to disk
        file_path = os.path.join(upload_folder, filename)
        with open(file_path, 'wb') as f:
            f.write(file_data)
            
        # Create asset record
        asset = Asset(
            asset_id=md5hash,
            asset_type=asset_type,
            data_format=extension,
            size=len(file_data),
            md5=md5hash,
            owner_id=user_id,
            file_path=file_path
        )
        
        db.session.add(asset)
        db.session.commit()
        
        return md5hash
        
    except Exception as e:
        current_app.logger.error(f"Error storing asset data: {str(e)}")
        db.session.rollback()
        raise


def check_asset_mime_type(mime_type):
    if mime_type=='audio/x-wav':
        return 'audio/wav'
    return mime_type