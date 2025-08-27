from app import db
from datetime import datetime, timezone

class Asset(db.Model):
    """Asset model for costumes, sounds, etc."""
    __tablename__ = 'assets'
    
    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.String(128), nullable=False, unique=True)  # md5 hash
    asset_type = db.Column(db.String(50), nullable=False)  # costume, sound, etc.
    data_format = db.Column(db.String(10), nullable=False)  # svg, png, wav, etc.
    size = db.Column(db.Integer, nullable=False)
    md5 = db.Column(db.String(32), nullable=False, index=True)
    owner_id = db.Column(db.String(128), db.ForeignKey('users.id'), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationship to user
    owner = db.relationship('User', backref='assets')
    
    def __repr__(self):
        return f'<Asset {self.asset_id}.{self.data_format}>'