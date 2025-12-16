# Environment Setup Guide

This file explains how to configure environment variables for FingerFlow.

## File Structure

```
fingerflow/
├── backend/
│   ├── .env           # Your actual configuration (git-ignored)
│   └── .env.example   # Template with all options documented
└── frontend/
    ├── .env           # Your actual configuration (git-ignored)
    └── .env.example   # Template with defaults
```

## Quick Start

### Docker Development (Recommended)

```bash
# 1. Copy environment templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Start services (defaults work out of the box)
./scripts/start.sh --dev
```

### Local Development (Without Docker)

```bash
# 1. Install and start PostgreSQL
createdb -U postgres fingerflow

# 2. Configure backend
cp backend/.env.example backend/.env
# Edit backend/.env and update:
#   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/fingerflow

# 3. Configure frontend (defaults work)
cp frontend/.env.example frontend/.env

# 4. Run services
cd backend && uvicorn main:app --reload
cd frontend && npm run dev
```

## What Needs Configuration?

### Backend (.env)

**Must configure:**
- `DATABASE_URL` - If not using Docker, point to your local PostgreSQL
- `SECRET_KEY` - Generate with `openssl rand -hex 32` for production

**Optional:**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Google login
- `SMTP_*` settings - For email features

### Frontend (.env)

**Usually nothing!** The defaults work for local development.

Only change `VITE_API_URL` if your backend runs on a different port/host.

## Security Warnings

1. ⚠️ **Never commit `.env` files** - they're git-ignored for security
2. ⚠️ **Generate new SECRET_KEY** for production - don't use example values
3. ⚠️ **Change database password** in production - don't use `fingerflow_dev_password`

## Getting OAuth Credentials

### Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs: `http://localhost:8000/auth/google/callback`
7. Copy `Client ID` and `Client Secret` to `backend/.env`

## Need Help?

See `CLAUDE.md` for detailed documentation or ask in the project repository.
