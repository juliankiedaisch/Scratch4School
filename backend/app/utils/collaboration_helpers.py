from app.models.projects import Project
from app.models.project_collaborator import ProjectCollaborator
from app.models.project_version import ProjectVersion
from sqlalchemy import func
from app import db

def check_project_permission(project, user_id, required_permission='view'):
    """
    Check if user has required permission for project
    
    Args:
        project: Project instance
        user_id: User ID to check
        required_permission: 'view', 'edit', or 'admin'
    
    Returns:
        tuple: (can_access: bool, permission_level: str|None)
    """
    # Owner always has all permissions
    if project.owner_id == user_id:
        return True, 'owner'
    
    # Not collaborative = only owner can access
    if not project.is_collaborative:
        return False, None
    
    # Check collaborator permissions
    collaborator = ProjectCollaborator.query.filter_by(
        project_id=project.id,
        user_id=user_id
    ).first()
    
    if not collaborator:
        return False, None
    
    # Permission hierarchy: view < edit < admin
    permission_levels = {'view': 1, 'edit': 2, 'admin': 3}
    required_level = permission_levels.get(required_permission, 1)
    user_level = permission_levels.get(collaborator.permission, 0)
    
    return user_level >= required_level, collaborator.permission


def get_next_version_number(project_id):
    """
    Get the next version number for a project
    
    Args:
        project_id: Project ID
    
    Returns:
        int: Next version number
    """
    max_version = db.session.query(func.max(ProjectVersion.version_number))\
        .filter(ProjectVersion.project_id == project_id)\
        .scalar()
    
    return (max_version or 0) + 1


def create_initial_version(project, user_id, commit_message="Initial version"):
    """
    Create initial version when converting a project to collaborative
    
    Args:
        project: Project instance
        user_id: User ID creating the version
        commit_message: Optional commit message
    
    Returns:
        ProjectVersion: Created version
    """
    if not project.sb3_file_path:
        raise ValueError("Project has no file to create initial version from")
    
    version = ProjectVersion(
        project_id=project.id,
        version_number=1,
        sb3_file_path=project.sb3_file_path,
        thumbnail_path=project.thumbnail_path,
        author_id=user_id,
        parent_version_id=None,
        commit_message=commit_message
    )
    
    db.session.add(version)
    db.session.flush()  # Get the ID without committing
    
    # Update project's current_version_id
    project.current_version_id = version.id
    
    return version


def can_edit_commit_message(version, user_id):
    """
    Check if user can edit a commit message
    Only the author can edit their own commit messages
    
    Args:
        version: ProjectVersion instance
        user_id: User ID to check
    
    Returns:
        bool: True if user can edit
    """
    return version.author_id == user_id