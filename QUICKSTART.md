# FingerFlow Quick Start Guide

## ✅ Backend Status: READY

The backend is fully configured and ready to run!

### Start Backend Server

```bash
cd backend
./start.sh
```

Or manually:
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload
```

**Backend will be available at:**
- API: http://localhost:8000
- Interactive API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### Available API Endpoints

**Authentication:**
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with credentials
- `GET /auth/me` - Get current user info
- `GET /auth/google/login` - Google OAuth (stub)

**Sessions:**
- `POST /api/sessions` - Create typing session
- `GET /api/sessions` - List user sessions
- `GET /api/sessions/{id}` - Get session details
- `PATCH /api/sessions/{id}/end` - End session with metrics

**Telemetry:**
- `POST /api/sessions/{id}/telemetry` - Ingest keystroke events (bulk)

**System:**
- `POST /api/system/logs` - Centralized logging proxy
- `GET /api/system/health` - System health check

## ⏳ Frontend Status: Needs Node.js

### Install Node.js

You'll need Node.js 18+ to run the frontend. Install it using one of these methods:

**Using nvm (recommended):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

**Using apt (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Using dnf (Fedora):**
```bash
sudo dnf install nodejs
```

### Install Frontend Dependencies

Once Node.js is installed:
```bash
cd frontend
npm install
npm run dev
```

**Frontend will be available at:**
- http://localhost:5173

## 🚀 Development Workflow

### Option 1: Run Backend Only (Testing API)

```bash
cd backend
./start.sh
```

Then test the API:
```bash
# Health check
curl http://localhost:8000/health

# Register a user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass123"}'
```

### Option 2: Run Full Stack (Once Node.js is installed)

```bash
# From project root
./start-dev.sh
```

This will start both backend and frontend in tmux (if available) or in the background.

### Option 3: Manual Start (Both Services)

**Terminal 1 (Backend):**
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

## 📊 Current Implementation Status

### ✅ Completed Features

**Backend:**
- FastAPI application with async support
- SQLAlchemy 2.0+ models (User, TypingSession, TelemetryEvent)
- JWT authentication system
- Bulk telemetry ingestion (performance optimized)
- Centralized logging proxy
- Structured JSON logging with structlog
- Database indexes for analytics queries

**Frontend (Structure Ready):**
- React 18 application scaffold
- CSS Variables theming system (3 themes)
- Ticker Tape component (horizontal scrolling)
- Rolling Window component (vertical scrolling)
- Virtual Keyboard component
- Telemetry buffering hook (useTelemetry)
- API client service layer

### ⏳ TODO for Production

- [ ] Complete typing test logic (WPM calculation in real-time)
- [ ] Authentication UI (login/register forms)
- [ ] Analytics dashboard (biomechanical metrics visualization)
- [ ] Text corpus selection
- [ ] User profile and settings
- [ ] Complete Google OAuth flow
- [ ] Unit and integration tests
- [ ] Database migrations (Alembic)
- [ ] Production deployment configuration

## 🧪 Testing the Backend

### Using the Interactive API Docs

1. Start the backend server
2. Open http://localhost:8000/docs
3. Try the endpoints:
   - Register a user via `/auth/register`
   - Login via `/auth/login` (copy the access_token)
   - Click "Authorize" and paste the token
   - Create a session via `/api/sessions`
   - Send telemetry data

### Using curl

```bash
# Register
TOKEN=$(curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.access_token')

# Create session
SESSION=$(curl -X POST http://localhost:8000/api/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"start_time\": $(date +%s)000}" | jq -r '.id')

# Send telemetry
curl -X POST http://localhost:8000/api/sessions/$SESSION/telemetry \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "event_type": "DOWN",
        "key_code": "KeyH",
        "timestamp_offset": 0,
        "finger_used": "R_INDEX",
        "is_error": false
      },
      {
        "event_type": "UP",
        "key_code": "KeyH",
        "timestamp_offset": 100,
        "finger_used": "R_INDEX",
        "is_error": false
      }
    ]
  }'
```

## 🔧 Troubleshooting

### Backend Issues

**"email-validator not installed"**
```bash
cd backend
source .venv/bin/activate
pip install email-validator
```

**"ModuleNotFoundError: No module named 'app'"**
Make sure you're in the `backend` directory when running uvicorn.

**Database errors**
The SQLite database will be created automatically. Check that you have write permissions in the `backend` directory.

### Frontend Issues

**"npm: command not found"**
Install Node.js first (see above).

**Port 5173 already in use**
Kill the existing process:
```bash
lsof -ti:5173 | xargs kill -9
```

## 📁 Project Structure

```
fingerflow/
├── backend/              ✅ READY
│   ├── app/
│   │   ├── models/      # SQLAlchemy models
│   │   ├── routes/      # API endpoints
│   │   ├── schemas/     # Pydantic schemas
│   │   └── utils/       # Auth helpers
│   ├── main.py          # FastAPI app
│   ├── start.sh         # Startup script
│   └── .env             # Configuration
├── frontend/            ⏳ NEEDS NODE.JS
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom hooks
│   │   ├── services/    # API client
│   │   └── styles/      # CSS themes
│   └── package.json
├── start-dev.sh         # Full stack startup
├── verify-setup.sh      # Setup verification
└── QUICKSTART.md        # This file
```

## 🎯 Next Steps

1. **Start Backend** - The backend is ready to run now
2. **Install Node.js** - Required for frontend development
3. **Install Frontend Dependencies** - `cd frontend && npm install`
4. **Start Full Stack** - `./start-dev.sh`
5. **Open Browser** - Navigate to http://localhost:5173

---

**Questions or Issues?**
- Check the main README.md for architecture details
- Review CLAUDE.md for development guidelines
- See docs/master_spec.md for full specification
