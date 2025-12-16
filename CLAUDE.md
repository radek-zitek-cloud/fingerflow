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

### Database Migrations with Alembic

**IMPORTANT: Always use Alembic migrations for schema changes. Never delete the database in production!**

Alembic is configured to automatically run migrations on application startup. The backend will check for pending migrations and apply them before starting the server.

**Creating a New Migration:**

```bash
# After modifying SQLAlchemy models, generate a migration
docker exec fingerflow-backend alembic revision --autogenerate -m "Add new field to user table"

# Review the generated migration file in backend/alembic/versions/
# Edit if necessary to add data migrations or custom logic

# Apply the migration (happens automatically on startup, but you can test it)
docker exec fingerflow-backend alembic upgrade head
```

**Migration Workflow:**

1. **Modify your SQLAlchemy models** in `app/models/`
2. **Generate migration**: `alembic revision --autogenerate -m "description"`
3. **Review the migration** in `alembic/versions/` - Alembic may miss some changes (like custom types, constraints)
4. **Test the migration**: Restart the backend to trigger auto-migration
5. **Commit the migration file** to version control

**Common Migration Commands:**

```bash
# Check current migration version
docker exec fingerflow-backend alembic current

# View migration history
docker exec fingerflow-backend alembic history

# Downgrade to previous migration (use with caution!)
docker exec fingerflow-backend alembic downgrade -1

# Upgrade to specific revision
docker exec fingerflow-backend alembic upgrade <revision_id>

# Create empty migration for data changes
docker exec fingerflow-backend alembic revision -m "Populate default word sets"
```

**Migration Best Practices:**

- **Never edit applied migrations** - create a new migration instead
- **Test migrations on a copy of production data** before deploying
- **Keep migrations small and focused** - one logical change per migration
- **Write reversible migrations** - implement both `upgrade()` and `downgrade()`
- **Handle data migrations carefully** - use `op.execute()` for SQL or batch operations
- **Review autogenerated migrations** - Alembic may miss enum changes, check constraints, etc.

**Emergency: Resetting Development Database**

```bash
# Stop services
./scripts/stop.sh --dev

# Remove database volume (WARNING: deletes all data!)
docker volume rm fingerflow_postgres-data

# Restart services (migrations will create fresh schema)
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
