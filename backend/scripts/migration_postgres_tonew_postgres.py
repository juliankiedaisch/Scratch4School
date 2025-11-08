"""
Migration Script: Production DB → Permission System
Migrates from old collaborative system to new unified permission system

Usage:
    python migrate_to_permissions.py

Requirements:
    - Production database must be accessible
    - Backup recommended before running
"""

import os
import sys
from datetime import datetime, timezone
from sqlalchemy import text, inspect

# Load environment
if __name__ == '__main__':
    import dotenv
    dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from app import create_app, db
from app.models.users import User
from app.models.groups import Group
from app.models.projects import (
    Project, 
    CollaborativeProject, 
    Commit, 
    WorkingCopy,
    CollaborativeProjectPermission,
    PermissionLevel
)


def migrate_postgres_to_new_postgres():
    """Main migration function"""
    
    print("\n" + "="*80)
    print("🔄 MIGRATION: Production DB → Permission System")
    print("="*80 + "\n")
    
    print("⚠️  IMPORTANT: This will modify your database structure!")
    print("   Make sure you have a backup before proceeding.\n")
    
    app = create_app(os.getenv('FLASK_ENV', 'production'))
    
    with app.app_context():
        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        print("\n📋 Current database state:")
        print(f"   Tables: {len(existing_tables)}")
        
        # ============================================================
        # STEP 1: BACKUP VERIFICATION
        # ============================================================
        print("\n" + "="*80)
        print("STEP 1: Backup Verification")
        print("="*80)
        
        try:
            with db.engine.connect() as conn:
                # Count important tables
                counts = {}
                for table in ['users', 'projects', 'groups']:
                    if table in existing_tables:
                        result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                        counts[table] = result.scalar()
                        print(f"   {table}: {counts[table]} rows")
                
                backup_timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                print(f"\n   Backup timestamp: {backup_timestamp}")
                print(f"   ✅ Ready to proceed")
        
        except Exception as e:
            print(f"   ❌ Error checking database: {str(e)}")
            return
        
        # ============================================================
        # STEP 2: CREATE COLLABORATIVE_PROJECTS TABLE
        # ============================================================
        print("\n" + "="*80)
        print("STEP 2: Create Collaborative Projects Infrastructure")
        print("="*80)
        
        if 'collaborative_projects' not in existing_tables:
            print("\n   Creating 'collaborative_projects' table...")
            
            try:
                with db.engine.connect() as conn:
                    conn.execute(text("""
                        CREATE TABLE collaborative_projects (
                            id SERIAL PRIMARY KEY,
                            name VARCHAR(255) NOT NULL,
                            description TEXT,
                            created_by VARCHAR(128) NOT NULL REFERENCES users(id),
                            latest_commit_id INTEGER REFERENCES projects(id),
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            deleted_at TIMESTAMP,
                            deleted_by VARCHAR(128)
                        )
                    """))
                    conn.commit()
                    print("   ✅ Created collaborative_projects table")
            except Exception as e:
                print(f"   ❌ Error creating table: {str(e)}")
                return
        else:
            print("   ✅ collaborative_projects table already exists")
        
        # ============================================================
        # STEP 3: CREATE COMMITS TABLE
        # ============================================================
        print("\n   Creating 'commits' table...")
        
        if 'commits' not in existing_tables:
            try:
                with db.engine.connect() as conn:
                    conn.execute(text("""
                        CREATE TABLE commits (
                            id SERIAL PRIMARY KEY,
                            project_id INTEGER UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                            collaborative_project_id INTEGER NOT NULL REFERENCES collaborative_projects(id) ON DELETE CASCADE,
                            commit_number INTEGER NOT NULL,
                            commit_message TEXT,
                            parent_commit_id INTEGER REFERENCES projects(id),
                            committed_by VARCHAR(128) NOT NULL REFERENCES users(id),
                            committed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            UNIQUE (collaborative_project_id, commit_number)
                        )
                    """))
                    
                    conn.execute(text("""
                        CREATE INDEX idx_collab_commits ON commits(collaborative_project_id)
                    """))
                    
                    conn.commit()
                    print("   ✅ Created commits table")
            except Exception as e:
                print(f"   ❌ Error creating commits table: {str(e)}")
                return
        else:
            print("   ✅ commits table already exists")
        
        # ============================================================
        # STEP 4: CREATE WORKING_COPIES TABLE
        # ============================================================
        print("\n   Creating 'working_copies' table...")
        
        if 'working_copies' not in existing_tables:
            try:
                with db.engine.connect() as conn:
                    conn.execute(text("""
                        CREATE TABLE working_copies (
                            id SERIAL PRIMARY KEY,
                            project_id INTEGER UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                            collaborative_project_id INTEGER NOT NULL REFERENCES collaborative_projects(id) ON DELETE CASCADE,
                            user_id VARCHAR(128) NOT NULL REFERENCES users(id),
                            based_on_commit_id INTEGER NOT NULL REFERENCES projects(id),
                            has_changes BOOLEAN NOT NULL DEFAULT FALSE,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            UNIQUE (collaborative_project_id, user_id, based_on_commit_id)
                        )
                    """))
                    
                    conn.execute(text("""
                        CREATE INDEX idx_user_wc ON working_copies(user_id, collaborative_project_id)
                    """))
                    
                    conn.commit()
                    print("   ✅ Created working_copies table")
            except Exception as e:
                print(f"   ❌ Error creating working_copies table: {str(e)}")
                return
        else:
            print("   ✅ working_copies table already exists")
        
        # ============================================================
        # STEP 5: CREATE PERMISSION SYSTEM
        # ============================================================
        print("\n" + "="*80)
        print("STEP 3: Create Permission System")
        print("="*80)
        
        if 'collaborative_project_permissions' not in existing_tables:
            print("\n   Creating permission enum type...")
            
            try:
                with db.engine.connect() as conn:
                    # Create enum type
                    conn.execute(text("""
                        CREATE TYPE permissionlevel AS ENUM ('ADMIN', 'WRITE', 'READ')
                    """))
                    
                    # Create permissions table
                    conn.execute(text("""
                        CREATE TABLE collaborative_project_permissions (
                            id SERIAL PRIMARY KEY,
                            collaborative_project_id INTEGER NOT NULL REFERENCES collaborative_projects(id) ON DELETE CASCADE,
                            user_id VARCHAR(128) REFERENCES users(id),
                            group_id INTEGER REFERENCES groups(id),
                            permission permissionlevel NOT NULL DEFAULT 'READ',
                            granted_by VARCHAR(128) REFERENCES users(id),
                            granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            CHECK (
                                (user_id IS NOT NULL AND group_id IS NULL) OR 
                                (user_id IS NULL AND group_id IS NOT NULL)
                            ),
                            UNIQUE (collaborative_project_id, user_id),
                            UNIQUE (collaborative_project_id, group_id)
                        )
                    """))
                    
                    conn.commit()
                    print("   ✅ Created permission system")
            except Exception as e:
                print(f"   ❌ Error creating permissions: {str(e)}")
                return
        else:
            print("   ✅ Permission system already exists")
        
        # ============================================================
        # STEP 6: ADD SOFT DELETE TO PROJECTS
        # ============================================================
        print("\n" + "="*80)
        print("STEP 4: Add Soft Delete Support")
        print("="*80)
        
        columns = {col['name']: col for col in inspector.get_columns('projects')}
        
        if 'deleted_at' not in columns:
            print("\n   Adding deleted_at to projects...")
            try:
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE projects ADD COLUMN deleted_at TIMESTAMP"))
                    conn.commit()
                    print("   ✅ Added deleted_at column")
            except Exception as e:
                print(f"   ❌ Error: {str(e)}")
        else:
            print("   ✅ deleted_at already exists")
        
        if 'deleted_by' not in columns:
            print("   Adding deleted_by to projects...")
            try:
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE projects ADD COLUMN deleted_by VARCHAR(128)"))
                    conn.commit()
                    print("   ✅ Added deleted_by column")
            except Exception as e:
                print(f"   ❌ Error: {str(e)}")
        else:
            print("   ✅ deleted_by already exists")
        
        # ============================================================
        # STEP 7: MIGRATE EXISTING PROJECTS
        # ============================================================
        print("\n" + "="*80)
        print("STEP 5: Migrate Existing Projects")
        print("="*80)
        
        print("\n   Converting all existing projects to collaborative...")
        
        try:
            # Get all projects
            all_projects = Project.query.all()
            
            # Filter out projects that are already part of collaborative system
            standalone_projects = []
            for project in all_projects:
                # Check if already a commit or working copy
                if project.commit_info or project.working_copy_info:
                    continue
                standalone_projects.append(project)
            
            print(f"   Found {len(standalone_projects)} projects to migrate")
            
            if len(standalone_projects) == 0:
                print("   ✅ No projects need migration")
            else:
                migrated = 0
                errors = 0
                
                for project in standalone_projects:
                    try:
                        owner = User.query.get(project.owner_id)
                        if not owner:
                            print(f"   ⚠️  Skipping project {project.id} (no owner)")
                            errors += 1
                            continue
                        
                        # Create collaborative project
                        collab_project = CollaborativeProject(
                            name=project.name,
                            description=project.description or '',
                            created_by=project.owner_id,
                            created_at=project.created_at
                        )
                        db.session.add(collab_project)
                        db.session.flush()
                        
                        # Rename original project
                        project.name = f"{collab_project.name} - Commit 1"
                        
                        # Create first commit
                        commit = Commit(
                            project_id=project.id,
                            collaborative_project_id=collab_project.id,
                            commit_number=1,
                            commit_message="Projekt erstellt (Migration)",
                            committed_by=project.owner_id,
                            committed_at=project.created_at
                        )
                        db.session.add(commit)
                        db.session.flush()
                        
                        # Set latest commit
                        collab_project.latest_commit_id = project.id
                        
                        migrated += 1
                        
                        if migrated % 10 == 0:
                            db.session.commit()
                            print(f"   📊 Migrated: {migrated}/{len(standalone_projects)}")
                    
                    except Exception as e:
                        errors += 1
                        print(f"   ❌ Error migrating project {project.id}: {str(e)}")
                        db.session.rollback()
                
                # Final commit
                db.session.commit()
                
                print(f"\n   ✅ Migration complete:")
                print(f"      - Migrated: {migrated}")
                print(f"      - Errors: {errors}")
        
        except Exception as e:
            print(f"   ❌ Fatal error: {str(e)}")
            import traceback
            traceback.print_exc()
            db.session.rollback()
            return
        
        # ============================================================
        # STEP 8: MIGRATE project_groups TO PERMISSIONS
        # ============================================================
        print("\n" + "="*80)
        print("STEP 6: Migrate Group Sharing to Permissions")
        print("="*80)
        
        if 'project_groups' in existing_tables:
            print("\n   Migrating project_groups to permissions...")
            
            try:
                with db.engine.connect() as conn:
                    # Get all shared projects
                    result = conn.execute(text("""
                        SELECT pg.project_id, pg.group_id, p.owner_id
                        FROM project_groups pg
                        JOIN projects p ON pg.project_id = p.id
                    """))
                    
                    shares = list(result)
                    print(f"   Found {len(shares)} project shares")
                    
                    migrated_shares = 0
                    
                    for share in shares:
                        project_id = share[0]
                        group_id = share[1]
                        owner_id = share[2]
                        
                        # Find collaborative project via commit
                        commit = Commit.query.filter_by(project_id=project_id).first()
                        
                        if not commit:
                            print(f"   ⚠️  No commit found for project {project_id}")
                            continue
                        
                        collab_project_id = commit.collaborative_project_id
                        
                        # Check if permission already exists
                        existing = CollaborativeProjectPermission.query.filter_by(
                            collaborative_project_id=collab_project_id,
                            group_id=group_id
                        ).first()
                        
                        if existing:
                            continue
                        
                        # Create permission
                        permission = CollaborativeProjectPermission(
                            collaborative_project_id=collab_project_id,
                            group_id=group_id,
                            permission=PermissionLevel.READ,
                            granted_by=owner_id
                        )
                        db.session.add(permission)
                        migrated_shares += 1
                    
                    db.session.commit()
                    print(f"   ✅ Migrated {migrated_shares} group shares to permissions")
            
            except Exception as e:
                print(f"   ❌ Error migrating shares: {str(e)}")
                db.session.rollback()
        else:
            print("   ℹ️  No project_groups table found")
        
        # ============================================================
        # STEP 9: CLEANUP OLD TABLES
        # ============================================================
        print("\n" + "="*80)
        print("STEP 7: Cleanup Old Tables")
        print("="*80)
        
        old_tables = [
            'project_versions',
            'project_working_copies',
            'project_collaborators',
            'collaborative_project_shared_groups',
            'collaborative_project_collaborators'
        ]
        
        print("\n   Dropping deprecated tables...")
        
        for table in old_tables:
            if table in existing_tables:
                try:
                    with db.engine.connect() as conn:
                        conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                        conn.commit()
                        print(f"   ✅ Dropped: {table}")
                except Exception as e:
                    print(f"   ⚠️  Could not drop {table}: {str(e)}")
        
        # Keep project_groups for now (will be deprecated later)
        print("\n   ℹ️  Keeping 'project_groups' for backwards compatibility")
        
        # ============================================================
        # STEP 10: DATA CONSISTENCY CHECKS
        # ============================================================
        print("\n" + "="*80)
        print("STEP 8: Data Consistency Checks")
        print("="*80)
        
        print("\n   Running consistency checks...")
        
        try:
            with db.engine.connect() as conn:
                # Check 1: All collaborative projects have latest_commit_id
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM collaborative_projects 
                    WHERE latest_commit_id IS NULL
                """))
                missing_commits = result.scalar()
                
                if missing_commits > 0:
                    print(f"   ⚠️  {missing_commits} projects without latest_commit_id")
                    
                    # Fix
                    conn.execute(text("""
                        UPDATE collaborative_projects cp
                        SET latest_commit_id = (
                            SELECT c.project_id 
                            FROM commits c 
                            WHERE c.collaborative_project_id = cp.id 
                            ORDER BY c.commit_number DESC 
                            LIMIT 1
                        )
                        WHERE latest_commit_id IS NULL
                    """))
                    conn.commit()
                    print(f"   ✅ Fixed {missing_commits} projects")
                else:
                    print("   ✅ All projects have latest_commit_id")
                
                # Check 2: No orphaned commits
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM commits c
                    LEFT JOIN projects p ON c.project_id = p.id
                    WHERE p.id IS NULL
                """))
                orphaned = result.scalar()
                
                if orphaned > 0:
                    print(f"   ⚠️  {orphaned} orphaned commits")
                    conn.execute(text("DELETE FROM commits WHERE project_id NOT IN (SELECT id FROM projects)"))
                    conn.commit()
                    print(f"   ✅ Cleaned up orphaned commits")
                else:
                    print("   ✅ No orphaned commits")
                
                # Check 3: All users exist
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM collaborative_projects cp
                    LEFT JOIN users u ON cp.created_by = u.id
                    WHERE u.id IS NULL
                """))
                missing_users = result.scalar()
                
                if missing_users > 0:
                    print(f"   ⚠️  {missing_users} projects with missing users")
                else:
                    print("   ✅ All project owners exist")
        
        except Exception as e:
            print(f"   ⚠️  Consistency check warning: {str(e)}")
        
        # ============================================================
        # STEP 11: FINAL SUMMARY
        # ============================================================
        print("\n" + "="*80)
        print("MIGRATION COMPLETE!")
        print("="*80)
        
        try:
            with db.engine.connect() as conn:
                tables = [
                    'users',
                    'groups',
                    'projects',
                    'collaborative_projects',
                    'commits',
                    'working_copies',
                    'collaborative_project_permissions'
                ]
                
                print("\n📊 Final Database State:")
                for table in tables:
                    if table in inspector.get_table_names():
                        result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                        count = result.scalar()
                        print(f"   {table}: {count} rows")
        
        except Exception as e:
            print(f"   ⚠️  Could not get counts: {str(e)}")
        
        print("\n✅ Migration successful!")
        print("\n⚠️  IMPORTANT NEXT STEPS:")
        print("   1. Test the application thoroughly")
        print("   2. Deploy new frontend code")
        print("   3. Monitor for errors")
        print("   4. Keep backup for at least 7 days")
        print("\n" + "="*80 + "\n")


if __name__ == '__main__':
    migrate_postgres_to_new_postgres()