"""
Migration: Add Assignment System Tables
Date: 2025-12-19
Description: 
    - Creates assignments, assignment_users, assignment_groups, assignment_submissions tables
    - Creates assignment_organizers junction table
    - Adds frozen state columns to collaborative_project_permissions
"""

import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from sqlalchemy import text, inspect
from datetime import datetime


def run_migration():
    """Run the assignment system migration"""
    
    app = create_app(os.environ.get("DEBUG", "False"))
    
    with app.app_context():
        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        print("\n" + "="*80)
        print("🚀 ASSIGNMENT SYSTEM MIGRATION")
        print("="*80 + "\n")
        
        connection = db.engine.connect()
        trans = connection.begin()
        
        try:
            # ============================================================
            # STEP 1: Add frozen columns to collaborative_project_permissions
            # ============================================================
            print("📋 Step 1: Adding frozen state columns to collaborative_project_permissions...")
            
            if 'collaborative_project_permissions' in existing_tables:
                existing_columns = [col['name'] for col in inspector.get_columns('collaborative_project_permissions')]
                
                if 'is_frozen' not in existing_columns:
                    print("   Adding is_frozen column...")
                    connection.execute(text("""
                        ALTER TABLE collaborative_project_permissions 
                        ADD COLUMN is_frozen BOOLEAN DEFAULT FALSE NOT NULL
                    """))
                    print("   ✅ is_frozen column added")
                else:
                    print("   ℹ️  is_frozen column already exists")
                
                if 'frozen_at' not in existing_columns:
                    print("   Adding frozen_at column...")
                    if db.engine.dialect.name == 'postgresql':
                        connection.execute(text("""
                            ALTER TABLE collaborative_project_permissions 
                            ADD COLUMN frozen_at TIMESTAMP
                        """))
                    else:
                        connection.execute(text("""
                            ALTER TABLE collaborative_project_permissions 
                            ADD COLUMN frozen_at DATETIME
                        """))
                    print("   ✅ frozen_at column added")
                else:
                    print("   ℹ️  frozen_at column already exists")
                
                if 'frozen_by' not in existing_columns:
                    print("   Adding frozen_by column...")
                    connection.execute(text("""
                        ALTER TABLE collaborative_project_permissions 
                        ADD COLUMN frozen_by VARCHAR(128),
                        ADD CONSTRAINT fk_frozen_by FOREIGN KEY (frozen_by) REFERENCES users(id)
                    """))
                    print("   ✅ frozen_by column added")
                else:
                    print("   ℹ️  frozen_by column already exists")
                
                if 'frozen_reason' not in existing_columns:
                    print("   Adding frozen_reason column...")
                    connection.execute(text("""
                        ALTER TABLE collaborative_project_permissions 
                        ADD COLUMN frozen_reason TEXT
                    """))
                    print("   ✅ frozen_reason column added")
                else:
                    print("   ℹ️  frozen_reason column already exists")
            else:
                print("   ⚠️  collaborative_project_permissions table not found!")
            
            # ============================================================
            # STEP 2: Create assignments table
            # ============================================================
            print("\n📋 Step 2: Creating assignments table...")
            
            if 'assignments' not in existing_tables:
                if db.engine.dialect.name == 'postgresql':
                    connection.execute(text("""
                        CREATE TABLE assignments (
                            id SERIAL PRIMARY KEY,
                            name VARCHAR(255) NOT NULL,
                            description TEXT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            due_date TIMESTAMP,
                            auto_freeze_on_due BOOLEAN DEFAULT FALSE NOT NULL,
                            deleted_at TIMESTAMP,
                            deleted_by VARCHAR(128)
                        )
                    """))
                else:
                    connection.execute(text("""
                        CREATE TABLE assignments (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            name VARCHAR(255) NOT NULL,
                            description TEXT,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            due_date DATETIME,
                            auto_freeze_on_due BOOLEAN DEFAULT FALSE NOT NULL,
                            deleted_at DATETIME,
                            deleted_by VARCHAR(128)
                        )
                    """))
                print("   ✅ assignments table created")
            else:
                print("   ℹ️  assignments table already exists")
            
            # ============================================================
            # STEP 3: Create assignment_organizers junction table
            # ============================================================
            print("\n📋 Step 3: Creating assignment_organizers table...")
            
            if 'assignment_organizers' not in existing_tables:
                if db.engine.dialect.name == 'postgresql':
                    connection.execute(text("""
                        CREATE TABLE assignment_organizers (
                            assignment_id INTEGER NOT NULL,
                            user_id VARCHAR(128) NOT NULL,
                            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (assignment_id, user_id),
                            FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                        )
                    """))
                else:
                    connection.execute(text("""
                        CREATE TABLE assignment_organizers (
                            assignment_id INTEGER NOT NULL,
                            user_id VARCHAR(128) NOT NULL,
                            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (assignment_id, user_id),
                            FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                        )
                    """))
                print("   ✅ assignment_organizers table created")
            else:
                print("   ℹ️  assignment_organizers table already exists")
            
            # ============================================================
            # STEP 4: Create assignment_users table
            # ============================================================
            print("\n📋 Step 4: Creating assignment_users table...")
            
            if 'assignment_users' not in existing_tables:
                if db.engine.dialect.name == 'postgresql':
                    connection.execute(text("""
                        CREATE TABLE assignment_users (
                            id SERIAL PRIMARY KEY,
                            assignment_id INTEGER NOT NULL,
                            user_id VARCHAR(128) NOT NULL,
                            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            CONSTRAINT unique_assignment_user UNIQUE (assignment_id, user_id),
                            FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                        )
                    """))
                else:
                    connection.execute(text("""
                        CREATE TABLE assignment_users (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            assignment_id INTEGER NOT NULL,
                            user_id VARCHAR(128) NOT NULL,
                            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            CONSTRAINT unique_assignment_user UNIQUE (assignment_id, user_id),
                            FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                        )
                    """))
                print("   ✅ assignment_users table created")
            else:
                print("   ℹ️  assignment_users table already exists")
            
            # ============================================================
            # STEP 5: Create assignment_groups table
            # ============================================================
            print("\n📋 Step 5: Creating assignment_groups table...")
            
            if 'assignment_groups' not in existing_tables:
                if db.engine.dialect.name == 'postgresql':
                    connection.execute(text("""
                        CREATE TABLE assignment_groups (
                            id SERIAL PRIMARY KEY,
                            assignment_id INTEGER NOT NULL,
                            group_id INTEGER NOT NULL,
                            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            CONSTRAINT unique_assignment_group UNIQUE (assignment_id, group_id),
                            FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
                            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
                        )
                    """))
                else:
                    connection.execute(text("""
                        CREATE TABLE assignment_groups (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            assignment_id INTEGER NOT NULL,
                            group_id INTEGER NOT NULL,
                            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            CONSTRAINT unique_assignment_group UNIQUE (assignment_id, group_id),
                            FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
                            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
                        )
                    """))
                print("   ✅ assignment_groups table created")
            else:
                print("   ℹ️  assignment_groups table already exists")
            
            # ============================================================
            # STEP 6: Create assignment_submissions table
            # ============================================================
            print("\n📋 Step 6: Creating assignment_submissions table...")
            
            if 'assignment_submissions' not in existing_tables:
                if db.engine.dialect.name == 'postgresql':
                    connection.execute(text("""
                        CREATE TABLE assignment_submissions (
                            id SERIAL PRIMARY KEY,
                            assignment_id INTEGER NOT NULL,
                            user_id VARCHAR(128) NOT NULL,
                            collaborative_project_id INTEGER NOT NULL,
                            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            submitted_commit_id INTEGER,
                            grade FLOAT,
                            feedback TEXT,
                            graded_by VARCHAR(128),
                            graded_at TIMESTAMP,
                            CONSTRAINT unique_assignment_submission UNIQUE (assignment_id, user_id, collaborative_project_id),
                            FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                            FOREIGN KEY (collaborative_project_id) REFERENCES collaborative_projects(id) ON DELETE CASCADE,
                            FOREIGN KEY (submitted_commit_id) REFERENCES projects(id) ON DELETE SET NULL,
                            FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL
                        )
                    """))
                else:
                    connection.execute(text("""
                        CREATE TABLE assignment_submissions (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            assignment_id INTEGER NOT NULL,
                            user_id VARCHAR(128) NOT NULL,
                            collaborative_project_id INTEGER NOT NULL,
                            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            submitted_commit_id INTEGER,
                            grade FLOAT,
                            feedback TEXT,
                            graded_by VARCHAR(128),
                            graded_at DATETIME,
                            CONSTRAINT unique_assignment_submission UNIQUE (assignment_id, user_id, collaborative_project_id),
                            FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                            FOREIGN KEY (collaborative_project_id) REFERENCES collaborative_projects(id) ON DELETE CASCADE,
                            FOREIGN KEY (submitted_commit_id) REFERENCES projects(id) ON DELETE SET NULL,
                            FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL
                        )
                    """))
                print("   ✅ assignment_submissions table created")
            else:
                print("   ℹ️  assignment_submissions table already exists")
            
            # ============================================================
            # STEP 7: Create indexes for performance
            # ============================================================
            print("\n📋 Step 7: Creating indexes...")
            
            try:
                connection.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_assignment_users_user 
                    ON assignment_users(user_id)
                """))
                print("   ✅ Index on assignment_users.user_id created")
            except:
                print("   ℹ️  Index on assignment_users.user_id already exists")
            
            try:
                connection.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_assignment_groups_group 
                    ON assignment_groups(group_id)
                """))
                print("   ✅ Index on assignment_groups.group_id created")
            except:
                print("   ℹ️  Index on assignment_groups.group_id already exists")
            
            try:
                connection.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_assignment_submissions_user 
                    ON assignment_submissions(user_id)
                """))
                print("   ✅ Index on assignment_submissions.user_id created")
            except:
                print("   ℹ️  Index on assignment_submissions.user_id already exists")
            
            try:
                connection.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_assignment_submissions_project 
                    ON assignment_submissions(collaborative_project_id)
                """))
                print("   ✅ Index on assignment_submissions.collaborative_project_id created")
            except:
                print("   ℹ️  Index on assignment_submissions.collaborative_project_id already exists")
            
            # Commit transaction
            trans.commit()
            
            print("\n" + "="*80)
            print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
            print("="*80)
            
            # Summary
            print("\n📊 Summary:")
            print(f"   • Modified collaborative_project_permissions table (added frozen columns)")
            print(f"   • Created assignments table")
            print(f"   • Created assignment_organizers junction table")
            print(f"   • Created assignment_users table")
            print(f"   • Created assignment_groups table")
            print(f"   • Created assignment_submissions table")
            print(f"   • Created performance indexes")
            print("\n")
            
        except Exception as e:
            trans.rollback()
            print(f"\n❌ ERROR: Migration failed!")
            print(f"   {str(e)}")
            print("\n   Rolling back changes...")
            raise
        finally:
            connection.close()


def rollback_migration():
    """Rollback the assignment system migration"""
    
    app = create_app(os.environ.get("DEBUG", "False"))
    
    with app.app_context():
        print("\n" + "="*80)
        print("🔄 ROLLING BACK ASSIGNMENT SYSTEM MIGRATION")
        print("="*80 + "\n")
        
        connection = db.engine.connect()
        trans = connection.begin()
        
        try:
            # Drop tables in reverse order (respect foreign keys)
            tables_to_drop = [
                'assignment_submissions',
                'assignment_groups',
                'assignment_users',
                'assignment_organizers',
                'assignments'
            ]
            
            for table in tables_to_drop:
                try:
                    connection.execute(text(f"DROP TABLE IF EXISTS {table}"))
                    print(f"   ✅ Dropped {table}")
                except Exception as e:
                    print(f"   ⚠️  Could not drop {table}: {e}")
            
            # Remove frozen columns from collaborative_project_permissions
            print("\n   Removing frozen columns from collaborative_project_permissions...")
            try:
                if db.engine.dialect.name == 'postgresql':
                    connection.execute(text("""
                        ALTER TABLE collaborative_project_permissions 
                        DROP COLUMN IF EXISTS is_frozen,
                        DROP COLUMN IF EXISTS frozen_at,
                        DROP COLUMN IF EXISTS frozen_by,
                        DROP COLUMN IF EXISTS frozen_reason
                    """))
                else:
                    # SQLite doesn't support DROP COLUMN easily, need to recreate table
                    print("   ⚠️  SQLite rollback for columns requires manual intervention")
                
                print("   ✅ Removed frozen columns")
            except Exception as e:
                print(f"   ⚠️  Could not remove frozen columns: {e}")
            
            trans.commit()
            
            print("\n" + "="*80)
            print("✅ ROLLBACK COMPLETED!")
            print("="*80 + "\n")
            
        except Exception as e:
            trans.rollback()
            print(f"\n❌ ERROR: Rollback failed!")
            print(f"   {str(e)}")
            raise
        finally:
            connection.close()


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'rollback':
        rollback_migration()
    else:
        run_migration()
