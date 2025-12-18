# FingerFlow SQL Migrations

Simple, transparent SQL migration system. No magic, no autogeneration - just numbered SQL files.

## Philosophy

After dealing with Alembic's complexity and race conditions in multi-worker environments, we've switched to a simple SQL-based approach:

- ✅ **Transparent**: Plain SQL files you can read and understand
- ✅ **Predictable**: No autogeneration surprises
- ✅ **No Race Conditions**: Simple version tracking in `schema_migrations` table
- ✅ **Easy to Debug**: Just SQL - no Python migration framework
- ✅ **Version Control Friendly**: Readable diffs in git

## How It Works

1. **Migration Files**: Numbered SQL files in this directory (e.g., `001_initial_schema.sql`)
2. **Version Tracking**: `schema_migrations` table tracks which versions are applied
3. **Migration Runner**: `migrate.py` script executes pending migrations in order
4. **Automatic on Startup**: `start-prod.sh` runs migrations before starting workers

## File Naming Convention

```
NNN_description.sql
```

Where:
- `NNN` = 3-digit version number (001, 002, 003, ...)
- `description` = Brief description with underscores (e.g., `add_user_settings`)

Examples:
- `001_initial_schema.sql`
- `002_add_word_sets_table.sql`
- `003_add_account_lockout.sql`

## Running Migrations

### Automatic (Production)

Migrations run automatically when the backend starts via `start-prod.sh`:

```bash
docker restart fingerflow-backend
```

### Manual

```bash
# Run all pending migrations
docker exec fingerflow-backend python migrate.py

# Show current version
docker exec fingerflow-backend python migrate.py --current

# Reset database and rerun all migrations (DANGEROUS!)
docker exec fingerflow-backend python migrate.py --reset
```

### Local Development

```bash
cd backend
source .venv/bin/activate
python migrate.py
```

## Creating a New Migration

### Step 1: Create SQL File

Create a new file with the next version number:

```bash
cd backend/migrations
# If last migration was 001, create 002
nano 002_add_new_feature.sql
```

### Step 2: Write SQL

```sql
-- Description of what this migration does
-- Version: 002

-- Your SQL here
ALTER TABLE users ADD COLUMN new_field VARCHAR(100);

-- Always update schema_migrations table at the end
INSERT INTO schema_migrations (version, description)
VALUES (2, 'Add new_field to users table');
```

### Step 3: Test Locally

```bash
python migrate.py
```

### Step 4: Commit and Deploy

```bash
git add migrations/002_add_new_feature.sql
git commit -m "feat: Add new_field to users table"
git push

# On server
cd /opt/fingerflow
git pull
docker restart fingerflow-backend  # Migrations run automatically
```

## Best Practices

### 1. One Logical Change Per Migration

**Good:**
- `002_add_user_preferences.sql` - adds settings column
- `003_add_account_lockout.sql` - adds lockout fields

**Bad:**
- `002_misc_changes.sql` - adds 5 unrelated fields

### 2. Always Include Description

```sql
-- At the end of your migration
INSERT INTO schema_migrations (version, description)
VALUES (N, 'Brief description of what this does');
```

### 3. Test Migrations Are Idempotent (When Possible)

Use `IF NOT EXISTS` for non-destructive operations:

```sql
-- Good for adding optional constraints
ALTER TABLE users ADD COLUMN IF NOT EXISTS new_field TEXT;

-- But be careful - this won't work for all operations
```

### 4. Never Edit Applied Migrations

Once a migration is applied in production, **NEVER edit it**. Create a new migration instead.

### 5. Use Transactions Carefully

The migration runner wraps each file in a transaction. If any statement fails, the entire migration rolls back.

### 6. Backup Before Big Changes

```bash
# Create backup
docker exec fingerflow-postgres pg_dump -U fingerflow -Fc fingerflow > backup_before_migration.dump

# Run migration
python migrate.py

# If something goes wrong, restore
docker exec -i fingerflow-postgres pg_restore -U fingerflow -d fingerflow < backup_before_migration.dump
```

## Migration Template

```sql
-- Brief description of what this migration does
-- Version: NNN
-- Date: YYYY-MM-DD

-- Your SQL changes here
-- CREATE TABLE ...
-- ALTER TABLE ...
-- CREATE INDEX ...

-- Always record the migration at the end
INSERT INTO schema_migrations (version, description)
VALUES (NNN, 'Brief description');
```

## Troubleshooting

### Migration Failed Halfway

Check current version:
```bash
docker exec fingerflow-backend python migrate.py --current
```

The failed migration will NOT be recorded in `schema_migrations`. Fix the SQL and run again.

### Need to Rollback

We don't have automatic rollback. To rollback:

1. **Best**: Restore from backup
2. **Manual**: Write a new migration that reverses the changes

### Reset Development Database

```bash
# WARNING: Deletes all data!
docker exec fingerflow-backend python migrate.py --reset
```

### Check Migration Status

```bash
# See current version and recent migrations
docker exec fingerflow-backend python migrate.py --current

# Check schema_migrations table directly
docker exec fingerflow-postgres psql -U fingerflow -d fingerflow \
  -c "SELECT * FROM schema_migrations ORDER BY version;"
```

## Comparison to Alembic

| Feature | Alembic | SQL Migrations |
|---------|---------|----------------|
| Complexity | High | Low |
| Autogeneration | Yes | No (manual) |
| Learning Curve | Steep | Minimal |
| Multi-worker Safe | No* | Yes |
| Transparency | Low | High |
| Debugging | Hard | Easy |
| Dependencies | Many | psycopg2 only |

\* Alembic requires complex file locking in multi-worker environments

## Why We Switched

From conversation with development team:

> "alembic migrations are causing constant issues, would it be possible to take the alembic completely out of the application"

Issues we had with Alembic:
1. Race conditions with 4 Uvicorn workers
2. Complex file locking didn't work reliably
3. Autogeneration surprises (missed changes, false positives)
4. Hard to debug migration failures
5. Overkill for our use case

The new system is simpler, more transparent, and actually works in production.
