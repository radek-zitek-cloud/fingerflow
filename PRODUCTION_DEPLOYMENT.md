# FingerFlow Production Deployment Guide

Complete guide for deploying FingerFlow to production behind Traefik reverse proxy on `fingerflow.zitek.cloud`.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Initial Setup](#initial-setup)
4. [Environment Configuration](#environment-configuration)
5. [Deployment](#deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Server Requirements

- **OS**: Linux (Ubuntu 22.04+ or Debian 11+ recommended)
- **RAM**: 2GB minimum, 4GB recommended
- **CPU**: 2 cores minimum
- **Disk**: 20GB minimum, 50GB recommended (for logs and database growth)
- **Network**: Public IPv4/IPv6 address with ports 80 and 443 accessible

### Software Requirements

- **Docker**: 24.0.0+
- **Docker Compose**: 2.20.0+
- **Traefik**: 2.10+ (already running with external `proxy` network)

### DNS Configuration

Ensure `fingerflow.zitek.cloud` points to your server's public IP:

```bash
# Verify DNS resolution
dig fingerflow.zitek.cloud +short
nslookup fingerflow.zitek.cloud
```

### Traefik Setup

Verify Traefik is running and has the external `proxy` network:

```bash
# Check Traefik container
docker ps | grep traefik

# Verify proxy network exists
docker network ls | grep proxy

# If proxy network doesn't exist, create it
docker network create proxy
```

---

## Architecture Overview

### Production Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet (HTTPS)                          │
│                fingerflow.zitek.cloud                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                   ┌────────▼─────────┐
                   │     Traefik      │
                   │  Reverse Proxy   │
                   │  (TLS, Routing)  │
                   └────────┬─────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────▼────────┐                   ┌─────────▼────────┐
│   Frontend     │                   │    Backend       │
│   (nginx)      │                   │   (FastAPI)      │
│   Port: 80     │                   │   Port: 8000     │
└────────────────┘                   └─────────┬────────┘
                                               │
                                      ┌────────▼─────────┐
                                      │   PostgreSQL     │
                                      │   Port: 5432     │
                                      │  (Internal Only) │
                                      └──────────────────┘
```

### Network Architecture

- **`proxy` network**: External network managed by Traefik (connects frontend, backend)
- **`fingerflow-network`**: Internal bridge network (connects backend, postgres)
- **PostgreSQL**: Not exposed to Traefik, only accessible internally

### Routing Strategy

Traefik routes requests based on path prefixes (priority matters!):

| Path Pattern | Priority | Target | Description |
|--------------|----------|--------|-------------|
| `/api/*`, `/auth/*`, `/health`, `/` | 10 | Backend | API endpoints (higher priority) |
| `/*` | 1 | Frontend | SPA routes (catch-all, lower priority) |

---

## Initial Setup

### 1. Clone Repository on Server

```bash
# SSH into your production server
ssh user@your-server-ip

# Clone repository
cd /opt
sudo git clone https://github.com/your-org/fingerflow.git
cd fingerflow

# Set proper ownership
sudo chown -R $USER:$USER /opt/fingerflow
```

### 2. Create Production Environment File

```bash
# Copy the production template
cp .env.production.template .env

# Edit with your production secrets
nano .env
```

**Required secrets to generate:**

```bash
# Generate SECRET_KEY
openssl rand -hex 32

# Generate POSTGRES_PASSWORD
openssl rand -hex 32
```

---

## Environment Configuration

### Complete `.env` Configuration

Edit `/opt/fingerflow/.env` with the following values:

```bash
# Domain
DOMAIN=fingerflow.zitek.cloud

# Database (generate strong password!)
POSTGRES_PASSWORD=<PASTE_GENERATED_PASSWORD_HERE>

# JWT Secret (generate with openssl!)
SECRET_KEY=<PASTE_GENERATED_SECRET_KEY_HERE>

# Google OAuth2 (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret

# Email (configure your SMTP provider)
EMAIL_PROVIDER=smtp
EMAIL_FROM=noreply@fingerflow.zitek.cloud
EMAIL_FROM_NAME=FingerFlow
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_USE_TLS=true

# Logging
LOG_LEVEL=INFO

# Security (keep these enabled)
CSRF_PROTECTION_ENABLED=true
HTTPS_REDIRECT_ENABLED=false  # Traefik handles HTTPS
SECURITY_HEADERS_ENABLED=true
AUTH_RATE_LIMIT_ENABLED=true

# Account Lockout
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
LOCKOUT_RESET_AFTER_MINUTES=60
```

### Security Checklist

Before deployment, verify:

- ✅ `SECRET_KEY` is generated and unique (never use default!)
- ✅ `POSTGRES_PASSWORD` is strong and unique
- ✅ `.env` file has restrictive permissions (`chmod 600 .env`)
- ✅ `.env` is in `.gitignore` (never commit secrets!)
- ✅ SMTP credentials are correct and working
- ✅ Google OAuth redirect URI includes production domain

```bash
# Set secure permissions on .env
chmod 600 .env
```

---

## Deployment

### 1. Build Production Images

```bash
cd /opt/fingerflow

# Build with production compose file
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# This builds:
# - fingerflow-backend:prod (multi-stage, optimized)
# - fingerflow-frontend:prod (nginx serving static build)
```

### 2. Start Services

```bash
# Start in detached mode
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check container status
docker compose ps
```

**Expected output:**

```
NAME                    STATUS              PORTS
fingerflow-backend      Up 30 seconds       Healthy
fingerflow-frontend     Up 30 seconds       Healthy
fingerflow-postgres     Up 30 seconds       5432/tcp
```

### 3. Run Database Migrations

Database migrations run automatically on backend startup. Verify:

```bash
# Check backend logs for migration success
docker compose logs backend | grep "database_migrations_complete"

# Should see:
# {"event": "database_migrations_complete", "message": "Database schema up to date"}
```

**Manual migration (if needed):**

```bash
docker compose exec backend alembic upgrade head
```

### 4. Verify Traefik Routing

```bash
# Check Traefik dashboard or logs
docker logs traefik --tail 50

# Should see Traefik detecting the new services:
# - fingerflow-api (backend)
# - fingerflow (frontend)
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Backend health
curl https://fingerflow.zitek.cloud/health

# Expected response:
# {"status":"healthy","database":"connected","logging":"configured"}

# Frontend health
curl -I https://fingerflow.zitek.cloud

# Expected: 200 OK with security headers
```

### 2. Security Headers Verification

```bash
curl -I https://fingerflow.zitek.cloud/health | grep -E "x-content-type-options|x-frame-options|strict-transport-security"

# Expected headers:
# x-content-type-options: nosniff
# x-frame-options: DENY
# strict-transport-security: max-age=31536000; includeSubDomains; preload
```

### 3. TLS Certificate Verification

```bash
# Check TLS certificate (issued by Let's Encrypt)
openssl s_client -connect fingerflow.zitek.cloud:443 -servername fingerflow.zitek.cloud < /dev/null 2>/dev/null | openssl x509 -noout -dates

# Should show valid dates and issuer: Let's Encrypt
```

### 4. Database Connection Test

```bash
# Connect to PostgreSQL (from backend container)
docker compose exec backend python -c "from app.database import engine; print(engine.connect())"

# Should see: <sqlalchemy.pool...Connection object>
```

### 5. Application Smoke Tests

Visit these URLs in a browser:

- ✅ `https://fingerflow.zitek.cloud` - Frontend loads
- ✅ `https://fingerflow.zitek.cloud/health` - Backend health check
- ✅ Try login flow - Authentication works
- ✅ Try registration - Email verification works (check SMTP logs)
- ✅ Create a typing session - Telemetry ingestion works

---

## Monitoring & Maintenance

### Log Management

```bash
# View live logs
docker compose logs -f

# View specific service logs
docker compose logs backend -f
docker compose logs frontend -f
docker compose logs postgres -f

# Check last 100 lines
docker compose logs --tail=100

# View logs with timestamps
docker compose logs -t
```

### Container Resource Monitoring

```bash
# Real-time resource usage
docker stats

# Check disk usage
docker system df

# Clean up old images (careful in production!)
docker system prune -a --volumes
```

### Database Backups

**Automated backup script** (`/opt/fingerflow/scripts/backup-db.sh`):

```bash
#!/bin/bash
# Database backup script for FingerFlow production

BACKUP_DIR="/opt/fingerflow/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/fingerflow_backup_$DATE.dump"

mkdir -p $BACKUP_DIR

# Create compressed backup
docker compose exec -T postgres pg_dump -U fingerflow -Fc fingerflow > "$BACKUP_FILE"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "fingerflow_backup_*.dump" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

**Setup automated backups:**

```bash
# Make script executable
chmod +x /opt/fingerflow/scripts/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /opt/fingerflow/scripts/backup-db.sh >> /var/log/fingerflow-backup.log 2>&1
```

### Security Monitoring

**Monitor authentication failures:**

```bash
# Watch for account lockouts
docker compose logs backend | grep "auth_lockout_triggered"

# Monitor rate limiting
docker compose logs backend | grep "rate_limit_exceeded"

# Check CSRF failures
docker compose logs backend | grep "csrf_invalid_token"
```

### Application Updates

```bash
# Pull latest changes
cd /opt/fingerflow
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Check health after update
curl https://fingerflow.zitek.cloud/health
```

---

## Troubleshooting

### Backend Won't Start

**Symptoms:** Backend container exits immediately

```bash
# Check logs
docker compose logs backend --tail=50

# Common issues:
# 1. Database connection failed
docker compose exec postgres psql -U fingerflow -d fingerflow -c "SELECT 1"

# 2. Missing environment variables
docker compose exec backend env | grep -E "SECRET_KEY|DATABASE_URL"

# 3. Migration failure
docker compose exec backend alembic current
```

### Frontend Not Accessible

**Symptoms:** 502 Bad Gateway or connection refused

```bash
# Check frontend container
docker compose ps frontend

# Check nginx logs
docker compose logs frontend --tail=50

# Test internal connectivity
docker compose exec frontend curl http://localhost:80/nginx-health

# Check if Traefik can reach frontend
docker exec traefik wget -O- http://fingerflow-frontend:80
```

### Database Connection Issues

**Symptoms:** "Connection refused" or "Database not available"

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs postgres --tail=50

# Test connection from backend
docker compose exec backend nc -zv postgres 5432

# Verify credentials
docker compose exec postgres psql -U fingerflow -d fingerflow -c "\conninfo"
```

### Traefik Not Routing Correctly

**Symptoms:** 404 errors or wrong service receiving requests

```bash
# Check Traefik labels on containers
docker inspect fingerflow-backend | grep traefik

# Verify priority settings
docker inspect fingerflow-backend | grep priority

# Check Traefik logs for routing decisions
docker logs traefik | grep fingerflow

# Restart Traefik to reload configuration
docker restart traefik
```

### SSL Certificate Issues

**Symptoms:** Certificate errors or "Not Secure" warning

```bash
# Check Let's Encrypt certificate acquisition
docker logs traefik | grep -i "certificate"

# Verify DNS is correct
dig fingerflow.zitek.cloud +short

# Check Traefik ACME storage
docker exec traefik cat /acme.json | jq .
```

### High Memory Usage

**Symptoms:** Containers running slowly or being killed

```bash
# Check memory usage
docker stats --no-stream

# If backend is using too much memory, reduce workers
# Edit docker-compose.prod.yml and change:
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

---

## Rollback Procedures

### Quick Rollback to Previous Version

```bash
# 1. Stop current deployment
cd /opt/fingerflow
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# 2. Checkout previous git commit
git log --oneline  # Find the previous working commit
git checkout <previous-commit-hash>

# 3. Rebuild and restart
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 4. Verify health
curl https://fingerflow.zitek.cloud/health
```

### Database Rollback

```bash
# 1. Stop backend (prevents writes)
docker compose stop backend

# 2. Restore from backup
docker compose exec -T postgres pg_restore -U fingerflow -d fingerflow -c < /opt/fingerflow/backups/fingerflow_backup_YYYYMMDD_HHMMSS.dump

# 3. Downgrade migration (if needed)
docker compose exec backend alembic downgrade <revision_id>

# 4. Restart backend
docker compose start backend
```

---

## Maintenance Windows

### Zero-Downtime Deployment (Blue-Green)

For critical production deployments without downtime:

1. **Build new images** with different tags
2. **Start new containers** on different ports
3. **Test new deployment** before switching traffic
4. **Update Traefik routing** to point to new containers
5. **Stop old containers** after verification

### Scheduled Maintenance

For database migrations or infrastructure changes:

1. **Announce maintenance window** to users
2. **Create database backup**
3. **Set maintenance page** (Traefik middleware)
4. **Perform updates**
5. **Verify system health**
6. **Remove maintenance page**

---

## Security Best Practices

### Regular Security Audits

```bash
# Update base images monthly
docker compose pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Review logs for suspicious activity
docker compose logs backend | grep -E "429|403|401"

# Check for CVEs in dependencies
docker scout cves fingerflow-backend:prod
```

### Secrets Management

- ✅ Never commit `.env` files to git
- ✅ Rotate `SECRET_KEY` and `POSTGRES_PASSWORD` quarterly
- ✅ Use Docker secrets or external secret managers for enhanced security
- ✅ Restrict server access with SSH keys only (disable password auth)

### Firewall Configuration

```bash
# Only allow ports 80, 443, and SSH
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## Performance Optimization

### Backend Tuning

**Adjust Uvicorn workers** based on available CPU:

```yaml
# In docker-compose.prod.yml
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

# Rule of thumb: (2 x CPU cores) + 1
```

### Database Connection Pooling

Edit `backend/app/database.py`:

```python
engine = create_async_engine(
    settings.database_url,
    pool_size=10,          # Increase if needed
    max_overflow=20,       # Increase for burst traffic
    pool_pre_ping=True,
)
```

### Nginx Caching (Optional)

Add to `frontend/nginx.prod.conf`:

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m;
```

---

## Support & Resources

- **Documentation**: See `SECURITY_HARDENING.md` for security features
- **Deployment Guide**: See `SECURITY_DEPLOYMENT_GUIDE.md` for quick reference
- **Architecture**: See `docs/master_spec.md` for system design
- **Issues**: Report issues at [GitHub Issues](https://github.com/your-org/fingerflow/issues)

---

## Deployment Checklist

Use this checklist for every production deployment:

- [ ] Backup current database
- [ ] Review `.env` configuration
- [ ] Build images successfully
- [ ] Run database migrations
- [ ] Verify health endpoints
- [ ] Check TLS certificates
- [ ] Test authentication flow
- [ ] Test telemetry ingestion
- [ ] Monitor logs for errors (first 5 minutes)
- [ ] Update documentation if configuration changed

---

**Last Updated**: 2025-12-17
**Maintainer**: FingerFlow Team
**Production URL**: https://fingerflow.zitek.cloud
