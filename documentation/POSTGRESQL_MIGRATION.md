# PostgreSQL Migration Guide

This guide explains how to use PostgreSQL with Scratch4School and how to migrate from SQLite to PostgreSQL if needed.

## Overview

Scratch4School now supports both SQLite and PostgreSQL databases. The choice depends on your deployment needs:

- **SQLite**: Best for development, testing, and small deployments (up to ~1000 users)
- **PostgreSQL**: Recommended for production and larger deployments with many concurrent users

## Quick Start with PostgreSQL

### 1. Using Docker Compose (Recommended)

The easiest way to use PostgreSQL is with the provided Docker Compose configurations:

```bash
cd docker/docker_behind_proxy  # or docker_with_traefik
```

Edit `docker-compose.yml` and set:

```yaml
postgres:
  environment:
    - POSTGRES_PASSWORD=CHANGE_THIS_TO_SECURE_PASSWORD

backend:
  environment:
    - DATABASE_URI=postgresql://scratch4school:CHANGE_THIS_TO_SECURE_PASSWORD@postgres:5432/scratch4school
```

**Important:** Replace `CHANGE_THIS_TO_SECURE_PASSWORD` with a strong, randomly generated password. Never use default or example passwords in production.

Start the services:

```bash
docker-compose up -d
```

The PostgreSQL service will:
- Automatically initialize on first run
- Create all necessary tables
- Be ready for connections after the health check passes

### 2. Manual PostgreSQL Setup

If you're not using Docker Compose or want to use an external PostgreSQL server:

#### Install PostgreSQL

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql
```

#### Create Database and User

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE scratch4school;
CREATE USER scratch4school WITH PASSWORD 'CHANGE_THIS_TO_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE scratch4school TO scratch4school;
\q
```

**Security Note:** Replace `CHANGE_THIS_TO_SECURE_PASSWORD` with a strong, randomly generated password (e.g., using `openssl rand -base64 32`).

#### Configure Backend

Set the `DATABASE_URI` environment variable:

```bash
export DATABASE_URI="postgresql://scratch4school:CHANGE_THIS_TO_SECURE_PASSWORD@localhost:5432/scratch4school"
```

Or in your `.env` file:

```
DATABASE_URI=postgresql://scratch4school:CHANGE_THIS_TO_SECURE_PASSWORD@localhost:5432/scratch4school
```

#### Initialize Database Tables

The application will automatically create all tables on first run when it calls `db.create_all()` in `run.py`.

## Migrating from SQLite to PostgreSQL

If you have an existing Scratch4School installation using SQLite and want to migrate to PostgreSQL:

### Option 1: Using pgloader (Recommended)

pgloader is a powerful tool that can migrate data directly from SQLite to PostgreSQL.

#### Install pgloader

```bash
# Ubuntu/Debian
sudo apt-get install pgloader

# macOS
brew install pgloader
```

#### Create Migration Script

Create a file named `migration.load`:

```
LOAD DATABASE
     FROM sqlite:///path/to/your/db/main.db
     INTO postgresql://scratch4school:CHANGE_THIS_TO_SECURE_PASSWORD@localhost:5432/scratch4school

WITH include drop, create tables, create indexes, reset sequences

SET work_mem to '16MB', maintenance_work_mem to '512 MB';
```

Replace `CHANGE_THIS_TO_SECURE_PASSWORD` with your actual PostgreSQL password.

#### Run Migration

```bash
pgloader migration.load
```

### Option 2: Manual Export/Import

For more control over the migration process:

**Security Note:** These scripts are provided as examples. Always review and test migration scripts on a copy of your data before running them on production databases.

#### Step 1: Export SQLite Data

```python
# export_sqlite.py
import sqlite3
import json

conn = sqlite3.connect('db/main.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Get all tables (excluding internal SQLite and system tables)
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'android_metadata';")
tables = [row[0] for row in cursor.fetchall()]

data = {}
for table in tables:
    # Use SQL identifier quoting to prevent injection and handle special characters
    cursor.execute(f'SELECT * FROM "{table}"')
    rows = cursor.fetchall()
    data[table] = [dict(row) for row in rows]

with open('export.json', 'w') as f:
    json.dump(data, f, indent=2, default=str)

conn.close()
print(f"Exported {len(tables)} tables to export.json")
```

Run the export:

```bash
python export_sqlite.py
```

#### Step 2: Import to PostgreSQL

```python
# import_postgresql.py
import json
import psycopg2
from psycopg2 import sql

# Connect to PostgreSQL
conn = psycopg2.connect(
    "postgresql://scratch4school:CHANGE_THIS_TO_SECURE_PASSWORD@localhost:5432/scratch4school"
)
cursor = conn.cursor()

# Load exported data
with open('export.json', 'r') as f:
    data = json.load(f)

# Import each table
for table, rows in data.items():
    if not rows:
        continue
    
    # Get column names
    columns = list(rows[0].keys())
    
    # Build INSERT statement using SQL identifiers (prevents SQL injection)
    # Use psycopg2's sql module for safe identifier quoting
    insert_sql = sql.SQL('INSERT INTO {} ({}) VALUES ({})').format(
        sql.Identifier(table),
        sql.SQL(', ').join(map(sql.Identifier, columns)),
        sql.SQL(', ').join([sql.Placeholder() for _ in range(len(columns))])
    )
    
    # Insert rows
    for row in rows:
        values = [row[col] for col in columns]
        cursor.execute(insert_sql, values)
    
    print(f"Imported {len(rows)} rows to {table}")

conn.commit()
cursor.close()
conn.close()
print("Import complete!")
```

Run the import:

```bash
python import_postgresql.py
```

### Option 3: Fresh Start (No Migration)

If you don't need to preserve existing data:

1. Backup your uploads folder: `cp -r data/uploads data/uploads.backup`
2. Update `docker-compose.yml` to use PostgreSQL
3. Remove old SQLite database: `rm -rf data/db`
4. Restart services: `docker-compose up -d`
5. The system will create fresh database tables automatically

## Verification

After migration, verify that everything works:

### Check Database Connection

```bash
docker-compose logs backend | grep -i "database"
```

You should see successful connection messages.

### Test Login

Visit your Scratch4School URL and try logging in. If successful, the database is working correctly.

### Verify Data

If you migrated data, verify that:
- Users can log in with their existing accounts
- Projects are visible and accessible
- Backpack items are present
- Groups and permissions work correctly

## Troubleshooting

### Backend Won't Start

**Check logs:**
```bash
docker-compose logs backend
```

**Common issues:**
- PostgreSQL not ready: Wait for health check to pass
- Wrong password: Verify `POSTGRES_PASSWORD` matches in both services
- Database doesn't exist: Check PostgreSQL logs

### Connection Refused

**Check PostgreSQL is running:**
```bash
docker-compose ps postgres
```

**Check database health:**
```bash
docker-compose exec postgres pg_isready -U scratch4school
```

### Migration Failed

**Check pgloader logs:**
pgloader provides detailed logs during migration. Look for specific error messages.

**Common issues:**
- Foreign key constraints: pgloader handles these, but manual imports may need proper order
- Data type mismatches: SQLAlchemy handles most, but check for any custom types
- Encoding issues: Ensure both databases use UTF-8

### Performance Issues

**Connection pooling:**
SQLAlchemy handles connection pooling automatically. For high-traffic sites, you may want to tune:

```python
# In config.py, add to Config class:
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_size': 10,
    'pool_recycle': 3600,
    'pool_pre_ping': True
}
```

**Indexes:**
The models already define appropriate indexes. For custom queries, add indexes as needed.

## Backup and Restore

### PostgreSQL Backup

```bash
# Using docker-compose
docker-compose exec postgres pg_dump -U scratch4school scratch4school > backup.sql

# Or with compression
docker-compose exec postgres pg_dump -U scratch4school scratch4school | gzip > backup.sql.gz
```

### PostgreSQL Restore

```bash
# Restore from backup
docker-compose exec -T postgres psql -U scratch4school scratch4school < backup.sql

# Or from compressed backup
gunzip < backup.sql.gz | docker-compose exec -T postgres psql -U scratch4school scratch4school
```

## Performance Comparison

| Aspect | SQLite | PostgreSQL |
|--------|--------|------------|
| Concurrent reads | Good | Excellent |
| Concurrent writes | Limited | Excellent |
| Setup complexity | Very simple | Moderate |
| Backup | Copy file | pg_dump |
| Scalability | Limited | Excellent |
| ACID compliance | Good | Excellent |
| Resource usage | Very low | Low-moderate |

## Best Practices

1. **Use PostgreSQL for production** if you expect more than 100 concurrent users
2. **Regular backups**: Schedule automated backups with cron or similar
3. **Monitor performance**: Use PostgreSQL's built-in monitoring tools
4. **Keep connection strings secure**: Never commit passwords to version control
5. **Use environment variables**: Store configuration in environment, not code
6. **Test migrations**: Always test on a copy of your data first
7. **Update statistics**: Run `ANALYZE` periodically on PostgreSQL for optimal query planning

## Support

For issues related to database migration or PostgreSQL setup:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review Docker logs: `docker-compose logs`
3. Consult PostgreSQL documentation: https://www.postgresql.org/docs/
4. Open an issue on GitHub with:
   - Your database configuration (without passwords)
   - Relevant log excerpts
   - Steps to reproduce the problem

## References

- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [pgloader Documentation](https://pgloader.readthedocs.io/)
- [Flask-SQLAlchemy Documentation](https://flask-sqlalchemy.palletsprojects.com/)
