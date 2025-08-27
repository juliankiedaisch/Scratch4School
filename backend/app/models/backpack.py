from app import db
from datetime import datetime, timezone
import uuid

def generate_id():
    return str(uuid.uuid4())

class BackpackItem(db.Model):
    """Model for items stored in a user's backpack"""
    __tablename__ = 'backpack_items'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_id)
    type = db.Column(db.String(20), nullable=False)  # sprite, costume, sound, script
    name = db.Column(db.String(255), nullable=False)
    mime = db.Column(db.String(50), nullable=False)  # application/zip, image/png, etc
    
    # Asset references
    body = db.Column(db.String(128), nullable=False)  # Asset ID for the content
    thumbnail = db.Column(db.String(128), nullable=False)  # Asset ID for the thumbnail
    
    # User who owns this backpack item
    owner_id = db.Column(db.String(128), db.ForeignKey('users.id'), nullable=False)
    owner = db.relationship('User', backref=db.backref('backpack_items', lazy=True))
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), 
                           onupdate=lambda: datetime.now(timezone.utc))
    
    def __repr__(self):
        return f'<BackpackItem {self.type}:{self.name}>'
    
    def to_dict(self):
        """Convert the backpack item to a dictionary with full URLs if base_url is provided"""
        data = {
            'id': self.id,
            'type': self.type,
            'name': self.name,
            'mime': self.mime,
            'body': self.body if self.type not in ['sound', 'costume'] else f"{self.body}.{self.mime.split('/')[1].split('+')[0]}",
            'thumbnail': self.thumbnail,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        # Add full URLs if base URL is provided
        data['thumbnailUrl'] = f"/backend/api/assets/{self.thumbnail}"
        data['bodyUrl'] = f"/backend/api/assets/{self.body}.{self.mime.split('/')[1]}"
            
        return data