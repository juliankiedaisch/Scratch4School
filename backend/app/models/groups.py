from app import db
from datetime import datetime, timezone

class Group(db.Model):
    """Group model for user communities - synced from OAuth provider"""
    __tablename__ = 'groups'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    external_id = db.Column(db.String(255), nullable=False, unique=True)  # ID from OAuth provider
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Define the many-to-many relationship with users - references table defined in user.py
    members = db.relationship('User', secondary='user_groups', 
                           back_populates='groups')
    
    # Define the relationship with projects
    projects = db.relationship('Project', secondary='project_groups', 
                              back_populates='shared_groups')
    
    def __repr__(self):
        return f'<Group {self.name} ({self.external_id})>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'external_id': self.external_id,
            'description': self.description
        }
    
    @classmethod
    def get_or_create(cls, external_id, name, description=None):
        """Get existing group or create new one based on external ID"""
        group = cls.query.filter_by(external_id=external_id).first()
        
        if not group:
            group = cls(
                external_id=external_id,
                name=name,
                description=description
            )
            db.session.add(group)
            db.session.flush()  # Generate ID without committing
            
        return group