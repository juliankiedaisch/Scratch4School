import os
if __name__ == '__main__':
    import dotenv
    dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from app import create_app, db
from sqlalchemy import inspect, text

app = create_app(os.environ["DEBUG"])

def run_migrations():
    """Run database migrations on startup"""
    with app.app_context():
        inspector = inspect(db.engine)
        
        # Check if projects table exists
        if 'projects' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('projects')]
            
            # Add version column if it doesn't exist
            if 'version' not in columns:
                try:
                    with db.engine.connect() as conn:
                        # For SQLite and PostgreSQL
                        conn.execute(text("ALTER TABLE projects ADD COLUMN version INTEGER NOT NULL DEFAULT 1"))
                        conn.commit()
                        print("✅ Migration: Added 'version' column to projects table")
                except Exception as e:
                    print(f"⚠️ Migration warning: {str(e)}")
                    # Column might already exist, continue anyway
            else:
                print("✅ Migration: 'version' column already exists")

# Create tables before the first request (Flask 2.0+ compatible approach)
with app.app_context():
    db.create_all()
    
# Run migrations
run_migrations()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5006 , debug=True)