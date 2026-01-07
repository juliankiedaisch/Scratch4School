from app import db
from datetime import datetime, timezone
from enum import Enum


# ============================================================
# ASSIGNMENT ORGANIZERS (Junction Table)
# ============================================================

assignment_organizers = db.Table('assignment_organizers',
    db.Column('assignment_id', db.Integer, db.ForeignKey('assignments.id'), primary_key=True),
    db.Column('user_id', db.String(128), db.ForeignKey('users.id'), primary_key=True),
    db.Column('assigned_at', db.DateTime, default=lambda: datetime.now(timezone.utc))
)


# ============================================================
# ASSIGNMENT MODEL
# ============================================================

class Assignment(db.Model):
    """
    Assignment model - represents a task given to users/groups
    Users can submit CollaborativeProjects which then get frozen
    """
    __tablename__ = 'assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # Organizers (many-to-many with User)
    organizers = db.relationship(
        'User',
        secondary=assignment_organizers,
        backref=db.backref('organized_assignments', lazy='dynamic')
    )
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                          onupdate=lambda: datetime.now(timezone.utc))
    due_date = db.Column(db.DateTime, nullable=True)
    
    # Auto-freeze setting
    auto_freeze_on_due = db.Column(db.Boolean, default=False, nullable=False)
    
    # Soft delete
    deleted_at = db.Column(db.DateTime, nullable=True)
    deleted_by = db.Column(db.String(128), nullable=True)
    
    # Relationships
    user_assignments = db.relationship(
        'AssignmentUser',
        back_populates='assignment',
        cascade='all, delete-orphan'
    )
    
    group_assignments = db.relationship(
        'AssignmentGroup',
        back_populates='assignment',
        cascade='all, delete-orphan'
    )
    
    submissions = db.relationship(
        'AssignmentSubmission',
        back_populates='assignment',
        cascade='all, delete-orphan'
    )
    
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
        return f'<Assignment {self.name} (ID: {self.id})>'
    
    # ============================================================
    # ASSIGNMENT METHODS
    # ============================================================
    
    def is_organizer(self, user):
        """Check if user is an organizer of this assignment"""
        return user in self.organizers
    
    def add_organizer(self, user):
        """Add a user as an organizer"""
        if user not in self.organizers:
            self.organizers.append(user)
    
    def remove_organizer(self, user):
        """Remove a user from organizers"""
        if user in self.organizers:
            self.organizers.remove(user)
    
    def assign_to_user(self, user):
        """Assign this assignment to a specific user"""
        existing = AssignmentUser.query.filter_by(
            assignment_id=self.id,
            user_id=user.id
        ).first()
        
        if not existing:
            assignment_user = AssignmentUser(
                assignment_id=self.id,
                user_id=user.id
            )
            db.session.add(assignment_user)
            return assignment_user
        return existing
    
    def assign_to_group(self, group):
        """Assign this assignment to a group"""
        existing = AssignmentGroup.query.filter_by(
            assignment_id=self.id,
            group_id=group.id
        ).first()
        
        if not existing:
            assignment_group = AssignmentGroup(
                assignment_id=self.id,
                group_id=group.id
            )
            db.session.add(assignment_group)
            return assignment_group
        return existing
    
    def get_assigned_users(self):
        """Get all users directly assigned to this assignment"""
        from app.models.users import User
        
        user_ids = [au.user_id for au in self.user_assignments]
        return User.query.filter(User.id.in_(user_ids)).all()
    
    def get_assigned_groups(self):
        """Get all groups assigned to this assignment"""
        from app.models.groups import Group
        
        group_ids = [ag.group_id for ag in self.group_assignments]
        return Group.query.filter(Group.id.in_(group_ids)).all()
    
    def get_all_assigned_users(self):
        """Get all users assigned (directly + via groups)"""
        users = set(self.get_assigned_users())
        
        # Add users from groups
        for group in self.get_assigned_groups():
            users.update(group.members)
        
        return list(users)
    
    def has_access(self, user):
        """Check if user has access to this assignment (organizer or assigned)"""
        # Check if organizer
        if self.is_organizer(user):
            return True
        
        # Check direct assignment
        direct = AssignmentUser.query.filter_by(
            assignment_id=self.id,
            user_id=user.id
        ).first()
        
        if direct:
            return True
        
        # Check group assignment
        if user.groups:
            user_group_ids = [g.id for g in user.groups]
            group_assignment = AssignmentGroup.query.filter(
                AssignmentGroup.assignment_id == self.id,
                AssignmentGroup.group_id.in_(user_group_ids)
            ).first()
            
            if group_assignment:
                return True
        
        return False
    
    def get_submission(self, user):
        """Get a user's submission for this assignment"""
        return AssignmentSubmission.query.filter_by(
            assignment_id=self.id,
            user_id=user.id
        ).first()
    
    def has_submitted(self, user):
        """Check if user has submitted this assignment"""
        return self.get_submission(user) is not None
    
    def to_dict(self, include_assignments=False, include_submissions=False):
        """Convert assignment to dictionary"""
        # Helper to format datetime with timezone
        def format_datetime(dt):
            if not dt:
                return None
            # Ensure timezone-aware (treat naive as UTC)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.isoformat()
        
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'organizers': [{
                'id': org.id,
                'username': org.username
            } for org in self.organizers],
            'created_at': format_datetime(self.created_at),
            'updated_at': format_datetime(self.updated_at),
            'due_date': format_datetime(self.due_date),
            'auto_freeze_on_due': self.auto_freeze_on_due,
            'is_deleted': self.is_deleted
        }
        
        if include_assignments:
            # Return user assignments with full structure
            data['user_assignments'] = [{
                'user': {
                    'id': au.user.id,
                    'username': au.user.username
                },
                'assigned_at': format_datetime(au.assigned_at)
            } for au in self.user_assignments]
            
            # Return group assignments with full structure
            data['group_assignments'] = [{
                'group': {
                    'id': ag.group.id,
                    'name': ag.group.name,
                    'external_id': ag.group.external_id,
                    'member_count': len(ag.group.members) if ag.group.members else 0
                },
                'assigned_at': format_datetime(ag.assigned_at)
            } for ag in self.group_assignments]
            
            # Also include simplified lists for backward compatibility
            data['assigned_users'] = [{
                'id': u.id,
                'username': u.username
            } for u in self.get_assigned_users()]
            
            data['assigned_groups'] = [{
                'id': g.id,
                'name': g.name,
                'external_id': g.external_id
            } for g in self.get_assigned_groups()]
        
        if include_submissions:
            data['submissions'] = [sub.to_dict() for sub in self.submissions]
            data['submission_count'] = len(self.submissions)
        
        return data


# ============================================================
# ASSIGNMENT USER (Junction Table with metadata)
# ============================================================

class AssignmentUser(db.Model):
    """Junction table for assignments given to individual users"""
    __tablename__ = 'assignment_users'
    
    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey('assignments.id'), nullable=False)
    user_id = db.Column(db.String(128), db.ForeignKey('users.id'), nullable=False)
    
    assigned_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    assignment = db.relationship('Assignment', back_populates='user_assignments')
    user = db.relationship('User', backref='user_assignments')
    
    __table_args__ = (
        db.UniqueConstraint('assignment_id', 'user_id', name='unique_assignment_user'),
    )
    
    def __repr__(self):
        return f'<AssignmentUser assignment:{self.assignment_id} user:{self.user_id}>'


# ============================================================
# ASSIGNMENT GROUP (Junction Table with metadata)
# ============================================================

class AssignmentGroup(db.Model):
    """Junction table for assignments given to groups"""
    __tablename__ = 'assignment_groups'
    
    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey('assignments.id'), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=False)
    
    assigned_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    assignment = db.relationship('Assignment', back_populates='group_assignments')
    group = db.relationship('Group', backref='group_assignments')
    
    __table_args__ = (
        db.UniqueConstraint('assignment_id', 'group_id', name='unique_assignment_group'),
    )
    
    def __repr__(self):
        return f'<AssignmentGroup assignment:{self.assignment_id} group:{self.group_id}>'


# ============================================================
# ASSIGNMENT SUBMISSION
# ============================================================

class AssignmentSubmission(db.Model):
    """
    Records when a user submits a CollaborativeProject for an assignment
    The project gets frozen upon submission
    """
    __tablename__ = 'assignment_submissions'
    
    id = db.Column(db.Integer, primary_key=True)
    
    assignment_id = db.Column(db.Integer, db.ForeignKey('assignments.id'), nullable=False)
    assignment = db.relationship('Assignment', back_populates='submissions')
    
    user_id = db.Column(db.String(128), db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', foreign_keys=[user_id], backref='assignment_submissions')
    
    collaborative_project_id = db.Column(db.Integer, db.ForeignKey('collaborative_projects.id'), nullable=False)
    collaborative_project = db.relationship('CollaborativeProject', backref='assignment_submissions')
    
    # Submission metadata
    submitted_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    submitted_commit_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)
    submitted_commit = db.relationship('Project', foreign_keys=[submitted_commit_id])
    
    __table_args__ = (
        db.UniqueConstraint('assignment_id', 'user_id', 'collaborative_project_id', 
                          name='unique_assignment_submission'),
    )
    
    def __repr__(self):
        return f'<AssignmentSubmission assignment:{self.assignment_id} user:{self.user_id} project:{self.collaborative_project_id}>'
    
    def to_dict(self):
        """Convert submission to dictionary"""
        # Helper to format datetime with timezone
        def format_datetime(dt):
            if not dt:
                return None
            # Ensure timezone-aware (treat naive as UTC)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.isoformat()
        
        return {
            'id': self.id,
            'assignment_id': self.assignment_id,
            'user': {
                'id': self.user.id,
                'username': self.user.username
            },
            'collaborative_project': {
                'id': self.collaborative_project.id,
                'name': self.collaborative_project.name
            },
            'submitted_at': format_datetime(self.submitted_at),
            'submitted_commit_id': self.submitted_commit_id
        }
