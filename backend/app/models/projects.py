from app import db
from datetime import datetime, timezone
import uuid

# Project-Group association table (for publishing to groups)
project_groups = db.Table('project_groups',
    db.Column('project_id', db.Integer, db.ForeignKey('projects.id'), primary_key=True),
    db.Column('group_id', db.Integer, db.ForeignKey('groups.id'), primary_key=True),
    db.Column('published_at', db.DateTime, default=lambda: datetime.now(timezone.utc))
)

def generate_project_id():
    return str(uuid.uuid4())

class Project(db.Model):
    """Project model for user created content"""
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    sb3_file_path = db.Column(db.String(255), nullable=True)  # Path to SB3 file
    thumbnail_path = db.Column(db.String(255))  # Add this field
    version = db.Column(db.Integer, default=1, nullable=False)  # Optimistic locking
    
    # Owner relationship
    owner_id = db.Column(db.String(128), db.ForeignKey('users.id'), nullable=False)
    owner = db.relationship('User', back_populates='projects')
    
    # Project metadata
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), 
                          onupdate=lambda: datetime.now(timezone.utc))
    is_published = db.Column(db.Boolean, default=False)
    
    # Relationship with groups (many-to-many)
    shared_groups = db.relationship('Group', secondary=project_groups, 
                                   back_populates='projects')
    
    def __repr__(self):
        return f'<Project {self.name}>'
    
    def update_with_version_check(self, expected_version):
        """Update project with optimistic locking version check"""
        if self.version != expected_version:
            raise Exception("Project was modified by another user. Please refresh and try again.")
        self.version += 1
    
    def to_dict(self):
        return {
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
            'is_published': self.is_published,
            'shared_with_groups': [group.to_dict() for group in self.shared_groups]
        }