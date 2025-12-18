# Deploy Frontend Update - Word Sets Link

## What Changed
Added "Manage Word Sets" link to the footer in `frontend/src/App.jsx`

## Deployment Steps

### On Your VPS (fingerflow.zitek.cloud)

```bash
# Navigate to project directory
cd /opt/fingerflow

# Pull latest changes from git (if you've pushed them)
git pull

# Rebuild and restart frontend container
DOMAIN=fingerflow.zitek.cloud \
SECRET_KEY=your_secret_key \
POSTGRES_PASSWORD=your_password \
GOOGLE_CLIENT_ID=your_client_id \
GOOGLE_CLIENT_SECRET=your_client_secret \
SMTP_HOST=your_smtp_host \
SMTP_USERNAME=your_smtp_username \
SMTP_PASSWORD=your_smtp_password \
docker compose -f docker-compose.prod-standalone.yml build frontend

DOMAIN=fingerflow.zitek.cloud \
SECRET_KEY=your_secret_key \
POSTGRES_PASSWORD=your_password \
GOOGLE_CLIENT_ID=your_client_id \
GOOGLE_CLIENT_SECRET=your_client_secret \
SMTP_HOST=your_smtp_host \
SMTP_USERNAME=your_smtp_username \
SMTP_PASSWORD=your_smtp_password \
docker compose -f docker-compose.prod-standalone.yml up -d frontend
```

## Verification

1. Visit https://fingerflow.zitek.cloud
2. Log in to your account
3. Scroll to the bottom of the main page
4. You should see "Manage Word Sets" link below the version text
5. Click it to verify it navigates to the word sets management page

---

## ⚠️ IMPORTANT: Database Migration Still Pending

Before the deployment is fully functional, you need to run the migration cleanup script:

```bash
cd /opt/fingerflow
./scripts/create-fresh-migration.sh
```

This will:
- Remove old fragmented migration files
- Drop and recreate the database schema
- Generate a fresh consolidated migration
- Apply it to create all necessary tables (users, typing_sessions, telemetry_events, etc.)

Without this step, user registration and all database operations will fail with "relation does not exist" errors.
