# Database Migrations

This directory contains database migration scripts for the Scratch Editor backend.

## Available Migrations

### 1. `add_version_column.py`
Adds version tracking to projects.

### 2. `add_assignments_tables.py` (NEW)
**Date:** 2025-12-19

**Purpose:** Implements the Assignment System

**Changes:**
- Adds frozen state columns to `collaborative_project_permissions` table:
  - `is_frozen` (BOOLEAN)
  - `frozen_at` (TIMESTAMP)
  - `frozen_by` (VARCHAR(128), foreign key to users)
  - `frozen_reason` (TEXT)

- Creates `assignments` table for managing assignments
- Creates `assignment_organizers` junction table (many-to-many with users)
- Creates `assignment_users` table for individual user assignments
- Creates `assignment_groups` table for group assignments
- Creates `assignment_submissions` table for tracking submissions
- Creates performance indexes on key columns

**Usage:**
```bash
# Run migration
cd backend
python migrations/add_assignments_tables.py

# Rollback migration
python migrations/add_assignments_tables.py rollback
```

**Features Enabled:**
- Create assignments with multiple organizers
- Assign to individual users or groups
- Submit CollaborativeProjects to assignments
- Automatic freezing of projects upon submission
- Grading and feedback system
- Soft delete support

## Available Migrations

### add_version_column.py
Adds a `version` column to the `projects` table to support optimistic locking for concurrent project updates.

**Usage:**
This migration adds version tracking to prevent race conditions when multiple users modify the same project simultaneously.

**To apply this migration:**
You'll need to set up Alembic or run the migration manually:

```python
from migrations.add_version_column import upgrade, downgrade

# To upgrade
upgrade()

# To rollback
downgrade()
```

## Manual Migration (SQL)

If you're not using Alembic, you can run this SQL directly on your database:

```sql
-- Add version column with default value 1
ALTER TABLE projects ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
```

To rollback:
```sql
ALTER TABLE projects DROP COLUMN version;
```
