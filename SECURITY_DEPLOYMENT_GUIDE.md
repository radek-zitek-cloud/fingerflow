# Security Hardening - Deployment Guide

## Quick Fix Applied ✅

The security features are now running with **temporary** package installations. Follow the steps below to make them permanent.

## Current Status

- ✅ Security middleware enabled and running
- ✅ Database migration applied (account lockout fields added)
- ⚠️ Dependencies installed temporarily (will be lost on container restart)

## Make Changes Permanent

### Step 1: Rebuild Docker Image

The `requirements.txt` has been updated with the new security dependencies. Rebuild the backend container:

```bash
# Stop services
./scripts/stop.sh --dev

# Rebuild backend with new dependencies
docker compose -f docker-compose.dev.yml build backend

# Start services
./scripts/start.sh --dev
```

**Alternative (faster rebuild):**
```bash
# Just rebuild and restart backend
docker compose -f docker-compose.dev.yml up -d --build backend
```

### Step 2: Verify Security Features

```bash
# Check backend logs for security middleware
docker compose logs backend | grep "security_middleware_enabled"

# Should see:
# middleware=Security Headers event=security_middleware_enabled
# middleware=CSRF Protection event=security_middleware_enabled
# middleware=Auth Rate Limiting event=security_middleware_enabled
```

### Step 3: Test Security Features

**Test CSRF Protection:**
```bash
# Should fail without CSRF token
curl -X POST http://localhost:8000/api/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"start_time":1234567890}'

# Expected: 403 Forbidden
# {"detail":"CSRF token missing or invalid"}
```

**Test Rate Limiting:**
```bash
# Try login 6 times with wrong password
for i in {1..6}; do
  curl -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo "\n"
done

# After 5 attempts, should get: 429 Too Many Requests
```

**Test Security Headers:**
```bash
curl -I http://localhost:8000/health

# Should see headers:
# x-content-type-options: nosniff
# x-frame-options: DENY
# strict-transport-security: max-age=31536000; includeSubDomains; preload
# content-security-policy: ...
```

## Database Migration (Already Applied) ✅

The account lockout fields have been added to the `users` table:
- `failed_login_attempts` - Counter for failed logins
- `account_locked_until` - Timestamp when lockout expires
- `last_failed_login` - Last failure timestamp
- `last_successful_login` - Last success timestamp

**Migration ID:** `9e765fbd5e8e`

**Verify migration:**
```bash
docker compose exec backend alembic current
# Should show: 9e765fbd5e8e (head)
```

## Production Deployment

When deploying to production, update your `.env` file:

```bash
# .env (Production)
HTTPS_REDIRECT_ENABLED=true  # ← Enable HTTPS redirect
SECURITY_HEADERS_ENABLED=true
CSRF_PROTECTION_ENABLED=true
AUTH_RATE_LIMIT_ENABLED=true

# Generate strong secret
SECRET_KEY=$(openssl rand -hex 32)

# Account Lockout Settings
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
LOCKOUT_RESET_AFTER_MINUTES=60
```

## Security Middleware Order

The middleware is applied in this order (most specific first):

1. **HTTPS Redirect** - Redirects HTTP to HTTPS (production only)
2. **Security Headers** - Adds XSS/clickjacking protection headers
3. **CSRF Protection** - Validates tokens on state-changing requests
4. **Auth Rate Limiting** - Strict limits on auth endpoints
5. **General Rate Limiting** - Protects all endpoints

## Troubleshooting

### Dependencies Not Found After Restart

**Problem:**
```
ModuleNotFoundError: No module named 'itsdangerous'
```

**Solution:**
Rebuild the Docker image as shown in Step 1 above.

### Migration Not Applied

**Problem:**
```
alembic current  # Shows older migration
```

**Solution:**
```bash
docker compose exec backend alembic upgrade head
```

### Backend Won't Start

**Check logs:**
```bash
docker compose logs backend --tail=50
```

**Common issues:**
- Missing dependencies → Rebuild image
- Database migration failed → Check migration logs
- Port already in use → Stop other services on port 8000

## Files Added/Modified

**New Files:**
- `backend/app/middleware/security_headers.py`
- `backend/app/middleware/https_redirect.py`
- `backend/app/middleware/csrf_protection.py`
- `backend/app/middleware/auth_rate_limit.py`
- `backend/alembic/versions/9e765fbd5e8e_add_account_lockout_fields.py`

**Modified Files:**
- `backend/requirements.txt` - Added itsdangerous, slowapi
- `backend/app/config.py` - Added security settings
- `backend/app/models/user.py` - Added lockout fields
- `backend/main.py` - Integrated security middleware
- `backend/app/routes/auth_complete.py` - Added /csrf-token endpoint

## Next Steps

1. **Rebuild Docker image** (see Step 1)
2. **Test security features** (see Step 3)
3. **Update frontend** to use CSRF tokens (see SECURITY_HARDENING.md)
4. **Monitor logs** for security events

## Security Event Logging

Watch for these events in logs:

```bash
# Failed logins
{"event": "auth_lockout_triggered", "ip": "1.2.3.4", "failed_attempts": 5}

# Rate limiting
{"event": "rate_limit_exceeded", "ip": "1.2.3.4", "path": "/auth/login"}

# CSRF failures
{"event": "csrf_invalid_token", "path": "/api/sessions"}
```

---

**Status:** Security features active (temporary install)
**Action Required:** Rebuild Docker image to persist dependencies
**Documentation:** See SECURITY_HARDENING.md for complete guide
