"""
SB3 file validation utilities.
Provides functions to validate Scratch 3 project files.
"""

import zipfile
import json
import os
from io import BytesIO


# Minimum expected size for a valid SB3 file (in bytes)
# A minimal valid Scratch project is typically > 1KB
MIN_SB3_SIZE = 1000


def is_valid_sb3(file_path_or_data):
    """
    Validate that a file is a valid SB3 (Scratch 3) project file.
    
    SB3 files are ZIP archives containing at least:
    - project.json: The project data
    
    Args:
        file_path_or_data: Either a file path string or bytes/BytesIO of SB3 data
        
    Returns:
        tuple: (is_valid: bool, error_message: str or None)
    """
    try:
        # Handle both file paths and binary data
        if isinstance(file_path_or_data, str):
            # It's a file path
            if not os.path.exists(file_path_or_data):
                return False, f"File does not exist: {file_path_or_data}"
            
            file_size = os.path.getsize(file_path_or_data)
            if file_size < MIN_SB3_SIZE:
                return False, f"File too small ({file_size} bytes). Minimum expected: {MIN_SB3_SIZE} bytes"
            
            with open(file_path_or_data, 'rb') as f:
                file_data = BytesIO(f.read())
        elif isinstance(file_path_or_data, bytes):
            if len(file_path_or_data) < MIN_SB3_SIZE:
                return False, f"Data too small ({len(file_path_or_data)} bytes). Minimum expected: {MIN_SB3_SIZE} bytes"
            file_data = BytesIO(file_path_or_data)
        elif isinstance(file_path_or_data, BytesIO):
            file_data = file_path_or_data
            file_data.seek(0, 2)  # Seek to end
            size = file_data.tell()
            file_data.seek(0)  # Seek back to start
            if size < MIN_SB3_SIZE:
                return False, f"Data too small ({size} bytes). Minimum expected: {MIN_SB3_SIZE} bytes"
        else:
            # Try to read from file-like object (like werkzeug FileStorage)
            file_data = BytesIO(file_path_or_data.read())
            file_path_or_data.seek(0)  # Reset position for later use
            
            if len(file_data.getvalue()) < MIN_SB3_SIZE:
                return False, f"Data too small ({len(file_data.getvalue())} bytes). Minimum expected: {MIN_SB3_SIZE} bytes"
        
        # Try to open as ZIP
        try:
            with zipfile.ZipFile(file_data, 'r') as zf:
                # Check for required file
                if 'project.json' not in zf.namelist():
                    return False, "SB3 file missing project.json"
                
                # Try to read and parse project.json
                try:
                    project_json = zf.read('project.json')
                    project_data = json.loads(project_json.decode('utf-8'))
                    
                    # Basic structure validation
                    if not isinstance(project_data, dict):
                        return False, "project.json is not a valid JSON object"
                    
                    # Check for essential keys
                    if 'targets' not in project_data:
                        return False, "project.json missing 'targets' array"
                    
                    if not isinstance(project_data['targets'], list):
                        return False, "project.json 'targets' is not an array"
                    
                except json.JSONDecodeError as e:
                    return False, f"project.json is not valid JSON: {e}"
                    
        except zipfile.BadZipFile:
            return False, "File is not a valid ZIP archive"
        
        return True, None
        
    except Exception as e:
        return False, f"Validation error: {str(e)}"


def validate_sb3_file(file_path, logger=None):
    """
    Validate an SB3 file and log warnings if invalid.
    
    Args:
        file_path: Path to the SB3 file
        logger: Optional logger instance for warnings
        
    Returns:
        bool: True if valid, False if invalid
    """
    is_valid, error = is_valid_sb3(file_path)
    
    if not is_valid:
        if logger:
            logger.warning(f"Invalid SB3 file at {file_path}: {error}")
        return False
    
    return True


def get_sb3_info(file_path_or_data):
    """
    Get information about an SB3 file.
    
    Args:
        file_path_or_data: Either a file path string or bytes/BytesIO of SB3 data
        
    Returns:
        dict: Information about the SB3 file, or None if invalid
    """
    is_valid, error = is_valid_sb3(file_path_or_data)
    
    if not is_valid:
        return None
    
    try:
        if isinstance(file_path_or_data, str):
            with open(file_path_or_data, 'rb') as f:
                file_data = BytesIO(f.read())
        elif isinstance(file_path_or_data, bytes):
            file_data = BytesIO(file_path_or_data)
        else:
            file_data = file_path_or_data
            if hasattr(file_data, 'seek'):
                file_data.seek(0)
        
        with zipfile.ZipFile(file_data, 'r') as zf:
            project_json = zf.read('project.json')
            project_data = json.loads(project_json.decode('utf-8'))
            
            return {
                'targets_count': len(project_data.get('targets', [])),
                'monitors_count': len(project_data.get('monitors', [])),
                'extensions': project_data.get('extensions', []),
                'meta': project_data.get('meta', {}),
                'file_count': len(zf.namelist()),
                'files': zf.namelist()[:10]  # First 10 files
            }
    except Exception:
        return None
