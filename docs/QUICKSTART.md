# FingerFlow Quick Start Guide

This guide will help you start the backend and frontend and test the authentication system.

## Prerequisites

Make sure you have:
- Python 3.10+ installed
- Node.js 18+ installed
- PostgreSQL or SQLite for the database

## Backend Setup

### 1. Install Python Dependencies

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env` file in the `backend` directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your settings. Minimum required configuration:

```env
# Security
SECRET_KEY=your-super-secret-key-change-this-in-production

# Database
DATABASE_URL=sqlite:///./data/fingerflow.db

# JWT
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google OAuth2 (Optional - leave empty if not using)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# Email (Optional - use console for development)
EMAIL_PROVIDER=console
```

### 3. Start the Backend

```bash
cd backend
source venv/bin/activate  # If not already activated
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 4. Test Backend Health

In a new terminal:

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status":"healthy","database":"connected","logging":"configured"}
```

## Frontend Setup

### 1. Install Node Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Create a `.env` file in the `frontend` directory:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:8000
```

### 3. Start the Frontend

```bash
cd frontend
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

## Test Authentication

### 1. Open the Application

Navigate to http://localhost:5173 in your browser.

### 2. Test User Registration

1. Click "Sign in" → "Create one" to go to registration
2. Enter an email (e.g., `test@example.com`)
3. Enter a password (must meet requirements: 8+ chars, uppercase, lowercase, number)
4. Confirm password
5. Click "Create Account"

You should be automatically logged in after registration.

### 3. Verify Authentication

After registration, you should see:
- Your email in the navigation bar
- The navbar should show "Profile" and "Logout" options

### 4. Test Login

1. Click "Logout"
2. Click the user icon to log in again
3. Enter your email and password
4. Click "Sign In"

### 5. Test Google OAuth (if configured)

1. Set up Google OAuth credentials (see AUTHENTICATION.md)
2. Add credentials to backend `.env`
3. Restart backend
4. Click "Sign in with Google" on the login page
5. Authenticate with your Google account

## Troubleshooting

### Backend Issues

**Error: "No module named 'sqlalchemy'"**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

**Error: "Could not connect to database"**
- Check DATABASE_URL in `.env`
- Ensure the `data/` directory exists: `mkdir -p data`

**Error: "Secret key is not set"**
- Set SECRET_KEY in `.env` to a random string
- Generate one: `python3 -c "import secrets; print(secrets.token_hex(32))"`

### Frontend Issues

**Error: "Failed to fetch"**
- Ensure backend is running on port 8000
- Check VITE_API_URL in frontend `.env`
- Check browser console for CORS errors

**403 Forbidden on /auth/me**
- This happens when the auth token is invalid or expired
- Try logging out and logging in again
- Check backend logs for JWT validation errors
- Ensure SECRET_KEY is the same between restarts

### Database Issues

**Users not being created**
1. Check backend logs for errors during registration
2. Verify database file exists: `ls -la backend/data/`
3. Check database tables:
   ```bash
   cd backend
   source venv/bin/activate
   python3 -c "from app.database import engine; from sqlalchemy import inspect; print(inspect(engine).get_table_names())"
   ```

**To reset the database:**
```bash
cd backend
rm -f data/fingerflow.db
# Restart backend - it will recreate tables
```

## Common Test Scenarios

### 1. Test Email Verification Flow

```bash
# In backend, set EMAIL_PROVIDER=console in .env
# Register a new user
# Check backend terminal for verification link
# The link will be printed to console
```

### 2. Test Password Reset

1. Go to login page
2. Click "Forgot password?"
3. Enter your email
4. Check backend console for reset link

### 3. Test 2FA Setup

1. Log in
2. Go to Profile
3. Enable Two-Factor Authentication
4. Scan QR code with authenticator app
5. Enter code to verify
6. Log out and log in again (you'll be prompted for 2FA code)

## Viewing Logs

### Backend Logs

The backend uses structured JSON logging. Watch logs in real-time:

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --log-level debug
```

### Frontend Logs

Open browser Developer Tools (F12) and check:
- Console tab for JavaScript logs
- Network tab for API requests
- Application tab → Local Storage to see stored tokens

## API Documentation

Once the backend is running, visit:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

You can test all API endpoints directly from Swagger UI.

## Next Steps

- Read [AUTHENTICATION.md](./AUTHENTICATION.md) for detailed auth documentation
- Read [DOCKER.md](./DOCKER.md) for containerized deployment
- Read [CLAUDE.md](./CLAUDE.md) for development guidelines
- Read `docs/master_spec.md` for full technical specification

## Getting Help

If you encounter issues:

1. Check backend logs for errors
2. Check frontend browser console for errors
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed
5. Try resetting the database if data seems corrupted
