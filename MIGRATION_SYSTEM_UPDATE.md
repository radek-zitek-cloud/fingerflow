# Migration System Update: Alembic → SQL Migrations

## What Changed

We've replaced Alembic with a simpler SQL-based migration system to resolve persistent issues with race conditions and complexity in production.

## Why the Change?

**Problems with Alembic:**
1. Race conditions with multi-worker Uvicorn setup (4 workers)
2. Complex file locking that didn't work reliably
3. Autogeneration surprises and false positives
4. Hard to debug migration failures
5. Unnecessary complexity for our use case

**Benefits of SQL Migrations:**
1. ✅ Transparent: Plain SQL files
2. ✅ No race conditions: Simple version tracking
3. ✅ Easy to debug: Just SQL, no framework
4. ✅ Predictable: No autogeneration surprises
5. ✅ Lightweight: Only dependency is psycopg2

## Migration Architecture

```
backend/
├── migrate.py                    # Migration runner script
├── migrations/
│   ├── README.md                 # Complete migration guide
│   └── 001_initial_schema.sql    # Initial schema
└── start-prod.sh                 # Runs migrations before workers start
```

### How It Works

1. **Migration Files**: Numbered SQL files (001, 002, 003, ...)
2. **Version Tracking**: `schema_migrations` table tracks applied versions
3. **Automatic Execution**: `start-prod.sh` runs migrations before starting Uvicorn
4. **No Race Conditions**: Single process runs migrations, then workers start

## Deployment Instructions

### Option 1: Fresh Production Deployment (Recommended)

If you're deploying to production for the first time or can afford to reset the database:

```bash
# On your VPS
cd /opt/fingerflow

# Pull latest changes
git pull

# Reset database (WARNING: Deletes all data!)
./scripts/reset-database.sh

# Rebuild containers (removes Alembic dependency)
DOMAIN=fingerflow.zitek.cloud \
SECRET_KEY=your_secret_key \
POSTGRES_PASSWORD=your_password \
GOOGLE_CLIENT_ID=your_client_id \
GOOGLE_CLIENT_SECRET=your_client_secret \
SMTP_HOST=your_smtp_host \
SMTP_USERNAME=your_smtp_username \
SMTP_PASSWORD=your_smtp_password \
docker compose -f docker-compose.prod-standalone.yml build --no-cache

# Start services
DOMAIN=fingerflow.zitek.cloud \
SECRET_KEY=your_secret_key \
POSTGRES_PASSWORD=your_password \
GOOGLE_CLIENT_ID=your_client_id \
GOOGLE_CLIENT_SECRET=your_client_secret \
SMTP_HOST=your_smtp_host \
SMTP_USERNAME=your_smtp_username \
SMTP_PASSWORD=your_smtp_password \
docker compose -f docker-compose.prod-standalone.yml up -d

# Verify
docker exec fingerflow-backend python migrate.py --current
docker logs fingerflow-backend
```

### Option 2: Update Existing Deployment (Preserve Data)

If you have production data and need to preserve it:

```bash
# On your VPS
cd /opt/fingerflow

# 1. BACKUP DATABASE FIRST!
docker exec fingerflow-postgres pg_dump -U fingerflow -Fc fingerflow > \
  backup_before_migration_$(date +%Y%m%d_%H%M%S).dump

# 2. Pull latest changes
git pull

# 3. Rebuild backend (removes Alembic)
DOMAIN=fingerflow.zitek.cloud \
SECRET_KEY=your_secret_key \
POSTGRES_PASSWORD=your_password \
GOOGLE_CLIENT_ID=your_client_id \
GOOGLE_CLIENT_SECRET=your_client_secret \
SMTP_HOST=your_smtp_host \
SMTP_USERNAME=your_smtp_username \
SMTP_PASSWORD=your_smtp_password \
docker compose -f docker-compose.prod-standalone.yml build backend --no-cache

# 4. Remove old Alembic tracking
docker exec fingerflow-postgres psql -U fingerflow -d fingerflow -c \
  "DROP TABLE IF EXISTS alembic_version CASCADE;"

# 5. Create schema_migrations table and mark as migrated
docker exec fingerflow-postgres psql -U fingerflow -d fingerflow << 'EOF'
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);
INSERT INTO schema_migrations (version, description)
VALUES (1, 'Migrated from Alembic (existing schema preserved)')
ON CONFLICT (version) DO NOTHING;
EOF

# 6. Restart backend
DOMAIN=fingerflow.zitek.cloud \
SECRET_KEY=your_secret_key \
POSTGRES_PASSWORD=your_password \
GOOGLE_CLIENT_ID=your_client_id \
GOOGLE_CLIENT_SECRET=your_client_secret \
SMTP_HOST=your_smtp_host \
SMTP_USERNAME=your_smtp_username \
SMTP_PASSWORD=your_smtp_password \
docker compose -f docker-compose.prod-standalone.yml up -d backend

# 7. Verify
docker exec fingerflow-backend python migrate.py --current
docker logs fingerflow-backend --tail 50
```

## Verification

After deployment, verify everything works:

```bash
# Check migration status
docker exec fingerflow-backend python migrate.py --current

# Should show:
# Current schema version: 1
# Recent migrations:
#   1: Initial schema with all tables (applied: ...)

# Check tables exist
docker exec fingerflow-postgres psql -U fingerflow -d fingerflow -c "\dt"

# Should show:
# - users
# - typing_sessions
# - telemetry_events
# - word_sets
# - password_reset_tokens
# - email_verification_tokens
# - refresh_tokens
# - schema_migrations

# Test application
curl https://fingerflow.zitek.cloud/health
# Should return: {"status":"healthy","database":"connected","logging":"configured"}
```

## Creating New Migrations

Going forward, create new migrations as SQL files:

```bash
# 1. Create new migration file
cd backend/migrations
nano 002_add_new_feature.sql

# 2. Write SQL
-- Description of what this migration does
-- Version: 002

ALTER TABLE users ADD COLUMN new_field VARCHAR(100);

-- Always update schema_migrations at the end
INSERT INTO schema_migrations (version, description)
VALUES (2, 'Add new_field to users table');

# 3. Test locally (if applicable)
cd ../..
docker exec fingerflow-backend python migrate.py

# 4. Deploy
git add backend/migrations/002_add_new_feature.sql
git commit -m "feat: Add new_field to users"
git push

# On server
git pull
docker restart fingerflow-backend  # Migrations run automatically
```

## Rollback Plan

If something goes wrong during deployment:

### Restore from Backup

```bash
# Stop services
docker compose -f docker-compose.prod-standalone.yml down backend

# Restore database
docker exec -i fingerflow-postgres pg_restore -U fingerflow -d fingerflow -c < backup_file.dump

# Restart services
docker compose -f docker-compose.prod-standalone.yml up -d
```

### Rollback Code Changes

```bash
# Revert git changes
git log --oneline  # Find commit before migration system change
git checkout <previous_commit>

# Rebuild with old code
docker compose -f docker-compose.prod-standalone.yml build backend --no-cache
docker compose -f docker-compose.prod-standalone.yml up -d
```

## Troubleshooting

### Backend won't start

```bash
# Check logs
docker logs fingerflow-backend --tail 100

# Common issues:
# 1. psycopg2 import error → rebuild container
# 2. Migration failed → check migration SQL syntax
# 3. Database connection error → check DATABASE_URL in .env
```

### Migration stuck or failed

```bash
# Check current version
docker exec fingerflow-backend python migrate.py --current

# Check what went wrong
docker logs fingerflow-backend | grep -i migration

# Reset if needed (WARNING: Deletes all data!)
./scripts/reset-database.sh
```

### Tables missing

```bash
# Check if migration ran
docker exec fingerflow-backend python migrate.py --current

# If version is 0, migrations didn't run
# Run manually:
docker exec fingerflow-backend python migrate.py
```

## Key Files Changed

- ✅ `backend/requirements.txt` - Removed alembic==1.12.1
- ✅ `backend/migrate.py` - New migration runner
- ✅ `backend/migrations/001_initial_schema.sql` - Initial schema
- ✅ `backend/migrations/README.md` - Migration guide
- ✅ `backend/start-prod.sh` - Calls `python migrate.py` instead of `alembic upgrade head`
- ✅ `backend/app/database.py` - Removed `run_migrations()` function
- ✅ `scripts/reset-database.sh` - New database reset script
- 🔄 `backend/alembic/` - Directory kept for reference (not used)
- 🔄 `backend/alembic.ini` - File kept for reference (not used)

## Questions?

See `backend/migrations/README.md` for complete migration system documentation.
