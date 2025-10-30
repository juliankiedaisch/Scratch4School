# Race Condition Fixes - Deployment Checklist

## Pre-Deployment Steps

### 1. Review Changes
- [ ] Review all code changes in the PR
- [ ] Verify that changes are minimal and focused
- [ ] Check that no breaking changes were introduced

### 2. Database Migration
Before deploying the code changes, you **must** run the database migration to add the `version` column to the `projects` table.

#### For SQLite:
```bash
cd backend
sqlite3 db/main.db
```
```sql
ALTER TABLE projects ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
.quit
```

#### For PostgreSQL:
```bash
cd backend
psql -U your_user -d your_database
```
```sql
ALTER TABLE projects ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
\q
```

#### Using Alembic (if configured):
```bash
cd backend
alembic upgrade head
```

### 3. Verify Database Schema
After running the migration, verify the schema:

```sql
-- SQLite
.schema projects

-- PostgreSQL
\d projects
```

You should see the `version` column with type `INTEGER` and default value `1`.

## Deployment Steps

### 1. Backup Database
```bash
# SQLite
cp db/main.db db/main.db.backup.$(date +%Y%m%d_%H%M%S)

# PostgreSQL
pg_dump -U your_user your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Stop Application
```bash
# Stop your application server
# Example: systemctl stop scratch4school
# Or: kill the gunicorn/uvicorn process
```

### 3. Pull Latest Code
```bash
git pull origin copilot/fix-race-conditions-database-operations
```

### 4. Install Dependencies (if needed)
```bash
cd backend
pip install -r requirements.txt
```

### 5. Run Database Migration
See step 2 in Pre-Deployment Steps above.

### 6. Restart Application
```bash
# Restart your application server
# Example: systemctl start scratch4school
# Or: start gunicorn/uvicorn process
```

## Post-Deployment Verification

### 1. Check Application Logs
```bash
# Check for any startup errors
tail -f /path/to/logs/application.log
```

Look for:
- ✅ Successful database connection
- ✅ Connection pool initialized
- ✅ All routes registered
- ❌ Any SQLAlchemy errors
- ❌ Any import errors

### 2. Test Basic Functionality

#### Test 1: Project Creation
```bash
curl -X POST http://your-server/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "project_file=@test.sb3" \
  -F "title=Test Project"
```

Expected: HTTP 200, project created successfully

#### Test 2: Project Update
```bash
curl -X PUT http://your-server/api/projects/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "project_file=@updated.sb3" \
  -F "title=Updated Project"
```

Expected: HTTP 200, project updated successfully

#### Test 3: Asset Upload
```bash
curl -X POST http://your-server/api/assets/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "asset=@sprite.png" \
  -F "type=costume" \
  -F "format=png"
```

Expected: HTTP 200, asset ID returned

#### Test 4: User Login
```bash
# Log in via OAuth flow
# Verify no duplicate users created
```

### 3. Monitor Database Connections
For PostgreSQL:
```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'your_database';
```

Expected: Should stay around 20-40 connections under normal load

### 4. Test Concurrent Access
Use the provided test script:
```bash
cd backend
python3 test_race_conditions.py
```

Expected: All tests should pass

### 5. Monitor Error Logs
```bash
# Watch for any race condition errors
grep -i "error\|exception\|failed" /path/to/logs/application.log
```

## Rolling Back (if needed)

If issues arise, you can rollback:

### 1. Stop Application
```bash
# Stop your application server
```

### 2. Revert Code Changes
```bash
git revert HEAD~3  # Revert last 3 commits
# Or
git checkout previous-stable-tag
```

### 3. Restore Database (if needed)
```sql
-- SQLite
-- Restore from backup
cp db/main.db.backup.TIMESTAMP db/main.db

-- PostgreSQL
-- Restore from backup
psql -U your_user your_database < backup_TIMESTAMP.sql
```

### 4. Drop Version Column (optional)
If you want to completely remove the changes:
```sql
ALTER TABLE projects DROP COLUMN version;
```

### 5. Restart Application
```bash
# Restart your application server
```

## Performance Monitoring

### Key Metrics to Monitor

1. **Database Connection Pool Usage**
   - Metric: Active connections
   - Threshold: Should not exceed 60 (20 base + 40 overflow)
   - Action: If consistently high, consider increasing pool size

2. **Query Response Time**
   - Metric: Average query execution time
   - Threshold: Should remain similar to before deployment
   - Action: If increased, check for lock contention

3. **Lock Wait Time**
   - Metric: Time waiting for locks (PostgreSQL: `pg_locks`)
   - Threshold: Should be minimal (<100ms)
   - Action: If high, may need to adjust application logic

4. **Error Rate**
   - Metric: Application errors per minute
   - Threshold: Should remain at baseline
   - Action: Check logs for "modified by another user" messages

### Monitoring Queries

#### PostgreSQL - Check Lock Waits:
```sql
SELECT 
    l.pid,
    l.locktype,
    l.relation::regclass,
    l.mode,
    l.granted,
    a.query
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted
ORDER BY l.pid;
```

#### PostgreSQL - Check Connection Pool:
```sql
SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active,
    count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity
WHERE datname = 'your_database';
```

## Troubleshooting

### Issue 1: "Project was modified by another user"
**Cause**: Two users editing the same project simultaneously
**Solution**: Expected behavior - user should refresh and try again
**Action**: No action needed, this is working as intended

### Issue 2: Connection pool exhausted
**Cause**: Too many concurrent connections
**Solution**: Increase pool_size and max_overflow in config.py
**Action**: Adjust configuration and restart

### Issue 3: Deadlock errors
**Cause**: Circular lock dependencies
**Solution**: Review application logic and lock ordering
**Action**: Check application logs for specific queries

### Issue 4: Slow queries after deployment
**Cause**: `with_for_update()` locks may cause contention
**Solution**: Reduce lock duration, optimize queries
**Action**: Profile specific slow queries

## Success Indicators

After 24-48 hours of deployment:

✅ No data loss incidents reported
✅ No duplicate user/group records created
✅ No "lost project" complaints
✅ Connection pool stable (not growing unbounded)
✅ Error rates at baseline levels
✅ User complaints about conflicts are rare and handled correctly

## Contact Information

If issues arise:
- Check: `backend/RACE_CONDITION_FIXES.md` for implementation details
- Review: Application logs for specific errors
- Test: Run `backend/test_race_conditions.py` to verify basic functionality

## Additional Resources

- SQLAlchemy Documentation: https://docs.sqlalchemy.org/
- Connection Pooling: https://docs.sqlalchemy.org/en/14/core/pooling.html
- Row Locking: https://docs.sqlalchemy.org/en/14/orm/query.html#sqlalchemy.orm.Query.with_for_update
- PostgreSQL Locking: https://www.postgresql.org/docs/current/explicit-locking.html
