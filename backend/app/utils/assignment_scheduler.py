"""
Assignment scheduler utilities
Handles automatic freezing of assignments based on due dates
"""
from app import db
from app.models.assignments import Assignment
from app.models.projects import CollaborativeProject
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


def check_and_freeze_overdue_assignments():
    """
    Check all assignments with auto_freeze_on_due=True and freeze submissions
    that are past their due date
    """
    try:
        now = datetime.now(timezone.utc)
        
        # Find all assignments that should auto-freeze and have a due date
        assignments = Assignment.query.filter(
            Assignment.auto_freeze_on_due == True,
            Assignment.due_date.isnot(None),
            Assignment.deleted_at.is_(None)
        ).all()
        
        frozen_count = 0
        
        for assignment in assignments:
            due_date = assignment.due_date
            # Ensure due_date is timezone-aware
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)
            
            # Check if due date has passed
            if now > due_date:
                # Freeze all unfrozen submissions for this assignment
                for submission in assignment.submissions:
                    collab_project = submission.collaborative_project
                    
                    if collab_project and not collab_project.is_frozen():
                        # Freeze the project
                        collab_project.freeze_for_assignment(
                            submission.user_id,
                            assignment.id
                        )
                        frozen_count += 1
                        logger.info(
                            f"Auto-frozen project {collab_project.id} for assignment {assignment.id} "
                            f"(due date: {due_date})"
                        )
                assignment.auto_freeze_on_due = False  # Prevent re-checking
        
        if frozen_count > 0:
            db.session.commit()
            logger.info(f"Auto-freeze check complete: {frozen_count} projects frozen")
        
        return frozen_count
        
    except Exception as e:
        logger.error(f"Error in auto-freeze check: {str(e)}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return 0
