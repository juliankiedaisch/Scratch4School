from app import db
from datetime import datetime, timezone
import uuid
from enum import Enum

class PermissionLevel(str, Enum):
    ADMIN = 'admin'
    WRITE = 'write'
    READ = 'read'


# ============================================================
# UNIFIED PERMISSION SYSTEM
# ============================================================

class CollaborativeProjectPermission(db.Model):
    """
    Unified permission system for users OR groups
    Replaces: CollaborativeProjectCollaborator, shared_groups
    """
    __tablename__ = 'collaborative_project_permissions'
    
    id = db.Column(db.Integer, primary_key=True)
    collaborative_project_id = db.Column(db.Integer, db.ForeignKey('collaborative_projects.id'), nullable=False)
    
    # Either user_id OR group_id is set (not both)
    user_id = db.Column(db.String(128), db.ForeignKey('users.id'), nullable=True)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=True)
    
    # Permission level
    permission = db.Column(db.Enum(PermissionLevel), nullable=False, default=PermissionLevel.READ)
    
    # Metadata
    granted_by = db.Column(db.String(128), db.ForeignKey('users.id'), nullable=True)
    granted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    collaborative_project = db.relationship('CollaborativeProject', back_populates='permissions')
    user = db.relationship('User', foreign_keys=[user_id], backref='project_permissions')
    group = db.relationship('Group', backref='project_permissions')
    granter = db.relationship('User', foreign_keys=[granted_by])
    
    # Constraints
    __table_args__ = (
        db.CheckConstraint(
            '(user_id IS NOT NULL AND group_id IS NULL) OR (user_id IS NULL AND group_id IS NOT NULL)',
            name='check_user_or_group'
        ),
        db.UniqueConstraint('collaborative_project_id', 'user_id', name='unique_user_permission'),
        db.UniqueConstraint('collaborative_project_id', 'group_id', name='unique_group_permission'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'collaborative_project_id': self.collaborative_project_id,
            'permission': self.permission.value,
            'user': {
                'id': self.user.id,
                'username': self.user.username
            } if self.user else None,
            'group': {
                'id': self.group.id,
                'name': self.group.name,
                'external_id': self.group.external_id
            } if self.group else None,
            'granted_by': self.granter.username if self.granter else None,
            'granted_at': self.granted_at.isoformat()
        }


# ============================================================
# PROJECT (Normal + Commits + Working Copies)
# ============================================================


def generate_project_id():
    return str(uuid.uuid4())


class Project(db.Model):
    """
    Project model - represents:
    1. Commits (linked via Commit)
    2. Working Copies (linked via WorkingCopy)
    """
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    sb3_file_path = db.Column(db.String(255), nullable=True)
    thumbnail_path = db.Column(db.String(255))
    
    # Owner relationship
    owner_id = db.Column(db.String(128), db.ForeignKey('users.id'), nullable=False)
    owner = db.relationship('User', back_populates='projects')
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), 
                          onupdate=lambda: datetime.now(timezone.utc))
    
    # Soft delete
    deleted_at = db.Column(db.DateTime, nullable=True)
    deleted_by = db.Column(db.String(128), nullable=True)

    # Collaboration relationships
    commit_info = db.relationship('Commit', 
                                 foreign_keys='Commit.project_id',
                                 back_populates='project',
                                 uselist=False,
                                 cascade='all, delete-orphan')
    
    working_copy_info = db.relationship('WorkingCopy', 
                                       foreign_keys='WorkingCopy.project_id',
                                       back_populates='project',
                                       uselist=False,
                                       cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Project {self.name} (ID: {self.id})>'
    
    @property
    def thumbnail_url(self):
        if self.thumbnail_path:
            return f'/backend/api/projects/{self.id}/thumbnail'
        return None
    
    @property
    def is_collaborative(self):
        """All projects are now collaborative"""
        return True
    
    @property
    def is_working_copy(self):
        return self.working_copy_info is not None
    
    @property
    def is_commit(self):
        return self.commit_info is not None

    @property
    def is_deleted(self):
        return self.deleted_at is not None
    
    def soft_delete(self, user_id):
        self.deleted_at = datetime.now(timezone.utc)
        self.deleted_by = user_id
    
    def restore(self):
        self.deleted_at = None
        self.deleted_by = None

    def to_dict(self, include_collab_info=False):
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'thumbnail_url': self.thumbnail_url,
            'owner': {
                'id': self.owner.id,
                'username': self.owner.username
            },
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'is_collaborative': True,  # All projects are collaborative
            'is_working_copy': self.is_working_copy,
            'is_commit': self.is_commit
        }
        
        if include_collab_info:
            if self.commit_info:
                data['commit_info'] = {
                    'commit_number': self.commit_info.commit_number,
                    'collaborative_project_id': self.commit_info.collaborative_project_id,
                    'committed_by': self.commit_info.committer.username,
                    'committed_at': self.commit_info.committed_at.isoformat(),
                    'message': self.commit_info.commit_message
                }
            
            if self.working_copy_info:
                data['working_copy_info'] = {
                    'collaborative_project_id': self.working_copy_info.collaborative_project_id,
                    'based_on_commit': self.working_copy_info.based_on_commit_id,
                    'has_changes': self.working_copy_info.has_changes
                }
            
        return data


# ============================================================
# COLLABORATIVE PROJECT
# ============================================================

class CollaborativeProject(db.Model):
    """
    Container for all commits and working copies
    Every project now has a CollaborativeProject
    """
    __tablename__ = 'collaborative_projects'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    
    # Owner (always has ADMIN permission)
    created_by = db.Column(db.String(128), db.ForeignKey('users.id'), nullable=False)
    creator = db.relationship('User', 
                             foreign_keys=[created_by],
                             back_populates='created_collaborative_projects')
    
    # Latest commit pointer
    latest_commit_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)
    latest_commit = db.relationship('Project', 
                                   foreign_keys=[latest_commit_id],
                                   post_update=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                          onupdate=lambda: datetime.now(timezone.utc))
    
    # Soft delete
    deleted_at = db.Column(db.DateTime, nullable=True)
    deleted_by = db.Column(db.String(128), nullable=True)

    # ✅ NEW: Unified permissions
    permissions = db.relationship(
        'CollaborativeProjectPermission',
        back_populates='collaborative_project',
        cascade='all, delete-orphan'
    )
    
    # Relationships
    commits = db.relationship('Commit', 
                             foreign_keys='Commit.collaborative_project_id',
                             back_populates='collaborative_project',
                             order_by='Commit.commit_number.desc()',
                             cascade='all, delete-orphan')
    
    working_copies = db.relationship('WorkingCopy',
                                    foreign_keys='WorkingCopy.collaborative_project_id',
                                    back_populates='collaborative_project',
                                    cascade='all, delete-orphan')
    
    @property
    def is_deleted(self):
        return self.deleted_at is not None
    
    def soft_delete(self, user_id):
        self.deleted_at = datetime.now(timezone.utc)
        self.deleted_by = user_id
    
    def restore(self):
        self.deleted_at = None
        self.deleted_by = None

    def __repr__(self):
        return f'<CollaborativeProject {self.name} (ID: {self.id})>'
    
    # ============================================================
    # PERMISSION METHODS
    # ============================================================
    
    def get_user_permission(self, user):
        """
        Get highest permission level for a user
        Priority: owner > direct user permission > group permissions
        """
        # Owner has admin rights
        if self.created_by == user.id:
            return PermissionLevel.ADMIN
        
        # Check direct user permission
        user_perm = CollaborativeProjectPermission.query.filter_by(
            collaborative_project_id=self.id,
            user_id=user.id
        ).first()
        
        if user_perm:
            return user_perm.permission
        
        # Check group permissions (take highest)
        user_group_ids = [g.id for g in user.groups]
        
        if not user_group_ids:
            return None
        
        group_perms = CollaborativeProjectPermission.query.filter(
            CollaborativeProjectPermission.collaborative_project_id == self.id,
            CollaborativeProjectPermission.group_id.in_(user_group_ids)
        ).all()
        
        if not group_perms:
            return None
        
        # Return highest permission level
        perm_hierarchy = {
            PermissionLevel.ADMIN: 3,
            PermissionLevel.WRITE: 2,
            PermissionLevel.READ: 1
        }
        
        highest_perm = max(group_perms, key=lambda p: perm_hierarchy[p.permission])
        return highest_perm.permission

    def has_permission(self, user, required_permission):
        """Check if user has at least the required permission level"""
        user_perm = self.get_user_permission(user)
        
        if not user_perm:
            return False
        
        perm_hierarchy = {
            PermissionLevel.ADMIN: 3,
            PermissionLevel.WRITE: 2,
            PermissionLevel.READ: 1
        }
        
        return perm_hierarchy[user_perm] >= perm_hierarchy[required_permission]
    
    def get_all_users_with_access(self):
        """Get all users and groups who have any access to this project"""
        users_dict = {}
        
        # Add owner
        from app.models.users import User
        owner = User.query.get(self.created_by)
        if owner:
            users_dict[self.created_by] = {
                'user': owner,
                'permission': PermissionLevel.ADMIN,
                'via': 'owner'
            }
        
        # Add users with direct permissions
        user_perms = CollaborativeProjectPermission.query.filter_by(
            collaborative_project_id=self.id,
            group_id=None
        ).all()
        
        for perm in user_perms:
            if perm.user_id not in users_dict:
                users_dict[perm.user_id] = {
                    'user': perm.user,
                    'permission': perm.permission,
                    'permission_id': perm.id,
                    'via': 'direct'
                }
            else:
                # Keep highest permission
                existing_perm = users_dict[perm.user_id]['permission']
                perm_hierarchy = {
                    PermissionLevel.ADMIN: 3,
                    PermissionLevel.WRITE: 2,
                    PermissionLevel.READ: 1
                }
                if perm_hierarchy[perm.permission] > perm_hierarchy[existing_perm]:
                    users_dict[perm.user_id]['permission'] = perm.permission
        
        return list(users_dict.values())

    def get_all_groups_with_access(self):
        """Get all groups who have any access to this project"""
        groups_dict = {}
        
        # Add groups with permissions
        group_perms = CollaborativeProjectPermission.query.filter(
            CollaborativeProjectPermission.collaborative_project_id == self.id,
            CollaborativeProjectPermission.group_id.isnot(None)
        ).all()
        
        for perm in group_perms:
            if perm.group:
                groups_dict[perm.group_id] = {
                    'group': perm.group,
                    'permission': perm.permission,
                    'via': 'group',
                    'name': perm.group.name,
                    'permission_id': perm.id,
                }
        return list(groups_dict.values())
    
    def to_dict(self, include_permissions=False, include_commits=False):
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_by': self.created_by,
            'creator_username': self.creator.username if self.creator else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'latest_commit_id': self.latest_commit_id,
            'is_deleted': self.is_deleted
        }
        
        if include_permissions:
            data['permissions'] = [p.to_dict() for p in self.permissions]
        
        if include_commits:
            data['commits'] = [c.to_dict() for c in self.commits]
        
        return data


# ============================================================
# COMMIT
# ============================================================

class Commit(db.Model):
    """Links a Project to a CollaborativeProject as a public commit"""
    __tablename__ = 'commits'
    
    id = db.Column(db.Integer, primary_key=True)
    
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='CASCADE'), 
                          nullable=False, unique=True)
    project = db.relationship('Project', 
                             foreign_keys=[project_id],
                             back_populates='commit_info')
    
    collaborative_project_id = db.Column(db.Integer, 
                                        db.ForeignKey('collaborative_projects.id', ondelete='CASCADE'),
                                        nullable=False)
    collaborative_project = db.relationship('CollaborativeProject', 
                                           foreign_keys=[collaborative_project_id],
                                           back_populates='commits')
    
    commit_number = db.Column(db.Integer, nullable=False)
    commit_message = db.Column(db.Text)
    
    parent_commit_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)
    parent_commit = db.relationship('Project', 
                                   foreign_keys=[parent_commit_id],
                                   post_update=True)
    
    committed_by = db.Column(db.String(128), db.ForeignKey('users.id'), nullable=False)
    committer = db.relationship('User', 
                               foreign_keys=[committed_by],
                               backref=db.backref('commits', lazy='dynamic'))
    
    committed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        db.UniqueConstraint('collaborative_project_id', 'commit_number', 
                          name='uq_collab_commit_number'),
        db.Index('idx_collab_commits', 'collaborative_project_id'),
    )
    
    def __repr__(self):
        return f'<Commit #{self.commit_number} of CollabProject {self.collaborative_project_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'commit_number': self.commit_number,
            'commit_message': self.commit_message,
            'parent_commit_id': self.parent_commit_id,
            'committed_by': self.committer.username if self.committer else 'Unknown',
            'committed_at': self.committed_at.isoformat()
        }


# ============================================================
# WORKING COPY
# ============================================================

class WorkingCopy(db.Model):
    """Links a Project to a CollaborativeProject as a private working copy"""
    __tablename__ = 'working_copies'
    
    id = db.Column(db.Integer, primary_key=True)
    
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id', ondelete='CASCADE'),
                          nullable=False, unique=True)
    project = db.relationship('Project',
                             foreign_keys=[project_id],
                             back_populates='working_copy_info')
    
    collaborative_project_id = db.Column(db.Integer,
                                        db.ForeignKey('collaborative_projects.id', ondelete='CASCADE'),
                                        nullable=False)
    collaborative_project = db.relationship('CollaborativeProject',
                                           foreign_keys=[collaborative_project_id],
                                           back_populates='working_copies')
    
    user_id = db.Column(db.String(128), db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', 
                          foreign_keys=[user_id],
                          backref=db.backref('working_copies', lazy='dynamic'))
    
    based_on_commit_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    based_on_commit = db.relationship('Project', 
                                     foreign_keys=[based_on_commit_id],
                                     post_update=True)
    
    has_changes = db.Column(db.Boolean, default=False, nullable=False)
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                          onupdate=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        db.UniqueConstraint('collaborative_project_id', 'user_id', 'based_on_commit_id',
                          name='uq_collab_user_commit_wc'),
        db.Index('idx_user_wc', 'user_id', 'collaborative_project_id'),
    )
    
    def __repr__(self):
        return f'<WorkingCopy of CollabProject {self.collaborative_project_id} by User {self.user_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'collaborative_project_id': self.collaborative_project_id,
            'user_id': self.user_id,
            'based_on_commit_id': self.based_on_commit_id,
            'has_changes': self.has_changes,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
