"""
Date and time utility functions for consistent datetime handling.
"""
from datetime import datetime, timezone


def to_iso_string(dt):
    """
    Convert a datetime object to ISO 8601 format with UTC timezone indicator.
    
    Args:
        dt: datetime object (should be timezone-aware UTC datetime)
        
    Returns:
        str: ISO 8601 formatted string with 'Z' suffix (e.g., '2024-01-15T10:30:00Z')
        None: if dt is None
    """
    if dt is None:
        return None
    
    # Ensure the datetime is timezone-aware and in UTC
    if dt.tzinfo is None:
        # If naive datetime, assume it's UTC
        dt = dt.replace(tzinfo=timezone.utc)
    elif dt.tzinfo != timezone.utc:
        # Convert to UTC if in different timezone
        dt = dt.astimezone(timezone.utc)
    
    # Return ISO format with 'Z' suffix to indicate UTC
    return dt.isoformat().replace('+00:00', 'Z')
