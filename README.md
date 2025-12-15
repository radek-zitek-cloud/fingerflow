# FingerFlow - Biomechanical Typing Diagnostics

FingerFlow is a high-performance typing diagnostics application that tracks detailed biomechanical data (keystroke latency, dwell time, flight time) to optimize user typing efficiency. This is not just a WPM tracker—it's a typing diagnostics tool that records every keydown and keyup event to analyze individual finger performance.

## Architecture Overview

**Stack:**
- **Backend:** Python 3.10+ with FastAPI (async), SQLAlchemy 2.0+, structlog for JSON logging
- **Frontend:** React 18+ (functional components, hooks only), CSS Variables for theming, Tailwind CSS for layout geometry only
- **Database:** SQLite (dev) / PostgreSQL (prod)
- **Auth:** JWT with python-jose, Google OAuth2 flow (stub)

**Key Architecture Principles:**
1. Backend acts as both API server and Log Proxy for centralized logging
2. Frontend buffers telemetry events and sends in batches (50 events or 5 seconds)
3. All database writes use bulk insert operations for performance
4. CSS Variable-driven theming (Tailwind only for layout, never colors)

## Quick Start

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env and set your SECRET_KEY

# Run development server
uvicorn main:app --reload --log-level debug
```

Backend will be available at: http://localhost:8000
API docs (Swagger): http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will be available at: http://localhost:5173

## Project Structure

```
fingerflow/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy models
│   │   ├── routes/          # API endpoints
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── utils/           # Helper functions
│   │   ├── config.py        # Configuration
│   │   ├── database.py      # Database setup
│   │   └── logging_config.py
│   ├── main.py              # FastAPI application
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API client
│   │   ├── styles/          # CSS (themes, animations)
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── docs/
│   └── master_spec.md       # Full specification
├── CLAUDE.md                # Development guidelines
└── README.md
```

## Key Features (Skeleton)

### Backend
- ✅ FastAPI with async support
- ✅ SQLAlchemy 2.0+ models (User, TypingSession, TelemetryEvent)
- ✅ JWT authentication with local and Google OAuth stub
- ✅ High-performance telemetry ingestion with bulk inserts
- ✅ Centralized logging proxy using structlog
- ⏳ Analytics engine (biomechanical metrics calculation)

### Frontend
- ✅ React 18+ with functional components
- ✅ CSS Variables theming system (3 themes: Dark, Paper, High Contrast)
- ✅ Ticker Tape view mode (horizontal scrolling)
- ✅ Rolling Window view mode (vertical scrolling)
- ✅ Virtual keyboard with key highlighting
- ✅ Telemetry buffering hook (useTelemetry)
- ⏳ Full typing test implementation
- ⏳ Authentication UI
- ⏳ Analytics dashboard

## Development Status

This is a **skeleton application** that demonstrates the architecture and core components. The following features are working:

1. **Backend API** - All endpoints are functional but need testing
2. **Frontend UI** - Basic typing interface with view modes
3. **Telemetry System** - Event buffering and ingestion pipeline
4. **Theming** - CSS Variables with 3 theme options

### TODO for Production

- [ ] Implement full typing test logic (WPM calculation, accuracy tracking)
- [ ] Add authentication UI (login, register, OAuth flow)
- [ ] Build analytics dashboard with biomechanical metrics
- [ ] Add comprehensive error handling
- [ ] Write unit and integration tests
- [ ] Add database migrations (Alembic)
- [ ] Implement text corpus selection
- [ ] Add user settings and profile management
- [ ] Production deployment configuration

## Performance Considerations

### Critical Performance Requirements

1. **Telemetry Ingestion** - Uses bulk insert (db.add_all()) to handle 50 events in ~10ms instead of 500ms
2. **Frontend Rendering** - No React re-renders on every keystroke; CSS classes handle visual feedback
3. **Event Buffering** - Batches 50 events or 5 seconds to minimize network requests
4. **Smooth Scrolling** - CSS transforms (translateX/translateY) with transitions for fluid motion

### Database Indexes

The TelemetryEvent table has composite indexes optimized for analytics queries:
- `(session_id, timestamp_offset)` - For time-series queries (dwell/flight time)
- `(key_code)` - For per-key analysis
- `(finger_used)` - For per-finger analysis

## Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## Contributing

See `CLAUDE.md` for detailed development guidelines and architecture decisions.

## License

[To be determined]
