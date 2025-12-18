# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FingerFlow** is a high-performance typing diagnostics application that tracks detailed biomechanical data (keystroke latency, dwell time, flight time) to optimize user typing efficiency. This is not just a WPM tracker—it's a typing diagnostics tool that records every keydown and keyup event to analyze individual finger performance.

## Architecture

**Stack:**
- **Backend:** Python 3.10+ with FastAPI (async), SQLAlchemy 2.0+, structlog for JSON logging
- **Frontend:** React 18+ (functional components, hooks only), CSS Variables for theming, Tailwind CSS for layout geometry only
- **Database:** PostgreSQL 16 (production and development), consider TimescaleDB extension for TelemetryEvent table for advanced time-series queries
- **Auth:** JWT with python-jose, Google OAuth2 flow

**Key Architecture Principles:**
1. Backend acts as both API server and Log Proxy for centralized logging
2. Frontend buffers telemetry events and sends in batches (50 events or 5 seconds)
3. All database writes must use bulk insert operations for performance
4. CSS Variable-driven theming (never use Tailwind for colors)

## Environment Configuration

### Overview

The project uses environment variables for configuration. Each component has its own `.env` file:

```
fingerflow/
├── backend/.env          # Backend configuration (git-ignored)
├── backend/.env.example  # Backend template with documentation
├── frontend/.env         # Frontend configuration (git-ignored)
└── frontend/.env.example # Frontend template
```

### Quick Setup

**For Docker Development (Recommended):**

```bash
# 1. Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env if you need custom settings (defaults work for Docker)

# 2. Frontend environment
cp frontend/.env.example frontend/.env
# Frontend .env has correct defaults, no changes needed

# 3. Start services
./scripts/start.sh --dev
```

**For Local Development (Without Docker):**

```bash
# 1. Set up PostgreSQL locally
createdb -U postgres fingerflow

# 2. Configure backend
cp backend/.env.example backend/.env
# Edit backend/.env:
#   DATABASE_URL=postgresql://postgres:password@localhost:5432/fingerflow

# 3. Configure frontend
cp frontend/.env.example frontend/.env
# Defaults are correct for local dev

# 4. Run services
cd backend && source .venv/bin/activate && uvicorn main:app --reload
cd frontend && npm run dev
```

### Backend Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT signing key (generate with `openssl rand -hex 32`)

**Optional but Recommended:**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Google OAuth login
- `CORS_ORIGINS` - Allowed frontend origins (comma-separated)
- `LOG_LEVEL` - DEBUG, INFO, WARNING, ERROR, or CRITICAL

**Email Configuration (Optional):**
- `EMAIL_PROVIDER` - `console` (dev), `smtp`, or `sendgrid`
- For SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`
- For SendGrid: `SENDGRID_API_KEY`

**See `backend/.env.example` for complete documentation.**

### Frontend Environment Variables

**Required:**
- `VITE_API_URL` - Backend API URL (default: `http://localhost:8000`)

**That's it!** Frontend has minimal configuration.

### Docker Compose Environment

Docker Compose uses `docker-compose.dev.yml` to override environment variables for development:

- `DATABASE_URL` is automatically set to use the `postgres` container
- `CORS_ORIGINS` includes `http://localhost:5173` for Vite dev server
- Other settings can be overridden in `.env` files if needed

### Security Notes

1. **Never commit `.env` files** - they contain secrets (already in `.gitignore`)
2. **Generate unique `SECRET_KEY`** for production: `openssl rand -hex 32`
3. **Use strong database passwords** in production
4. **Don't use default passwords** (`fingerflow_dev_password` is only for local dev)

## Database Schema

### User
- Core fields: id, email (unique, indexed), hashed_password, auth_provider ('local'/'google'), created_at (unix ms)

### TypingSession
- Links to user_id, tracks start_time, end_time, wpm, accuracy
- All times stored as BigInteger (unix milliseconds)

### TelemetryEvent (High-Frequency Table)
- **Critical:** This is the "big data" table that receives thousands of events per session
- Fields: session_id, event_type (DOWN/UP), key_code, timestamp_offset (ms since session start), finger_used, is_error
- **Production:** Should use TimescaleDB hypertable for efficient time-series queries

## Development Commands

### Docker-Based Development (Recommended)

```bash
# Start development environment (includes PostgreSQL)
./scripts/start.sh --dev

# View logs
./scripts/logs.sh --dev

# Stop services
./scripts/stop.sh --dev

# Rebuild containers (after dependency changes)
./scripts/restart.sh --dev --rebuild

# Check service status
./scripts/status.sh
```

### Local Development (Without Docker)

**Prerequisites:**
- PostgreSQL 16+ running locally
- Create database: `createdb -U postgres fingerflow`

```bash
# Backend setup
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure database (create .env from .env.example)
cp .env.example .env
# Edit .env and set: DATABASE_URL=postgresql://user:pass@localhost:5432/fingerflow

# Run development server
uvicorn main:app --reload --log-level debug

# Frontend setup
cd frontend
npm install
npm run dev
```

### Testing
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Database Migrations with SQL

**IMPORTANT: We use simple SQL migrations (not Alembic). Never delete the database in production!**

SQL migrations are automatically run on application startup via `start-prod.sh`. Migrations are plain SQL files in `backend/migrations/` tracked by a `schema_migrations` table.

**Why SQL Migrations Instead of Alembic:**
- ✅ Transparent: Plain SQL you can read and understand
- ✅ No race conditions with multi-worker Uvicorn
- ✅ Easy to debug: Just SQL, no framework complexity
- ✅ Predictable: No autogeneration surprises

**Creating a New Migration:**

```bash
# 1. Create numbered SQL file (next number in sequence)
cd backend/migrations
nano 002_add_new_feature.sql

# 2. Write SQL (see template below)
# 3. Test migration
docker exec fingerflow-backend python migrate.py

# 4. Commit the migration file
git add backend/migrations/002_add_new_feature.sql
git commit -m "feat: Add new feature"
```

**Migration Template:**

```sql
-- Brief description of what this migration does
-- Version: NNN

-- Your SQL changes here
ALTER TABLE users ADD COLUMN new_field VARCHAR(100);
CREATE INDEX idx_users_new_field ON users(new_field);

-- Always update schema_migrations table at the end
INSERT INTO schema_migrations (version, description)
VALUES (NNN, 'Brief description');
```

**Common Migration Commands:**

```bash
# Check current migration version
docker exec fingerflow-backend python migrate.py --current

# Run all pending migrations
docker exec fingerflow-backend python migrate.py

# Reset database (WARNING: deletes all data!)
docker exec fingerflow-backend python migrate.py --reset

# Or use the convenience script
./scripts/reset-database.sh
```

**Migration Best Practices:**

- **Never edit applied migrations** - create a new migration instead
- **Use numbered files** - 001, 002, 003, etc.
- **One logical change per migration** - keep migrations focused
- **Always include INSERT into schema_migrations** at the end
- **Test locally first** before deploying to production
- **Backup before big changes** - use `pg_dump` before major migrations

**Complete Migration Documentation:**

See `backend/migrations/README.md` for complete guide including:
- File naming conventions
- Best practices
- Troubleshooting
- Comparison with Alembic

**Emergency: Resetting Development Database**

```bash
# Quick reset (deletes all data!)
./scripts/reset-database.sh

# Or manually:
./scripts/stop.sh --dev
docker volume rm fingerflow_postgres-data
./scripts/start.sh --dev
```

### Database Management

**PostgreSQL in Docker (Development & Production):**

```bash
# Access PostgreSQL CLI
docker exec -it fingerflow-postgres psql -U fingerflow -d fingerflow

# View database logs
docker logs fingerflow-postgres

# Monitor connection pool stats
docker exec -it fingerflow-postgres psql -U fingerflow -d fingerflow -c "SELECT * FROM pg_stat_activity;"

# Check database size
docker exec -it fingerflow-postgres psql -U fingerflow -d fingerflow -c "SELECT pg_size_pretty(pg_database_size('fingerflow'));"
```

**Backup & Restore:**

```bash
# Create backup (with compression)
docker exec fingerflow-postgres pg_dump -U fingerflow -Fc fingerflow > backup_$(date +%Y%m%d_%H%M%S).dump

# Restore from backup
docker exec -i fingerflow-postgres pg_restore -U fingerflow -d fingerflow < backup.dump

# SQL format backup (human-readable)
docker exec fingerflow-postgres pg_dump -U fingerflow fingerflow > backup.sql

# Restore SQL backup
docker exec -i fingerflow-postgres psql -U fingerflow fingerflow < backup.sql
```

**Performance Tuning for TelemetryEvent Table:**

The TelemetryEvent table is high-frequency and benefits from PostgreSQL-specific optimizations:

```sql
-- Create index for session-based queries
CREATE INDEX idx_telemetry_session_time ON telemetry_events(session_id, timestamp_offset);

-- Optional: Enable TimescaleDB extension for time-series optimization
CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT create_hypertable('telemetry_events', 'created_at', if_not_exists => TRUE);

-- Monitor table bloat
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables WHERE tablename = 'telemetry_events';
```

**Connection Pooling Configuration:**

The backend uses SQLAlchemy connection pooling (configured in `app/database.py`):
- `pool_size=10`: Number of persistent connections
- `max_overflow=20`: Additional connections during peak load
- `pool_pre_ping=True`: Validates connections before use (prevents stale connections)

### Production Deployment

**PostgreSQL Production Checklist:**

1. **Environment Variables** (set in `.env` or Docker secrets):
   ```bash
   DATABASE_URL=postgresql://fingerflow:STRONG_PASSWORD@postgres:5432/fingerflow
   SECRET_KEY=generate-with-openssl-rand-hex-32
   POSTGRES_PASSWORD=use-strong-password-here
   ```

2. **Security Hardening:**
   - Change default PostgreSQL password (never use `fingerflow_dev_password`)
   - Use environment-based secrets management (Docker secrets, Kubernetes secrets, AWS Secrets Manager)
   - Restrict PostgreSQL port (don't expose 5432 publicly)
   - Enable SSL/TLS for PostgreSQL connections in production

3. **Persistent Volume:**
   - The `postgres-data` volume ensures data persists across container restarts
   - Backup strategy: Schedule daily `pg_dump` via cron or backup service
   - Consider point-in-time recovery (PITR) with WAL archiving for critical data

4. **Monitoring:**
   ```bash
   # Check service health
   ./scripts/status.sh

   # Monitor database performance
   docker exec -it fingerflow-postgres psql -U fingerflow -d fingerflow \
     -c "SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;"
   ```

5. **Migration from SQLite:**
   - Export SQLite data: `sqlite3 fingerflow.db .dump > sqlite_export.sql`
   - Manually convert to PostgreSQL schema (timestamps, autoincrement differences)
   - Or use tools like `pgloader` for automated migration

6. **Scaling Considerations:**
   - For high-traffic deployments, consider read replicas
   - Use connection pooling middleware (PgBouncer) for >1000 concurrent users
   - Enable TimescaleDB extension for efficient telemetry time-series queries

## Critical Implementation Guidelines

### Backend Performance Requirements

**Telemetry Ingestion (POST /api/sessions/{id}/telemetry):**
- Endpoint receives batches of 20-50 events
- **Must use bulk insert—never insert one by one**
- Return 200 OK immediately after validation and insert
- This is the highest-frequency endpoint in the application

**Structured Logging Proxy (POST /api/system/logs):**
- Frontend sends: `{ level, message, context, timestamp }`
- Backend injects: `user_id` (from JWT) and `source="frontend"`
- Use structlog to output JSON to stdout for centralized log aggregation

### Frontend Performance Requirements

**Telemetry Buffer Strategy:**
- Create a TelemetryManager class/hook that listens to window.keydown/keyup
- **Never send API request on every keystroke**
- Buffer rule: Flush when `buffer.length > 50` OR `time > 5000ms`
- Use `navigator.sendBeacon` for flush-on-unload reliability
- Cache locally (localStorage) and retry if backend is offline

**React Rendering Optimization:**
- **Critical:** No React re-renders on every keystroke for entire document
- Use CSS classes on individual character `<span>` elements
- Use CSS transforms for container movement (translateX/translateY)
- Visual feedback must be <16ms (use state-based CSS classes)

### View Modes & Smooth Scrolling

**Mode A: Ticker Tape (Horizontal Flow)**
- Current character is fixed at horizontal center (50%)
- Entire text strip slides from right to left
- Use `transform: translateX(...)` with `transition: transform 100ms linear`
- **Important:** If user types faster than transition speed (>100 WPM), dynamically shorten or disable transition to prevent input lag

**Mode B: Rolling Window (Vertical Flow)**
- Active line fixed at vertical center
- Text block slides upward on line completion
- Use `transform: translateY(...)` with cubic-bezier easing
- Previous/future lines at 50% opacity, active line at 100%

### Theming System

**CSS Variables (Required):**
```css
--bg-app, --bg-panel         /* Backgrounds */
--text-main, --text-dim       /* Typography */
--accent-primary, --accent-glow /* Highlights */
--status-error                /* Feedback */
```

**Rule:** Define themes in `:root` and `[data-theme="..."]` attribute selectors. Tailwind CSS is used **only** for layout geometry (grid, flex, padding)—never for colors.

## Analytics & Metrics

The backend must calculate these metrics on-demand using SQL aggregation or Pandas/Polars:

### Basic Performance Metrics
- **CPM:** Total Correct Keystrokes / Time (min)
- **Raw WPM (Gross):** (Total Keystrokes / 5) / Time (min)
- **Productive WPM (Net):** Raw WPM - (Uncorrected Errors / Time (min))
- **Accuracy:** (Correct Keystrokes / Total Keystrokes) * 100

### Biomechanical Metrics (Core Differentiator)
- **Dwell Time:** KeyUp timestamp - KeyDown timestamp (per key, per finger, global avg)
- **Flight Time:** KeyDown(current) - KeyUp(previous) (inter-key latency, negative values indicate N-key rollover)
- **Transition Time:** KeyDown(current) - KeyDown(previous) (digraph latency for letter pairs like 'th', 'er')

### Aggregation Scopes
- **Session:** Single session_id
- **Windowed:** Specific time slice (e.g., seconds 30-60) for fatigue detection
- **Historical:** Last N sessions or date range
- **Evolution/Trend:** Time-series showing delta over user's entire history

## Authentication Flow

1. **Local Auth:** POST /auth/register and POST /auth/login (returns JWT)
2. **Google OAuth:**
   - GET /auth/google/login → Returns Google Auth URL
   - GET /auth/google/callback → Exchanges code for token, creates/gets user, issues JWT

## Visual Feedback Requirements

**Character States:**
- Pending: Default text color
- Correct: Green (or theme primary) **instantly**
- Error: Red (or theme error) **instantly**
- Current: Highlighted (inverted colors, background block, or scale animation)

**Flash Effect:** On error, container briefly flashes subtle red background tint for peripheral awareness.

## Code Organization Notes

- Use SQLAlchemy 2.0+ strict typing and new 2.0 syntax
- All async endpoints must be marked `async def` (mandatory for telemetry ingestion)
- FastAPI dependency injection for JWT validation and user context
- Frontend: Functional components with hooks only (no class components)
- Use Lucide-React for icons

## Development Workflow

1. **Backend Skeleton:** Setup FastAPI, structlog config, database connection, SQLAlchemy models
2. **Auth Layer:** JWT generation/validation, Google OAuth flow
3. **API & Analytics:** Telemetry ingestion (optimized for bulk writes), log proxy, analytics engine (Section 4.4 of spec)
4. **Frontend Logic:** React root, TelemetryManager, input handling
5. **UI Construction:** TickerTape, RollingWindow, VirtualKeyboard components with CSS Variable theming. **Crucial:** Tune CSS transitions for smooth scrolling requirements.

## Performance Considerations

- **No jumpy DOM updates:** Use CSS transforms for smooth motion
- **Bulk database operations:** Never iterate individual inserts
- **Telemetry buffering:** Batch client-side before network requests
- **Component optimization:** Minimize React re-renders during typing
- **Keyboard visual guidance:** Display virtual keyboard with highlighted key/finger for current character

## Error Handling

- Frontend must never crash if backend is offline
- Cache telemetry locally (localStorage) and retry on reconnection
- All API errors should be logged through the log proxy
- Structured logging (JSON) for both frontend and backend events

## Additional Notes

For full specification details, see `docs/master_spec.md` (Version 1.3.0).
