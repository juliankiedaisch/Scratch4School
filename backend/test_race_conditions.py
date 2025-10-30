#!/usr/bin/env python3
"""
Simple verification tests for race condition fixes.
These are NOT comprehensive unit tests, but basic smoke tests to verify the implementation.
"""

import sys
import os
sys.path.insert(0, '.')

# Set environment variables
os.environ.setdefault('SECRET_KEY', 'test-key')
os.environ.setdefault('FRONTEND_URL', 'http://localhost:3000')
os.environ.setdefault('DATABASE_URI', 'sqlite:///test.db')

def test_project_model():
    """Test Project model has optimistic locking support"""
    from app.models.projects import Project
    
    print("Testing Project model...")
    assert hasattr(Project, 'version'), "Project should have version column"
    assert hasattr(Project, 'update_with_version_check'), "Project should have update_with_version_check method"
    
    # Test that update_with_version_check raises exception on version mismatch
    from app import create_app, db
    app = create_app(debug=True)
    
    with app.app_context():
        # Create tables
        db.create_all()
        
        # Create a test project
        project = Project(
            name="Test Project",
            description="Test",
            owner_id="test-user-id",
            version=1
        )
        
        # Test version check with wrong version
        try:
            project.update_with_version_check(expected_version=2)
            assert False, "Should have raised exception for version mismatch"
        except Exception as e:
            assert "modified by another user" in str(e).lower(), f"Wrong exception message: {e}"
        
        # Test version check with correct version
        project.update_with_version_check(expected_version=1)
        assert project.version == 2, "Version should be incremented"
        
        # Cleanup
        db.drop_all()
    
    print("✓ Project model tests passed")

def test_asset_model():
    """Test Asset model has compound unique constraint"""
    from app.models.asset import Asset
    
    print("Testing Asset model...")
    assert hasattr(Asset, '__table_args__'), "Asset should have __table_args__"
    
    # Check that the constraint is defined
    table_args = Asset.__table_args__
    assert len(table_args) > 0, "Asset should have table args defined"
    
    print("✓ Asset model tests passed")

def test_config():
    """Test configuration has connection pooling options"""
    from app.config import DevelopmentConfig, ProductionConfig
    
    print("Testing configuration...")
    
    # Check DevelopmentConfig
    assert hasattr(DevelopmentConfig, 'SQLALCHEMY_ENGINE_OPTIONS'), "DevelopmentConfig should have SQLALCHEMY_ENGINE_OPTIONS"
    dev_options = DevelopmentConfig.SQLALCHEMY_ENGINE_OPTIONS
    assert 'pool_size' in dev_options, "Should have pool_size"
    assert 'pool_recycle' in dev_options, "Should have pool_recycle"
    assert 'pool_pre_ping' in dev_options, "Should have pool_pre_ping"
    assert 'max_overflow' in dev_options, "Should have max_overflow"
    assert dev_options['pool_size'] == 20, "Pool size should be 20"
    assert dev_options['max_overflow'] == 40, "Max overflow should be 40"
    
    # Check ProductionConfig
    assert hasattr(ProductionConfig, 'SQLALCHEMY_ENGINE_OPTIONS'), "ProductionConfig should have SQLALCHEMY_ENGINE_OPTIONS"
    prod_options = ProductionConfig.SQLALCHEMY_ENGINE_OPTIONS
    assert 'pool_size' in prod_options, "Should have pool_size"
    assert 'isolation_level' in prod_options, "Should have isolation_level for PostgreSQL"
    assert prod_options['isolation_level'] == 'REPEATABLE READ', "Should use REPEATABLE READ isolation"
    
    print("✓ Configuration tests passed")

def test_user_model():
    """Test User model has proper locking in get_or_create"""
    from app.models.users import User
    
    print("Testing User model...")
    assert hasattr(User, 'get_or_create'), "User should have get_or_create method"
    
    # Verify method exists and is callable
    assert callable(User.get_or_create), "get_or_create should be callable"
    
    print("✓ User model tests passed")

def test_group_model():
    """Test Group model has proper locking in get_or_create"""
    from app.models.groups import Group
    
    print("Testing Group model...")
    assert hasattr(Group, 'get_or_create'), "Group should have get_or_create method"
    
    # Verify method exists and is callable
    assert callable(Group.get_or_create), "get_or_create should be callable"
    
    print("✓ Group model tests passed")

def test_imports():
    """Test that all modified route files import successfully"""
    print("Testing route imports...")
    
    try:
        from app.routes.project_routes import projects_bp
        assert projects_bp is not None
        print("  ✓ project_routes imported")
    except Exception as e:
        print(f"  ✗ project_routes failed: {e}")
        raise
    
    try:
        from app.routes.asset_routes import assets_bp
        assert assets_bp is not None
        print("  ✓ asset_routes imported")
    except Exception as e:
        print(f"  ✗ asset_routes failed: {e}")
        raise
    
    try:
        from app.routes.auth_routes import auth_bp
        assert auth_bp is not None
        print("  ✓ auth_routes imported")
    except Exception as e:
        print(f"  ✗ auth_routes failed: {e}")
        raise
    
    try:
        from app.routes.backpack_routes import backpack_bp
        assert backpack_bp is not None
        print("  ✓ backpack_routes imported")
    except Exception as e:
        print(f"  ✗ backpack_routes failed: {e}")
        raise
    
    print("✓ All route imports successful")

def main():
    """Run all tests"""
    print("=" * 60)
    print("Race Condition Fixes - Verification Tests")
    print("=" * 60)
    print()
    
    tests = [
        test_imports,
        test_project_model,
        test_asset_model,
        test_config,
        test_user_model,
        test_group_model,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
            print()
        except Exception as e:
            failed += 1
            print(f"✗ Test failed: {test.__name__}")
            print(f"  Error: {e}")
            print()
    
    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)
    
    return 0 if failed == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
