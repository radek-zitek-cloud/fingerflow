# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FingerFlow** is a high-performance typing diagnostics application that tracks detailed biomechanical data (keystroke latency, dwell time, flight time) to optimize user typing efficiency. This is not just a WPM tracker—it's a typing diagnostics tool that records every keydown and keyup event to analyze individual finger performance.

## Architecture

**Stack:**
- **Backend:** Python 3.10+ with FastAPI (async), SQLAlchemy 2.0+, structlog for JSON logging
- **Frontend:** React 18+ (functional components, hooks only), CSS Variables for theming, Tailwind CSS for layout geometry only
- **Database:** SQLite (dev) / PostgreSQL (prod), consider TimescaleDB extension for TelemetryEvent table in production
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

### Backend Setup
```bash
# Install dependencies
pip install -r backend/requirements.txt

# Run development server
cd backend
uvicorn main:app --reload --log-level debug

# Database migrations (if using Alembic)
alembic upgrade head
```

### Frontend Setup
```bash
# Install dependencies
cd frontend
npm install

# Run development server
npm run dev

# Build for production
npm run build
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
