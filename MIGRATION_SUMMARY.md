# PostgreSQL Migration Summary

This document summarizes the changes made to add PostgreSQL support to Scratch4School.

## What Changed?

Scratch4School now supports **both SQLite and PostgreSQL** databases, giving you the flexibility to choose the best option for your deployment:

- **SQLite**: Simple, file-based database (default) - perfect for development and small deployments
- **PostgreSQL**: Enterprise-grade database - recommended for production and larger deployments

## Backward Compatibility

**Important**: This is a **fully backward-compatible change**. If you're already using Scratch4School with SQLite:

- ✅ Your existing setup will continue to work without any changes
- ✅ No data migration is required unless you want to switch to PostgreSQL
- ✅ All existing features work exactly the same way

## Quick Start for New Deployments

### Using SQLite (Default - No Changes Needed)

If you're happy with SQLite, you don't need to do anything. The system will use SQLite by default.

### Using PostgreSQL

To use PostgreSQL, update your `docker-compose.yml`:

1. Set a secure PostgreSQL password in the `postgres` service
2. Update the `DATABASE_URI` in the `backend` service to use PostgreSQL
3. Start your services: `docker-compose up -d`

Example:
```yaml
postgres:
  environment:
    - POSTGRES_PASSWORD=my_secure_password

backend:
  environment:
    - DATABASE_URI=postgresql://scratch4school:my_secure_password@postgres:5432/scratch4school
```

## For Existing Deployments

If you're already running Scratch4School with SQLite and want to migrate to PostgreSQL:

1. **Backup your data**: Copy your `data/` directory
2. **Review the migration guide**: See [documentation/POSTGRESQL_MIGRATION.md](documentation/POSTGRESQL_MIGRATION.md)
3. **Choose a migration method**:
   - **pgloader**: Automated migration tool (recommended)
   - **Manual export/import**: More control over the process
   - **Fresh start**: Start fresh with PostgreSQL (no data migration)

## Files Changed

### Configuration Files
- `backend/requirements.txt` - Added PostgreSQL driver
- `backend/Dockerfile` - Added PostgreSQL client libraries
- `backend/app/config.py` - Documentation for PostgreSQL URIs
- `docker/docker_behind_proxy/docker-compose.yml` - Added PostgreSQL service
- `docker/docker_with_traefik/docker-compose.yml` - Added PostgreSQL service

### Documentation Files (New)
- `documentation/POSTGRESQL_MIGRATION.md` - Comprehensive migration guide
- `backend/.env.example` - Configuration template
- `README.md` - Updated with database options

## Benefits of PostgreSQL

Consider switching to PostgreSQL if you:

- Have more than 100 concurrent users
- Experience performance issues with SQLite
- Need better data integrity and ACID compliance
- Want to scale to larger deployments
- Need advanced backup and replication features

## Need Help?

- **Migration Guide**: [documentation/POSTGRESQL_MIGRATION.md](documentation/POSTGRESQL_MIGRATION.md)
- **Configuration Examples**: See `backend/.env.example`
- **Database Comparison**: See the "Database Options" section in README.md

## Questions?

Open an issue on GitHub if you have questions or encounter any problems during migration.

---

**Summary**: PostgreSQL support is now available, but SQLite remains the default. Existing deployments continue to work without changes. Switch to PostgreSQL when you need better performance and scalability.
