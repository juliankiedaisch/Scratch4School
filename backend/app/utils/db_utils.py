"""Database utility functions including retry logic for transient errors"""
import time
import logging
from functools import wraps
from sqlalchemy.exc import OperationalError, DatabaseError, IntegrityError
from flask import current_app

def db_retry(max_attempts=3, initial_backoff=0.1):
    """
    Decorator for automatic retry on database errors with exponential backoff.
    
    Args:
        max_attempts: Maximum number of retry attempts (default: 3)
        initial_backoff: Initial backoff time in seconds (default: 0.1)
    
    Catches:
        - OperationalError: Database connection/execution issues
        - DatabaseError: General database errors
        - IntegrityError: Constraint violations (retried in case of race conditions)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            backoff = initial_backoff
            
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except (OperationalError, DatabaseError, IntegrityError) as e:
                    last_exception = e
                    
                    # Log the retry attempt
                    logger = current_app.logger if current_app else logging.getLogger(__name__)
                    logger.warning(
                        f"Database error in {func.__name__} (attempt {attempt}/{max_attempts}): {str(e)}"
                    )
                    
                    # Don't retry on the last attempt
                    if attempt < max_attempts:
                        time.sleep(backoff)
                        backoff *= 2  # Exponential backoff
                    else:
                        logger.error(
                            f"All {max_attempts} attempts failed for {func.__name__}: {str(e)}"
                        )
            
            # If we get here, all retries failed
            raise last_exception
        
        return wrapper
    return decorator
