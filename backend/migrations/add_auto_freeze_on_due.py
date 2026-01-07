"""
Migration: Add auto_freeze_on_due column to assignments table
Date: 2025-12-20
Description: 
    - Adds auto_freeze_on_due boolean column to assignments table
"""

import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from sqlalchemy import text, inspect


def run_migration():
    """Add auto_freeze_on_due column to assignments table"""
    
    app = create_app(os.environ.get("DEBUG", "False"))
    
    with app.app_context():
        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        print("\n" + "="*80)
        print("🚀 ADD AUTO_FREEZE_ON_DUE MIGRATION")
        print("="*80 + "\n")
        
        connection = db.engine.connect()
        trans = connection.begin()
        
        try:
            if 'assignments' not in existing_tables:
                print("❌ Error: assignments table does not exist. Please run add_assignments_tables.py first.")
                return False
            
            existing_columns = [col['name'] for col in inspector.get_columns('assignments')]
            
            if 'auto_freeze_on_due' not in existing_columns:
                print("📋 Adding auto_freeze_on_due column to assignments table...")
                connection.execute(text("""
                    ALTER TABLE assignments 
                    ADD COLUMN auto_freeze_on_due BOOLEAN DEFAULT FALSE NOT NULL
                """))
                print("   ✅ Column added successfully")
            else:
                print("   ℹ️  auto_freeze_on_due column already exists, skipping...")
            
            trans.commit()
            print("\n" + "="*80)
            print("✅ MIGRATION COMPLETED SUCCESSFULLY")
            print("="*80 + "\n")
            return True
            
        except Exception as e:
            trans.rollback()
            print(f"\n❌ Migration failed: {str(e)}")
            print("   Rolling back changes...")
            return False
        finally:
            connection.close()


def rollback_migration():
    """Rollback the auto_freeze_on_due column addition"""
    
    app = create_app(os.environ.get("DEBUG", "False"))
    
    with app.app_context():
        print("\n" + "="*80)
        print("🔄 ROLLING BACK AUTO_FREEZE_ON_DUE MIGRATION")
        print("="*80 + "\n")
        
        connection = db.engine.connect()
        trans = connection.begin()
        
        try:
            print("📋 Removing auto_freeze_on_due column from assignments table...")
            connection.execute(text("""
                ALTER TABLE assignments 
                DROP COLUMN IF EXISTS auto_freeze_on_due
            """))
            print("   ✅ Column removed successfully")
            
            trans.commit()
            print("\n" + "="*80)
            print("✅ ROLLBACK COMPLETED SUCCESSFULLY")
            print("="*80 + "\n")
            return True
            
        except Exception as e:
            trans.rollback()
            print(f"\n❌ Rollback failed: {str(e)}")
            return False
        finally:
            connection.close()


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Manage auto_freeze_on_due migration')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    args = parser.parse_args()
    
    if args.rollback:
        success = rollback_migration()
    else:
        success = run_migration()
    
    sys.exit(0 if success else 1)
