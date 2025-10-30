# Database Migrations

This directory contains database migration scripts for the Scratch4School backend.

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
