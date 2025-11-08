#!/usr/bin/env python3
"""
Basic test for project save handling.
Tests that the save logic correctly handles both working copies and commits.
"""

import sys
import os
import tempfile
sys.path.insert(0, '.')

# Set environment variables
os.environ.setdefault('SECRET_KEY', 'test-key')
os.environ.setdefault('FRONTEND_URL', 'http://localhost:3000')

def test_project_save_logic():
    """Test that project save handles working copies and commits correctly"""
    from app.models.projects import Project, CollaborativeProject, Commit, WorkingCopy, PermissionLevel
    from app.models.users import User
    from app import create_app, db
    
    print("Testing project save logic...")
    
    # Create temporary database file for testing
    test_db_fd, test_db_path = tempfile.mkstemp(suffix='.db')
    
    try:
        # Set database URI for this test
        os.environ['DATABASE_URI'] = f'sqlite:///{test_db_path}'
        
        app = create_app(debug=True)
        
        with app.app_context():
            # Create tables (using temporary file-based database)
            db.create_all()
            
            # Create test user
            user = User(
                id='test-user-123',
                username='testuser',
                email='test@example.com'
            )
            db.session.add(user)
            db.session.commit()
            
            # Test 1: Create collaborative project with initial commit
            print("\n[Test 1] Creating collaborative project with commit...")
            collab_project = CollaborativeProject(
                name="Test Project",
                description="Test Description",
                created_by=user.id
            )
            db.session.add(collab_project)
            db.session.flush()
            
            commit_project = Project(
                name="Test Project - Commit 1",
                description="Initial commit",
                owner_id=user.id,
                sb3_file_path="/tmp/test.sb3"
            )
            db.session.add(commit_project)
            db.session.flush()
            
            commit = Commit(
                project_id=commit_project.id,
                collaborative_project_id=collab_project.id,
                commit_number=1,
                commit_message="Initial commit",
                committed_by=user.id
            )
            db.session.add(commit)
            collab_project.latest_commit_id = commit_project.id
            db.session.commit()
            
            assert commit_project.is_commit, "Project should be a commit"
            assert not commit_project.is_working_copy, "Project should not be a working copy"
            print("✓ Commit project created successfully")
            
            # Test 2: Verify working copy logic
            print("\n[Test 2] Testing working copy creation logic...")
            
            # Check if user has a working copy (should not have one yet)
            existing_wc = user.get_working_copy(collab_project.id)
            assert existing_wc is None, "User should not have a working copy yet"
            print("✓ User does not have a working copy initially")
            
            # Simulate creating a working copy (what PUT endpoint would do)
            wc_project = Project(
                name="Test Project - Working Copy",
                description="Working copy",
                owner_id=user.id,
                sb3_file_path="/tmp/test_wc.sb3"
            )
            db.session.add(wc_project)
            db.session.flush()
            
            wc = WorkingCopy(
                project_id=wc_project.id,
                collaborative_project_id=collab_project.id,
                user_id=user.id,
                based_on_commit_id=commit_project.id,
                has_changes=False
            )
            db.session.add(wc)
            db.session.commit()
            
            assert wc_project.is_working_copy, "Project should be a working copy"
            assert not wc_project.is_commit, "Project should not be a commit"
            print("✓ Working copy created successfully")
            
            # Test 3: Verify user can retrieve their working copy
            print("\n[Test 3] Testing working copy retrieval...")
            retrieved_wc = user.get_working_copy(collab_project.id)
            assert retrieved_wc is not None, "User should have a working copy"
            assert retrieved_wc.project_id == wc_project.id, "Retrieved working copy should match"
            print("✓ Working copy retrieved successfully")
            
            # Test 4: Verify permission checks
            print("\n[Test 4] Testing permission checks...")
            has_permission = collab_project.has_permission(user, PermissionLevel.WRITE)
            assert has_permission, "Owner should have write permission"
            print("✓ Permission check passed")
        
            # Test 5: Verify project type detection
            print("\n[Test 5] Testing project type detection...")
            assert commit_project.is_commit and not commit_project.is_working_copy, "Commit should be detected correctly"
            assert wc_project.is_working_copy and not wc_project.is_commit, "Working copy should be detected correctly"
            print("✓ Project type detection works correctly")
            
            print("\n" + "="*50)
            print("✓ All tests passed!")
            print("="*50)
            
            # Clean up test database
            db.drop_all()
    
    finally:
        # Always clean up temporary database file, even if test fails
        os.close(test_db_fd)
        os.unlink(test_db_path)

if __name__ == '__main__':
    try:
        test_project_save_logic()
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
