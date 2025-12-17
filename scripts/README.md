# FingerFlow Docker Scripts

Quick reference for Docker management scripts.

## 🚀 Quick Commands

```bash
# Production Deployment (Traefik)
./scripts/deploy-prod.sh      # Full production deployment with health checks
./scripts/health-check.sh     # Comprehensive health monitoring
./scripts/backup-db.sh        # Backup PostgreSQL database
./scripts/restore-db.sh <file> # Restore from backup

# Standard Deployment (Standalone)
./scripts/deploy.sh           # Full deployment workflow
./scripts/build.sh            # Build images
./scripts/start.sh --detach   # Start in background
./scripts/stop.sh             # Stop services

# Development
./scripts/build.sh --dev      # Build dev images
./scripts/start.sh --dev      # Start with hot reload
./scripts/logs.sh             # View logs

# Maintenance
./scripts/status.sh           # Check health
./scripts/restart.sh          # Restart services
./scripts/cleanup.sh          # Remove old resources
```

## 📋 Script Reference

### build.sh
Build Docker images for production or development.

```bash
./scripts/build.sh              # Production build
./scripts/build.sh --dev        # Development build with hot reload
```

### start.sh
Start services with Docker Compose.

```bash
./scripts/start.sh              # Start production (foreground)
./scripts/start.sh --detach     # Start production (background)
./scripts/start.sh --dev        # Start development mode
./scripts/start.sh --dev --detach  # Start dev in background
```

**Access Points:**
- Production: http://localhost (frontend), http://localhost:8000 (backend)
- Development: http://localhost:5173 (frontend), http://localhost:8000 (backend)

### stop.sh
Stop running services.

```bash
./scripts/stop.sh               # Stop services (keep volumes)
./scripts/stop.sh --remove      # Stop and remove volumes (delete data!)
```

### restart.sh
Restart services with optional rebuild.

```bash
./scripts/restart.sh            # Restart production
./scripts/restart.sh --dev      # Restart development
./scripts/restart.sh --rebuild  # Restart with image rebuild
./scripts/restart.sh --dev --rebuild  # Rebuild and restart dev
```

### logs.sh
View container logs.

```bash
./scripts/logs.sh               # All services, follow mode
./scripts/logs.sh backend       # Backend only
./scripts/logs.sh frontend      # Frontend only
./scripts/logs.sh --no-follow   # Show logs without following
```

Press `Ctrl+C` to stop following logs.

### deploy.sh
Complete production deployment workflow.

```bash
./scripts/deploy.sh
```

**Workflow:**
1. Pre-deployment checks (Docker, ports, .env)
2. Pull latest code (if git repo)
3. Build Docker images
4. Stop existing containers
5. Start new containers
6. Run health checks

### status.sh
Check service health and resource usage.

```bash
./scripts/status.sh
```

**Shows:**
- Container status
- Health check results
- Resource usage (CPU, memory)
- Volume information
- Network information

### cleanup.sh
Remove old Docker resources.

```bash
./scripts/cleanup.sh
```

**Removes:**
- Stopped containers
- Old/dangling images
- Unused networks
- Build cache

**Note:** Current volumes are preserved. Use `./scripts/stop.sh --remove` to delete volumes.

## 🔧 Common Workflows

### First-Time Setup

```bash
# 1. Build images
./scripts/build.sh

# 2. Start services
./scripts/start.sh --detach

# 3. Check status
./scripts/status.sh

# 4. View logs
./scripts/logs.sh
```

### Development Workflow

```bash
# 1. Build dev images (once)
./scripts/build.sh --dev

# 2. Start with hot reload
./scripts/start.sh --dev

# 3. Make code changes (auto-reload)

# 4. View logs in another terminal
./scripts/logs.sh backend
```

### Updating Application

```bash
# 1. Pull latest code
git pull

# 2. Restart with rebuild
./scripts/restart.sh --rebuild

# 3. Check health
./scripts/status.sh
```

### Troubleshooting

```bash
# 1. Check logs
./scripts/logs.sh

# 2. Check status
./scripts/status.sh

# 3. Restart services
./scripts/restart.sh

# 4. If issues persist, clean rebuild
./scripts/cleanup.sh
./scripts/build.sh
./scripts/start.sh
```

### Cleanup and Reset

```bash
# 1. Stop everything and remove volumes
./scripts/stop.sh --remove

# 2. Clean up old images
./scripts/cleanup.sh

# 3. Fresh start
./scripts/build.sh
./scripts/start.sh
```

## 🎯 Tips

1. **Always check logs first**: `./scripts/logs.sh` when troubleshooting
2. **Use --detach for background**: Run services in background for production
3. **Development hot reload**: Use `--dev` flag for automatic code reloading
4. **Monitor health**: Run `./scripts/status.sh` periodically
5. **Clean regularly**: Use `./scripts/cleanup.sh` to save disk space
6. **Test before production**: Always test in dev mode first

## 🚨 Important Notes

- **Port conflicts**: Ensure ports 80 and 8000 (or 5173 for dev) are available
- **Data persistence**: Volumes persist after `./scripts/stop.sh` unless you use `--remove`
- **Environment variables**: Configure `.env` before deployment
- **Health checks**: Services may take 10-30 seconds to become healthy
- **Logs location**: Use `./scripts/logs.sh` instead of looking for log files

## 🌐 Production Deployment Scripts

### deploy-prod.sh
**Complete production deployment behind Traefik** on fingerflow.zitek.cloud.

```bash
./scripts/deploy-prod.sh
```

**Features:**
- Environment validation (checks for required secrets)
- Automatic database backup before deployment
- Zero-downtime rebuild and restart
- Health check verification
- Migration status check
- Colored output with progress indicators

**Requirements:**
- `.env` file configured with production settings
- Traefik running with external `proxy` network
- DNS pointing to server

### health-check.sh
**Comprehensive production health monitoring.**

```bash
./scripts/health-check.sh
```

**Checks:**
- Docker container status
- Backend health endpoint
- Frontend availability
- Public URL accessibility
- Security headers presence
- Database connectivity
- Disk space usage
- Container resource usage
- Recent error logs

**Output:** Color-coded report with ✅/❌ status indicators

### backup-db.sh
**PostgreSQL database backup with compression.**

```bash
./scripts/backup-db.sh
```

**Features:**
- Compressed backup (pg_dump -Fc format)
- Automatic retention (keeps last 7 days)
- Timestamped filenames
- Size reporting

**Backups stored in:** `./backups/fingerflow_backup_YYYYMMDD_HHMMSS.dump`

**Automated backups:** Add to crontab for daily backups:
```bash
0 2 * * * /opt/fingerflow/scripts/backup-db.sh >> /var/log/fingerflow-backup.log 2>&1
```

### restore-db.sh
**Restore PostgreSQL database from backup.**

```bash
./scripts/restore-db.sh ./backups/fingerflow_backup_20231215_020000.dump
```

**Features:**
- Safety confirmation prompt
- Automatic safety backup before restore
- Stops backend during restore (prevents data corruption)
- Health check after restore
- Automatic rollback on failure

**⚠️  WARNING:** This replaces current database! Always verify backup file before restoring.

## 🔄 Production Deployment Workflow

### Initial Production Setup

```bash
# 1. SSH to production server
ssh user@your-server-ip

# 2. Clone repository
cd /opt
sudo git clone https://github.com/your-org/fingerflow.git
cd fingerflow

# 3. Configure environment
cp .env.production.template .env
nano .env  # Add production secrets

# 4. Deploy
./scripts/deploy-prod.sh

# 5. Verify health
./scripts/health-check.sh
```

### Regular Updates

```bash
# 1. Pull latest code
cd /opt/fingerflow
git pull origin main

# 2. Deploy
./scripts/deploy-prod.sh

# 3. Monitor
./scripts/health-check.sh
docker compose logs -f
```

### Emergency Rollback

```bash
# 1. Find previous working commit
git log --oneline

# 2. Checkout previous version
git checkout <commit-hash>

# 3. Redeploy
./scripts/deploy-prod.sh
```

### Database Backup & Restore

```bash
# Manual backup
./scripts/backup-db.sh

# List backups
ls -lh ./backups/

# Restore from backup
./scripts/restore-db.sh ./backups/fingerflow_backup_20231215_020000.dump
```

## 📚 More Information

- **Production Deployment Guide**: See [PRODUCTION_DEPLOYMENT.md](../PRODUCTION_DEPLOYMENT.md)
- **Security Features**: See [SECURITY_HARDENING.md](../SECURITY_HARDENING.md)
- **Docker Guide**: See [DOCKER.md](../DOCKER.md)
- **Architecture**: See [CLAUDE.md](../CLAUDE.md)
