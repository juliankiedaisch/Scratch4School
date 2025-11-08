from app import db
from datetime import datetime, timezone


class Group(db.Model):
    """Group model for user communities - synced from OAuth provider"""
    __tablename__ = 'groups'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    external_id = db.Column(db.String(255), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Many-to-many relationship with users
    members = db.relationship('User', secondary='user_groups', back_populates='groups')
    
    # ❌ REMOVED: Old project sharing (deprecated)
    # projects = db.relationship('Project', secondary='project_groups', back_populates='shared_groups')
    
    # ❌ REMOVED: Old collaborative_projects relationship (no more group_id on CollaborativeProject)
    # collaborative_projects = db.relationship('CollaborativeProject', back_populates='group')
    
    def __repr__(self):
        return f'<Group {self.name} ({self.external_id})>'
    
    def to_dict(self, include_members=False, include_projects=False):
        """
        Convert group to dictionary
        
        Args:
            include_members: Include list of member users
            include_projects: Include list of collaborative projects accessible via permissions
        """
        data = {
            'id': self.id,
            'name': self.name,
            'external_id': self.external_id,
            'description': self.description,
            'created_at': self.created_at.isoformat()
        }
        
        if include_members:
            data['members'] = [{
                'id': member.id,
                'username': member.username
            } for member in self.members]
            data['member_count'] = len(self.members)
        
        if include_projects:
            # ✅ NEW: Get projects via permission system
            accessible_projects = self.get_accessible_collaborative_projects()
            
            data['collaborative_projects'] = [{
                'id': proj.id,
                'name': proj.name,
                'latest_commit_id': proj.latest_commit_id,
                'permission': proj.get('permission')
            } for proj in accessible_projects]
            data['project_count'] = len(accessible_projects)
        
        return data
    
    @classmethod
    def get_or_create(cls, external_id, name, description=None):
        """Get existing group or create new one based on external ID with proper locking"""
        group = cls.query.filter_by(external_id=external_id).with_for_update().first()
        
        if not group:
            group = cls(
                external_id=external_id,
                name=name,
                description=description
            )
            db.session.add(group)
            db.session.flush()
            
        return group
    
    def has_member(self, user):
        """Check if user is a member of this group"""
        return user in self.members
    
    # ============================================================
    # NEW: Permission-based project access
    # ============================================================
    
    def get_accessible_collaborative_projects(self):
        """
        Get all collaborative projects this group has access to (via permissions)
        
        Returns: List of dicts with CollaborativeProject and permission level
        """
        from app.models.projects import CollaborativeProjectPermission, CollaborativeProject
        
        # Get all permissions for this group
        permissions = CollaborativeProjectPermission.query.filter_by(
            group_id=self.id
        ).all()
        
        result = []
        for perm in permissions:
            if not perm.collaborative_project.is_deleted:
                result.append({
                    'collaborative_project': perm.collaborative_project,
                    'permission': perm.permission.value,
                    'granted_at': perm.granted_at
                })
        
        return result
    
    def get_collaborative_projects_for_user(self, user):
        """
        Get all collaborative projects this user can access via this group
        ✅ Uses permission system
        
        Args:
            user: User object
        
        Returns: List of CollaborativeProject objects
        """
        if not self.has_member(user):
            return []
        
        from app.models.projects import CollaborativeProjectPermission
        
        # Get all permissions for this group
        permissions = CollaborativeProjectPermission.query.filter_by(
            group_id=self.id
        ).all()
        
        projects = []
        for perm in permissions:
            if not perm.collaborative_project.is_deleted:
                projects.append(perm.collaborative_project)
        
        return projects
    
    def has_access_to_project(self, collaborative_project):
        """
        Check if this group has any access to a collaborative project
        
        Args:
            collaborative_project: CollaborativeProject object or ID
        
        Returns: Boolean
        """
        from app.models.projects import CollaborativeProjectPermission, CollaborativeProject
        
        # Get project ID
        if isinstance(collaborative_project, int):
            project_id = collaborative_project
        else:
            project_id = collaborative_project.id
        
        # Check if permission exists
        permission = CollaborativeProjectPermission.query.filter_by(
            collaborative_project_id=project_id,
            group_id=self.id
        ).first()
        
        return permission is not None
    
    def get_permission_for_project(self, collaborative_project):
        """
        Get this group's permission level for a collaborative project
        
        Args:
            collaborative_project: CollaborativeProject object or ID
        
        Returns: PermissionLevel enum or None
        """
        from app.models.projects import CollaborativeProjectPermission, CollaborativeProject
        
        # Get project ID
        if isinstance(collaborative_project, int):
            project_id = collaborative_project
        else:
            project_id = collaborative_project.id
        
        # Get permission
        permission = CollaborativeProjectPermission.query.filter_by(
            collaborative_project_id=project_id,
            group_id=self.id
        ).first()
        
        return permission.permission if permission else None
    
    def get_members_count(self):
        """Get number of members in this group"""
        return len(self.members)
    
    def get_projects_count(self):
        """Get number of collaborative projects accessible to this group"""
        from app.models.projects import CollaborativeProjectPermission
        
        return CollaborativeProjectPermission.query.filter_by(
            group_id=self.id
        ).count()