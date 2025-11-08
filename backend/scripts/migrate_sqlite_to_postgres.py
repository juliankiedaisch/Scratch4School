import sqlite3
import os
from datetime import datetime
#import sys
if __name__ == '__main__':
    import dotenv
    dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))


from app import create_app, db
from app.models.users import User
from app.models.groups import Group
from app.models.oauth_session import OAuthSession
from app.models.projects import Project
from app.models.asset import Asset
from app.models.backpack import BackpackItem

def migrate_sqlite_to_postgres():
    """Migrate data from SQLite to PostgreSQL"""
    print("Starting migration from SQLite to PostgreSQL...")
    print("PostgresPath:", os.environ.get('DATABASE_URI'))
    
    # Paths
    sqlite_db_path = os.environ.get('SQLALCHEMY_DATABASE_URI')
    
    if not os.path.exists(sqlite_db_path):
        print(f"SQLite database not found at {sqlite_db_path}")
        return
    
    print(f"Connecting to SQLite database: {sqlite_db_path}")
    sqlite_conn = sqlite3.connect(sqlite_db_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()
    
    # Create Flask app and PostgreSQL tables
    app = create_app(os.getenv('FLASK_ENV', 'development'))
    
    with app.app_context():
        print("Creating PostgreSQL tables...")
        
        # Drop all tables first (optional - comment out if you want to keep existing data)
        db.drop_all()
        
        # Create tables in the correct order
        # 1. Independent tables first (no foreign keys)
        db.create_all()
        
        print("Tables created successfully")
        
        # Define migration order based on dependencies
        migration_steps = [
            ('users', migrate_users),
            ('groups', migrate_groups),
            ('user_groups', migrate_user_groups),
            ('oauth_sessions', migrate_oauth_sessions),
            ('projects', migrate_projects),
            ('project_groups', migrate_project_groups),
            ('assets', migrate_assets),
            ('backpack_items', migrate_backpack_items),
        ]
        success = True
        # Execute migrations in order
        for table_name, migrate_func in migration_steps:
            try:
                # Check if table exists in SQLite
                sqlite_cursor.execute(
                    f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'"
                )
                if sqlite_cursor.fetchone():
                    print(f"\nMigrating {table_name}...")
                    count = migrate_func(sqlite_cursor, db)
                    print(f"✓ Migrated {count} records from {table_name}")
                else:
                    print(f"⚠ Table {table_name} not found in SQLite database")
            except Exception as e:
                print(f"✗ Error migrating {table_name}: {str(e)}")
                success = False
                db.session.rollback()
        
        print("\n✓ Migration completed!")
        if success:
            # Rename SQLite database to mark it as migrated
            migrated_path = f"{sqlite_db_path}.migrated.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            os.rename(sqlite_db_path, migrated_path)
            print(f"SQLite database marked as migrated: {migrated_path}")
    
    sqlite_conn.close()

    with app.app_context():
        # Reset sequences
        db.session.execute(db.text("SELECT setval('projects_id_seq', (SELECT COALESCE(MAX(id), 1) FROM projects));"))
        db.session.execute(db.text("SELECT setval('groups_id_seq', (SELECT COALESCE(MAX(id), 1) FROM groups));"))
        db.session.execute(db.text("SELECT setval('assets_id_seq', (SELECT COALESCE(MAX(id), 1) FROM assets));"))
        db.session.commit()
        print("Sequences reset successfully!")


def migrate_users(cursor, db):
    """Migrate users table"""
    cursor.execute("SELECT * FROM users")
    rows = cursor.fetchall()
    
    for row in rows:
        user = User(
            id=row['id'],
            username=row['username'],
            email=row['email'] if 'email' in row.keys() else None,
            role=row['role'] if 'role' in row.keys() else None,
            created_at=row['created_at'] if 'created_at' in row.keys() else None,
            last_login=row['last_login'] if 'last_login' in row.keys() else None,
            user_data=row['user_data'] if 'user_data' in row.keys() else None
        )
        db.session.add(user)
    
    db.session.commit()
    return len(rows)


def migrate_groups(cursor, db):
    """Migrate groups table"""
    cursor.execute("SELECT * FROM groups")
    rows = cursor.fetchall()
    
    for row in rows:
        group = Group(
            id=row['id'],
            name=row['name'],
            external_id=row['external_id'],
            description=row['description'] if 'description' in row.keys() else None,
            created_at=row['created_at'] if 'created_at' in row.keys() else None
        )
        db.session.add(group)
    
    db.session.commit()
    return len(rows)


def migrate_user_groups(cursor, db):
    """Migrate user_groups association table"""
    cursor.execute("SELECT * FROM user_groups")
    rows = cursor.fetchall()
    
    for row in rows:
        # Insert directly into association table
        db.session.execute(
            db.text("INSERT INTO user_groups (user_id, group_id, joined_at) VALUES (:user_id, :group_id, :joined_at)"),
            {
                'user_id': row['user_id'],
                'group_id': row['group_id'],
                'joined_at': row['joined_at'] if 'joined_at' in row.keys() else None
            }
        )
    
    db.session.commit()
    return len(rows)


def migrate_oauth_sessions(cursor, db):
    """Migrate oauth_sessions table"""
    cursor.execute("SELECT * FROM oauth_sessions")
    rows = cursor.fetchall()
    
    for row in rows:
        session = OAuthSession(
            id=row['id'],
            user_id=row['user_id'],
            access_token=row['access_token'],
            refresh_token=row['refresh_token'] if 'refresh_token' in row.keys() else None,
            expires_at=row['expires_at'],
            created_at=row['created_at'] if 'created_at' in row.keys() else None,
            last_accessed=row['last_accessed'] if 'last_accessed' in row.keys() else None
        )
        db.session.add(session)
    
    db.session.commit()
    return len(rows)


def migrate_projects(cursor, db):
    """Migrate projects table"""
    cursor.execute("SELECT * FROM projects")
    rows = cursor.fetchall()
    
    for row in rows:
        project = Project(
            id=row['id'],
            name=row['name'],
            description=row['description'] if 'description' in row.keys() else None,
            sb3_file_path=row['sb3_file_path'] if 'sb3_file_path' in row.keys() else None,
            thumbnail_path=row['thumbnail_path'] if 'thumbnail_path' in row.keys() else None,
            owner_id=row['owner_id'],
            created_at=row['created_at'] if 'created_at' in row.keys() else None,
            updated_at=row['updated_at'] if 'updated_at' in row.keys() else None,
            is_published=row['is_published'] if 'is_published' in row.keys() else False
        )
        db.session.add(project)
    
    db.session.commit()
    return len(rows)


def migrate_project_groups(cursor, db):
    """Migrate project_groups association table"""
    cursor.execute("SELECT * FROM project_groups")
    rows = cursor.fetchall()
    
    for row in rows:
        # Insert directly into association table
        db.session.execute(
            db.text("INSERT INTO project_groups (project_id, group_id, published_at) VALUES (:project_id, :group_id, :published_at)"),
            {
                'project_id': row['project_id'],
                'group_id': row['group_id'],
                'published_at': row['published_at'] if 'published_at' in row.keys() else None
            }
        )
    
    db.session.commit()
    return len(rows)


def migrate_assets(cursor, db):
    """Migrate assets table"""
    cursor.execute("SELECT * FROM assets")
    rows = cursor.fetchall()
    
    for row in rows:
        asset = Asset(
            id=row['id'],
            asset_id=row['asset_id'],
            asset_type=row['asset_type'],
            data_format=row['data_format'],
            size=row['size'],
            md5=row['md5'],
            owner_id=row['owner_id'],
            file_path=row['file_path'],
            created_at=row['created_at'] if 'created_at' in row.keys() else None
        )
        db.session.add(asset)
    
    db.session.commit()
    return len(rows)


def migrate_backpack_items(cursor, db):
    """Migrate backpack_items table"""
    cursor.execute("SELECT * FROM backpack_items")
    rows = cursor.fetchall()
    
    for row in rows:
        item = BackpackItem(
            id=row['id'],
            type=row['type'],
            name=row['name'],
            mime=row['mime'],
            body=row['body'],
            thumbnail=row['thumbnail'],
            owner_id=row['owner_id'],
            created_at=row['created_at'] if 'created_at' in row.keys() else None,
            updated_at=row['updated_at'] if 'updated_at' in row.keys() else None
        )
        db.session.add(item)
    
    db.session.commit()
    return len(rows)


if __name__ == '__main__':
    migrate_sqlite_to_postgres()