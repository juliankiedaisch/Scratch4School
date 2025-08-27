from flask import Blueprint, request, jsonify, current_app, send_file
from app import db
from app.models.asset import Asset
from app.middlewares.auth import require_auth
from datetime import datetime, timezone
import os
from werkzeug.utils import secure_filename
import hashlib

assets_bp = Blueprint('assets', __name__)

@assets_bp.route('/', methods=['POST'])
@require_auth
def create_asset(user_info):
    """Create/upload a new asset (costume, sound, etc.)"""
    try:
        # Get the current user from request
        user = request.user
        
        # Check if the post has the file part
        if 'asset' not in request.files:
            return jsonify({'error': 'No asset file provided'}), 400
            
        asset_file = request.files['asset']
        asset_type = request.form.get('type', 'unknown')  # costume, sound, etc.
        data_format = request.form.get('format', '')  # svg, png, wav, etc.
        
        # If user does not select a file, the browser submits an empty file without a filename
        if asset_file.filename == '':
            return jsonify({'error': 'No asset selected'}), 400
            
        if asset_file:
            # Read the file data
            file_data = asset_file.read()
            
            # Calculate MD5 hash of file data
            md5hash = hashlib.md5(file_data).hexdigest()
            
            # Check if asset with this hash already exists
            existing_asset = Asset.query.filter_by(md5=md5hash).first()
            if existing_asset:
                return jsonify({
                    'status': 'ok',
                    'assetId': existing_asset.asset_id
                }), 200
            
            # Make a secure filename with the hash
            filename = secure_filename(f"{md5hash}.{data_format}")
            upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], asset_type)
            
            # Create directory if it doesn't exist
            os.makedirs(upload_folder, exist_ok=True)
            
            file_path = os.path.join(upload_folder, filename)
            
            # Write the file
            with open(file_path, 'wb') as f:
                f.write(file_data)
            
            # Create asset record in database
            asset = Asset(
                asset_id=md5hash,
                asset_type=asset_type,
                data_format=data_format,
                size=len(file_data),
                md5=md5hash,
                owner_id=user.id,
                file_path=file_path
            )
            
            db.session.add(asset)
            db.session.commit()
            
            return jsonify({
                'status': 'ok',
                'assetId': md5hash
            }), 200
            
    except Exception as e:
        current_app.logger.error(f"Error creating asset: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@assets_bp.route('/<asset_id>.<format>', methods=['GET'])
def get_asset_with_format(asset_id, format):
    """Backward compatible route that redirects to the main asset route"""
    # Just redirect to the main asset route
    return get_asset_by_id(asset_id)
    
@assets_bp.route('/<asset_id>', methods=['GET'])
def get_asset_by_id(asset_id):
    """Get an asset by ID with appropriate MIME type detection"""
    try:
        # Find the asset in database
        asset = Asset.query.filter_by(asset_id=asset_id).first()
        
        if not asset:
            return jsonify({'error': 'Asset not found'}), 404
        
        # Determine the correct MIME type based on asset type and data format
        mime_type = None
        
        if asset.asset_type == 'sprite':
            mime_type = 'application/zip'
        elif asset.asset_type == 'costume':
            # Map common image formats
            format_map = {
                'svg': 'image/svg+xml',
                'png': 'image/png',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'bmp': 'image/bmp',
                'gif': 'image/gif'
            }
            mime_type = format_map.get(asset.data_format.lower(), 'application/octet-stream')
        elif asset.asset_type == 'sound':
            # Map common audio formats
            format_map = {
                'mp3': 'audio/mpeg',
                'wav': 'audio/wav',
                'x-wav': 'audio/x-wav',
                'ogg': 'audio/ogg'
            }
            mime_type = format_map.get(asset.data_format.lower(), 'audio/mpeg')
        elif asset.asset_type == 'script':
            mime_type = 'application/json'
        elif asset.asset_type == 'thumbnail':
            mime_type = 'image/jpeg'
        else:
            # Default to octet-stream for unknown types
            mime_type = 'application/octet-stream'
            
        # Return the asset file with correct MIME type
        return send_file(
            asset.file_path,
            mimetype=mime_type
        )
        
    except Exception as e:
        current_app.logger.error(f"Error retrieving asset: {str(e)}")
        return jsonify({'error': str(e)}), 500
