# FingerFlow Docker Scripts

Quick reference for Docker management scripts.

## 🚀 Quick Commands

```bash
# Production
./scripts/deploy.sh          # Full deployment workflow
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

## 📚 More Information

For detailed documentation, see [DOCKER.md](../DOCKER.md) in the project root.
