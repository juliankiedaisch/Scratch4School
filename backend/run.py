import os
if __name__ == '__main__':
    import dotenv
    dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from app import create_app, db
from sqlalchemy import inspect, text

from scripts.migration_postgres_tonew_postgres import migrate_postgres_to_new_postgres
from scripts.migrate_sqlite_to_postgres import migrate_sqlite_to_postgres

migrate_sqlite_to_postgres()
migrate_postgres_to_new_postgres()

app = create_app(os.environ["DEBUG"])

def run_migrations():
    """
    Minimal startup migrations
    Only creates missing tables and runs basic consistency checks
    """
    with app.app_context():
        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        print("\n" + "="*60)
        print("🔄 Database Startup Check...")
        print("="*60 + "\n")
        
        # ========================================
        # 1. CREATE MISSING TABLES
        # ========================================
        print("📋 Checking database schema...")
        
        required_tables = [
            'users',
            'groups',
            'user_groups',
            'oauth_sessions',
            'projects',
            'collaborative_projects',
            'commits',
            'working_copies',
            'collaborative_project_permissions',
            'assets',
            'backpack_items'
        ]
        
        missing_tables = [t for t in required_tables if t not in existing_tables]
        
        if missing_tables:
            print(f"⚠️  Missing tables: {', '.join(missing_tables)}")
            print("   Creating tables...")
            db.create_all()
            print("   ✅ Tables created")
        else:
            print("✅ All required tables exist")
        
        # ========================================
        # 2. CREATE PERMISSION ENUM (if needed)
        # ========================================
        if db.engine.dialect.name == 'postgresql':
            try:
                with db.engine.connect() as conn:
                    result = conn.execute(text("""
                        SELECT EXISTS (
                            SELECT 1 FROM pg_type WHERE typname = 'permissionlevel'
                        )
                    """))
                    
                    if not result.scalar():
                        print("📝 Creating permissionlevel enum...")
                        conn.execute(text("""
                            CREATE TYPE permissionlevel AS ENUM ('admin', 'write', 'read')
                        """))
                        conn.commit()
                        print("✅ Enum created")
            except Exception as e:
                print(f"⚠️  Could not check/create enum: {str(e)}")
        
        # ========================================
        # 3. BASIC CONSISTENCY CHECKS
        # ========================================
        print("\n🔍 Running consistency checks...")
        
        try:
            with db.engine.connect() as conn:
                # Check 1: Orphaned working copies
                if 'working_copies' in existing_tables and 'projects' in existing_tables:
                    result = conn.execute(text("""
                        SELECT COUNT(*) FROM working_copies wc
                        LEFT JOIN projects p ON wc.project_id = p.id
                        WHERE p.id IS NULL
                    """))
                    orphaned_wc = result.scalar()
                    
                    if orphaned_wc > 0:
                        print(f"   🧹 Cleaning {orphaned_wc} orphaned working copies...")
                        conn.execute(text("""
                            DELETE FROM working_copies 
                            WHERE project_id NOT IN (SELECT id FROM projects)
                        """))
                        conn.commit()
                
                # Check 2: Collaborative projects without latest_commit_id
                if 'collaborative_projects' in existing_tables and 'commits' in existing_tables:
                    result = conn.execute(text("""
                        SELECT COUNT(*) FROM collaborative_projects cp
                        WHERE cp.latest_commit_id IS NULL
                        AND EXISTS (
                            SELECT 1 FROM commits c 
                            WHERE c.collaborative_project_id = cp.id
                        )
                    """))
                    missing_latest = result.scalar()
                    
                    if missing_latest > 0:
                        print(f"   🔧 Fixing {missing_latest} projects without latest_commit_id...")
                        conn.execute(text("""
                            UPDATE collaborative_projects cp
                            SET latest_commit_id = (
                                SELECT c.project_id 
                                FROM commits c 
                                WHERE c.collaborative_project_id = cp.id 
                                ORDER BY c.commit_number DESC 
                                LIMIT 1
                            )
                            WHERE cp.latest_commit_id IS NULL
                        """))
                        conn.commit()
                
                # Check 3: Working copies with NULL has_changes
                if 'working_copies' in existing_tables:
                    result = conn.execute(text("""
                        SELECT COUNT(*) FROM working_copies 
                        WHERE has_changes IS NULL
                    """))
                    null_changes = result.scalar()
                    
                    if null_changes > 0:
                        print(f"   🔧 Fixing {null_changes} working copies with NULL has_changes...")
                        conn.execute(text("""
                            UPDATE working_copies 
                            SET has_changes = FALSE 
                            WHERE has_changes IS NULL
                        """))
                        conn.commit()
                
                print("✅ Consistency checks complete")
                
        except Exception as e:
            print(f"⚠️  Consistency check warning: {str(e)}")
        
        # ========================================
        # 4. SUMMARY
        # ========================================
        print("\n" + "="*60)
        print("✅ Database Ready!")
        print("="*60)
        
        try:
            with db.engine.connect() as conn:
                # Quick counts
                key_tables = ['users', 'projects', 'collaborative_projects']
                counts = []
                
                for table in key_tables:
                    if table in existing_tables:
                        result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                        count = result.scalar()
                        counts.append(f"{table}:{count}")
                
                print(f"📊 {', '.join(counts)}")
        except:
            pass
        
        print("\n")
# Create tables before the first request (Flask 2.0+ compatible approach)
with app.app_context():
    db.create_all()
    
# Run migrations
run_migrations()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5006 , debug=True)