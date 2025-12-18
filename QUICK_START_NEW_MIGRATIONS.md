# Quick Start: New SQL Migration System

## TL;DR

Alembic has been replaced with simple SQL migrations. Here's what you need to know:

## For Production Deployment

### If you can reset the database (RECOMMENDED):

```bash
cd /opt/fingerflow
git pull
./scripts/reset-database.sh
# Then rebuild and restart containers
```

### If you must preserve data:

```bash
# 1. Backup first!
docker exec fingerflow-postgres pg_dump -U fingerflow -Fc fingerflow > backup.dump

# 2. Update code
git pull

# 3. Remove Alembic tracking
docker exec fingerflow-postgres psql -U fingerflow -d fingerflow -c \
  "DROP TABLE IF EXISTS alembic_version CASCADE;"

# 4. Initialize new migration tracking
docker exec fingerflow-postgres psql -U fingerflow -d fingerflow << 'EOF'
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);
INSERT INTO schema_migrations (version, description)
VALUES (1, 'Migrated from Alembic')
ON CONFLICT (version) DO NOTHING;
EOF

# 5. Rebuild backend
DOMAIN=fingerflow.zitek.cloud \
SECRET_KEY=your_secret \
POSTGRES_PASSWORD=your_pass \
GOOGLE_CLIENT_ID=your_id \
GOOGLE_CLIENT_SECRET=your_secret \
SMTP_HOST=your_host \
SMTP_USERNAME=your_user \
SMTP_PASSWORD=your_pass \
docker compose -f docker-compose.prod-standalone.yml build backend --no-cache

# 6. Restart
docker compose -f docker-compose.prod-standalone.yml up -d backend
```

## Common Commands

```bash
# Check migration status
docker exec fingerflow-backend python migrate.py --current

# Run migrations manually
docker exec fingerflow-backend python migrate.py

# Reset database (deletes all data!)
docker exec fingerflow-backend python migrate.py --reset

# View backend logs
docker logs fingerflow-backend --tail 50
```

## Creating New Migrations

1. Create file: `backend/migrations/002_description.sql`
2. Write SQL (see template below)
3. Test: `docker exec fingerflow-backend python migrate.py`
4. Commit and push
5. On server: `docker restart fingerflow-backend` (auto-runs migrations)

### Migration Template

```sql
-- Brief description
-- Version: 002

ALTER TABLE users ADD COLUMN new_field VARCHAR(100);

-- Always update schema_migrations
INSERT INTO schema_migrations (version, description)
VALUES (2, 'Brief description');
```

## What Changed

### Files Added
- `backend/migrate.py` - Migration runner
- `backend/migrations/001_initial_schema.sql` - Initial schema
- `backend/migrations/README.md` - Complete guide
- `scripts/reset-database.sh` - Database reset script
- `MIGRATION_SYSTEM_UPDATE.md` - Detailed deployment guide

### Files Modified
- `backend/requirements.txt` - Removed alembic
- `backend/start-prod.sh` - Uses `python migrate.py` now
- `backend/app/database.py` - Removed Alembic code
- `backend/install-production-auth.sh` - Updated instructions

### Files Kept (for reference only)
- `backend/alembic/` - Not used anymore
- `backend/alembic.ini` - Not used anymore

## Verification Checklist

After deployment:

- [ ] `docker exec fingerflow-backend python migrate.py --current` shows version 1
- [ ] `docker exec fingerflow-postgres psql -U fingerflow -d fingerflow -c "\dt"` shows all tables
- [ ] `curl https://fingerflow.zitek.cloud/health` returns healthy status
- [ ] Can create user account
- [ ] Can create typing session

## Need Help?

- Complete guide: `MIGRATION_SYSTEM_UPDATE.md`
- Migration docs: `backend/migrations/README.md`
- Rollback instructions: `MIGRATION_SYSTEM_UPDATE.md` (Rollback Plan section)
