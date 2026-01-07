"""
Database cleanup utilities
Checks for and removes orphaned entries at startup
"""
from app import db
from sqlalchemy import text


def cleanup_orphaned_entries():
    """
    Check for and clean up orphaned database entries:
    1. Frozen permissions for deleted assignments
    2. Submissions for deleted assignments
    3. Frozen permissions without corresponding submissions
    """
    print("\n🧹 Checking for orphaned entries...")
    
    cleaned = {
        'frozen_permissions': 0,
        'orphaned_submissions': 0,
        'orphaned_freezes': 0
    }
    
    try:
        with db.engine.connect() as conn:
            # ========================================
            # 1. UNFREEZE permissions for deleted assignments
            # ========================================
            result = conn.execute(text("""
                SELECT cpp.id, cpp.frozen_reason
                FROM collaborative_project_permissions cpp
                WHERE cpp.is_frozen = TRUE
                AND cpp.frozen_reason LIKE 'Assignment submission: Assignment #%'
            """))
            
            frozen_perms = result.fetchall()
            
            for perm_id, frozen_reason in frozen_perms:
                # Extract assignment ID from frozen_reason
                # Format: "Assignment submission: Assignment #123"
                try:
                    assignment_id = int(frozen_reason.split('#')[1])
                    
                    # Check if assignment is deleted
                    check_result = conn.execute(text("""
                        SELECT deleted_at FROM assignments WHERE id = :aid
                    """), {'aid': assignment_id})
                    
                    assignment_row = check_result.fetchone()
                    
                    if assignment_row and assignment_row[0] is not None:
                        # Assignment is deleted, unfreeze the permission
                        conn.execute(text("""
                            UPDATE collaborative_project_permissions
                            SET is_frozen = FALSE,
                                frozen_at = NULL,
                                frozen_by = NULL,
                                frozen_reason = NULL
                            WHERE id = :pid
                        """), {'pid': perm_id})
                        cleaned['frozen_permissions'] += 1
                    
                except (ValueError, IndexError):
                    # Could not parse assignment ID, skip
                    pass
            
            if cleaned['frozen_permissions'] > 0:
                conn.commit()
                print(f"   ✅ Unfroze {cleaned['frozen_permissions']} permissions for deleted assignments")
            
            # ========================================
            # 2. DELETE submissions for deleted assignments
            # ========================================
            result = conn.execute(text("""
                SELECT COUNT(*)
                FROM assignment_submissions asub
                INNER JOIN assignments a ON asub.assignment_id = a.id
                WHERE a.deleted_at IS NOT NULL
            """))
            
            orphaned_count = result.scalar()
            
            if orphaned_count > 0:
                conn.execute(text("""
                    DELETE FROM assignment_submissions
                    WHERE assignment_id IN (
                        SELECT id FROM assignments WHERE deleted_at IS NOT NULL
                    )
                """))
                conn.commit()
                cleaned['orphaned_submissions'] = orphaned_count
                print(f"   ✅ Deleted {orphaned_count} submissions for deleted assignments")
            
            # ========================================
            # 3. UNFREEZE permissions without corresponding active submissions
            # ========================================
            result = conn.execute(text("""
                SELECT cpp.id, cpp.collaborative_project_id, cpp.frozen_reason
                FROM collaborative_project_permissions cpp
                WHERE cpp.is_frozen = TRUE
                AND cpp.frozen_reason LIKE 'Assignment submission: Assignment #%'
                AND NOT EXISTS (
                    SELECT 1 FROM assignment_submissions asub
                    INNER JOIN assignments a ON asub.assignment_id = a.id
                    WHERE asub.collaborative_project_id = cpp.collaborative_project_id
                    AND a.deleted_at IS NULL
                    AND cpp.frozen_reason LIKE '%#' || a.id || '%'
                )
            """))
            
            orphaned_freezes = result.fetchall()
            
            if orphaned_freezes:
                for perm_id, proj_id, reason in orphaned_freezes:
                    conn.execute(text("""
                        UPDATE collaborative_project_permissions
                        SET is_frozen = FALSE,
                            frozen_at = NULL,
                            frozen_by = NULL,
                            frozen_reason = NULL
                        WHERE id = :pid
                    """), {'pid': perm_id})
                    cleaned['orphaned_freezes'] += 1
                
                conn.commit()
                print(f"   ✅ Unfroze {cleaned['orphaned_freezes']} permissions without active submissions")
            
            # ========================================
            # SUMMARY
            # ========================================
            total_cleaned = sum(cleaned.values())
            
            if total_cleaned == 0:
                print("   ✅ No orphaned entries found")
            else:
                print(f"\n   📊 Cleanup summary:")
                print(f"      • Unfroze permissions for deleted assignments: {cleaned['frozen_permissions']}")
                print(f"      • Deleted orphaned submissions: {cleaned['orphaned_submissions']}")
                print(f"      • Unfroze permissions without submissions: {cleaned['orphaned_freezes']}")
                print(f"      • Total cleaned: {total_cleaned}")
            
    except Exception as e:
        print(f"   ⚠️  Cleanup error: {str(e)}")
        import traceback
        traceback.print_exc()
    
    return cleaned
