from app import db
from datetime import datetime, timezone
import uuid
from flask import current_app

# User-Group association table (many-to-many relationship)
user_groups = db.Table('user_groups',
    db.Column('user_id', db.String(128), db.ForeignKey('users.id'), primary_key=True),
    db.Column('group_id', db.Integer, db.ForeignKey('groups.id'), primary_key=True),
    db.Column('joined_at', db.DateTime, default=lambda: datetime.now(timezone.utc))
)


class User(db.Model):
    """Store permanent user data"""
    __tablename__ = 'users'
    
    id = db.Column(db.String(128), primary_key=True)
    username = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(128), nullable=True)
    role = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = db.Column(db.DateTime, nullable=True)
    user_data = db.Column(db.JSON, nullable=True)
    
    # Relationships
    sessions = db.relationship('OAuthSession', back_populates='user', cascade='all, delete-orphan')
    projects = db.relationship('Project', back_populates='owner', cascade='all, delete-orphan')
    
    # Many-to-many relationship with groups
    groups = db.relationship('Group', secondary=user_groups, back_populates='members')
    
    # ✅ Collaborative projects created by this user
    created_collaborative_projects = db.relationship(
        'CollaborativeProject',
        foreign_keys='CollaborativeProject.created_by',
        back_populates='creator',
        lazy='dynamic'
    )
    
    @classmethod
    def get_or_create(cls, user_id, username, email=None, user_data=None):
        """Get existing user or create a new one with proper locking"""
        user = cls.query.filter_by(id=user_id).with_for_update().first()
        
        if not user:
            user = cls(
                id=user_id,
                username=username,
                email=email,
                user_data=user_data
            )
            db.session.add(user)
            db.session.flush()
        else:
            user.username = username
            user.email = email
            user.last_login = datetime.now(timezone.utc)
            if user_data:
                user.user_data = user_data
        
        # Extract role from user_data
        if user_data and 'groups' in user_data:
            role = 'user'
            if type(user_data.get('groups')) == dict:
                groups = [elem["act"] for elem in user_data.get('groups', {}).values()]
            else:
                groups = []
            if current_app.config['ROLE_ADMIN'] in groups:
                role = 'admin'
            elif current_app.config['ROLE_TEACHER'] in groups:
                role = 'teacher'
            else:
                role = 'student'
            user.role = role
        
        return user
    
    # ============================================================
    # COLLABORATIVE PROJECT ACCESS (NEW PERMISSION SYSTEM)
    # ============================================================
    
    def has_access_to_collaborative_project(self, collab_project):
        """
        Check if user has any access to collaborative project
        Uses the new permission system
        """
        if isinstance(collab_project, int):
            from app.models.projects import CollaborativeProject
            collab_project = CollaborativeProject.query.get(collab_project)
        
        if not collab_project:
            return False
        
        return collab_project.get_user_permission(self) is not None
    
    def get_permission_for_project(self, collab_project):
        """
        Get user's permission level for a collaborative project
        
        Returns: PermissionLevel enum or None
        """
        if isinstance(collab_project, int):
            from app.models.projects import CollaborativeProject
            collab_project = CollaborativeProject.query.get(collab_project)
        
        if not collab_project:
            return None
        
        return collab_project.get_user_permission(self)
    
    def get_all_collaborative_projects(self):
        """
        Get all collaborative projects user has access to
        Uses the new permission system
        
        Returns: List of CollaborativeProject objects
        """
        from app.models.projects import CollaborativeProject, CollaborativeProjectPermission
        
        projects = set()
        
        # 1. Projects created by this user (owner)
        owned = CollaborativeProject.query.filter_by(
            created_by=self.id,
            deleted_at=None
        ).all()
        projects.update(owned)
        
        # 2. Projects with direct user permissions
        user_perms = CollaborativeProjectPermission.query.filter_by(
            user_id=self.id
        ).all()
        
        for perm in user_perms:
            if not perm.collaborative_project.is_deleted:
                projects.add(perm.collaborative_project)
        
        # 3. Projects via group permissions
        if self.groups:
            user_group_ids = [g.id for g in self.groups]
            
            group_perms = CollaborativeProjectPermission.query.filter(
                CollaborativeProjectPermission.group_id.in_(user_group_ids)
            ).all()
            
            for perm in group_perms:
                if not perm.collaborative_project.is_deleted:
                    projects.add(perm.collaborative_project)
        
        return list(projects)
    
    def get_projects_with_permission(self, permission_level):
        """
        Get all collaborative projects where user has at least the specified permission level
        
        Args:
            permission_level: PermissionLevel enum (ADMIN, WRITE, READ)
        
        Returns: List of CollaborativeProject objects
        """
        from app.models.projects import PermissionLevel
        
        all_projects = self.get_all_collaborative_projects()
        
        perm_hierarchy = {
            PermissionLevel.ADMIN: 3,
            PermissionLevel.WRITE: 2,
            PermissionLevel.READ: 1
        }
        
        required_level = perm_hierarchy[permission_level]
        
        filtered_projects = []
        for proj in all_projects:
            user_perm = proj.get_user_permission(self)
            if user_perm and perm_hierarchy[user_perm] >= required_level:
                filtered_projects.append(proj)
        
        return filtered_projects
    
    # ============================================================
    # WORKING COPY MANAGEMENT
    # ============================================================
    
    def get_working_copy(self, collab_project_id, based_on_commit_id=None):
        """
        Get user's working copy for a specific collaborative project
        
        Args:
            collab_project_id: CollaborativeProject ID
            based_on_commit_id: Optional commit project ID
        
        Returns: WorkingCopy object or None
        """
        from app.models.projects import WorkingCopy
        
        query = WorkingCopy.query.filter_by(
            collaborative_project_id=collab_project_id,
            user_id=self.id
        )
        
        if based_on_commit_id:
            return query.filter_by(based_on_commit_id=based_on_commit_id).first()
        else:
            # Return most recently updated working copy
            return query.order_by(WorkingCopy.updated_at.desc()).first()

    def get_all_working_copies(self, collab_project_id):
        """
        Get all working copies for a collaborative project
        
        Args:
            collab_project_id: CollaborativeProject ID
        
        Returns: dict mapping {based_on_commit_id: WorkingCopy}
        """
        from app.models.projects import WorkingCopy
        
        working_copies = WorkingCopy.query.filter_by(
            collaborative_project_id=collab_project_id,
            user_id=self.id
        ).all()
        
        return {wc.based_on_commit_id: wc for wc in working_copies}
    
    def has_working_copy_for_project(self, collab_project_id):
        """
        Check if user has any working copy for a collaborative project
        
        Args:
            collab_project_id: CollaborativeProject ID
        
        Returns: Boolean
        """
        from app.models.projects import WorkingCopy
        
        wc = WorkingCopy.query.filter_by(
            collaborative_project_id=collab_project_id,
            user_id=self.id
        ).first()
        
        return wc is not None
    
    # ============================================================
    # ROLE CHECKS
    # ============================================================
    
    @property
    def is_teacher(self):
        """Check if user is a teacher"""
        return self.role == 'teacher'
    
    @property
    def is_admin(self):
        """Check if user is an admin"""
        return self.role == 'admin'
    
    @property
    def is_student(self):
        """Check if user is a student"""
        return self.role == 'student'
    
    # ============================================================
    # SERIALIZATION
    # ============================================================
    
    def to_dict(self, include_projects=False):
        """
        Convert user to dictionary
        
        Args:
            include_projects: Include collaborative projects
        
        Returns: Dictionary representation of user
        """
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat(),
            'groups': [group.to_dict() for group in self.groups]
        }
        
        if include_projects:
            projects_data = []
            for proj in self.get_all_collaborative_projects():
                permission = proj.get_user_permission(self)
                
                projects_data.append({
                    'id': proj.id,
                    'name': proj.name,
                    'permission': permission.value if permission else None,
                    'access_via': self._get_access_via(proj)
                })
            
            data['collaborative_projects'] = projects_data
        
        return data
    
    def _get_access_via(self, collab_project):
        """
        Helper to determine how user has access to a project
        
        Args:
            collab_project: CollaborativeProject object
        
        Returns: 'owner', 'direct', 'group:<group_name>', or None
        """
        from app.models.projects import CollaborativeProjectPermission
        
        # Check owner
        if collab_project.created_by == self.id:
            return 'owner'
        
        # Check direct permission
        direct_perm = CollaborativeProjectPermission.query.filter_by(
            collaborative_project_id=collab_project.id,
            user_id=self.id
        ).first()
        
        if direct_perm:
            return 'direct'
        
        # Check group permissions
        if self.groups:
            user_group_ids = [g.id for g in self.groups]
            
            group_perm = CollaborativeProjectPermission.query.filter(
                CollaborativeProjectPermission.collaborative_project_id == collab_project.id,
                CollaborativeProjectPermission.group_id.in_(user_group_ids)
            ).first()
            
            if group_perm and group_perm.group:
                return f'group:{group_perm.group.name}'
        
        return None
    
    def __repr__(self):
        return f'<User {self.username} ({self.id})>'