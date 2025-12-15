# Docker Deployment Guide

Complete Docker setup for FingerFlow with production and development environments.

## 🚀 Quick Start

### Production Deployment

```bash
# Build images
./scripts/build.sh

# Deploy (includes health checks)
./scripts/deploy.sh

# Or manually start
./scripts/start.sh --detach
```

### Development Mode

```bash
# Build development images
./scripts/build.sh --dev

# Start with hot reloading
./scripts/start.sh --dev

# Access:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:8000
```

## 📁 Docker Files Structure

```
fingerflow/
├── docker-compose.yml          # Production configuration
├── docker-compose.dev.yml      # Development override
├── backend/
│   ├── Dockerfile             # Production backend image
│   ├── Dockerfile.dev         # Development backend image
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile             # Production frontend image (Nginx)
│   ├── Dockerfile.dev         # Development frontend image (Vite)
│   ├── nginx.conf             # Nginx configuration for SPA
│   └── .dockerignore
└── scripts/
    ├── build.sh               # Build Docker images
    ├── start.sh               # Start services
    ├── stop.sh                # Stop services
    ├── restart.sh             # Restart services
    ├── deploy.sh              # Full deployment workflow
    ├── logs.sh                # View container logs
    ├── status.sh              # Check service health
    └── cleanup.sh             # Remove old resources
```

## 🛠️ Available Scripts

### Build Scripts

```bash
# Production build
./scripts/build.sh

# Development build
./scripts/build.sh --dev
```

### Start/Stop Scripts

```bash
# Start in production (port 80)
./scripts/start.sh

# Start in development (port 5173)
./scripts/start.sh --dev

# Start detached (background)
./scripts/start.sh --detach

# Stop services
./scripts/stop.sh

# Stop and remove volumes
./scripts/stop.sh --remove

# Restart services
./scripts/restart.sh

# Restart with rebuild
./scripts/restart.sh --rebuild

# Restart in dev mode
./scripts/restart.sh --dev
```

### Monitoring Scripts

```bash
# View logs (all services, follow mode)
./scripts/logs.sh

# View logs for specific service
./scripts/logs.sh backend
./scripts/logs.sh frontend

# View logs without following
./scripts/logs.sh --no-follow

# Check service status
./scripts/status.sh
```

### Maintenance Scripts

```bash
# Full deployment workflow
./scripts/deploy.sh

# Cleanup old images and containers
./scripts/cleanup.sh
```

## 🔧 Configuration

### Environment Variables

Create `.env` file in project root (or it will be created from `.env.example`):

```bash
# Database
DATABASE_URL=sqlite:///./data/fingerflow.db

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Email (for production)
EMAIL_PROVIDER=smtp  # or sendgrid
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_SECONDS=60
```

### Ports

**Production:**
- Frontend: `http://localhost` (port 80)
- Backend: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

**Development:**
- Frontend: `http://localhost:5173` (Vite dev server)
- Backend: `http://localhost:8000` (with hot reload)

## 🏗️ Architecture

### Production Stack

```
┌─────────────────────────────────────┐
│  Frontend (Nginx)                   │
│  - Serves static React build        │
│  - Proxies /api to backend          │
│  - SPA routing support               │
│  Port: 80                           │
└────────────┬────────────────────────┘
             │
             │ Docker network
             │
┌────────────▼────────────────────────┐
│  Backend (FastAPI)                  │
│  - Python 3.11                      │
│  - Uvicorn ASGI server              │
│  - SQLite database in volume        │
│  Port: 8000                         │
└────────────┬────────────────────────┘
             │
             │
┌────────────▼────────────────────────┐
│  Volume: backend-data               │
│  - SQLite database                  │
│  - Persistent storage               │
└─────────────────────────────────────┘
```

### Development Stack

```
┌─────────────────────────────────────┐
│  Frontend (Vite Dev Server)         │
│  - Hot module replacement           │
│  - Source maps                      │
│  - Volume-mounted source            │
│  Port: 5173                         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Backend (Uvicorn --reload)         │
│  - Auto-reload on changes           │
│  - Volume-mounted source            │
│  - Debug logging                    │
│  Port: 8000                         │
└─────────────────────────────────────┘
```

## 🔒 Security Features

1. **Multi-stage builds** - Smaller production images
2. **Non-root users** - Services don't run as root
3. **Health checks** - Automatic container health monitoring
4. **Security headers** - Nginx configured with security headers
5. **Isolated networks** - Services communicate via Docker network
6. **Volume isolation** - Data persisted in named volumes

## 📊 Monitoring

### Health Checks

Both containers have health checks configured:

```bash
# Check via Docker
docker ps

# Check manually
curl http://localhost:8000/health  # Backend
curl http://localhost              # Frontend
```

### Logs

```bash
# Real-time logs (all services)
./scripts/logs.sh

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100
```

### Resource Usage

```bash
# Check status and resources
./scripts/status.sh

# Docker stats
docker stats fingerflow-backend fingerflow-frontend
```

## 🐛 Troubleshooting

### Container won't start

```bash
# Check logs
./scripts/logs.sh

# Check container status
docker-compose ps

# Restart
./scripts/restart.sh
```

### Port already in use

```bash
# Find what's using port 80
sudo lsof -i :80

# Find what's using port 8000
sudo lsof -i :8000

# Stop and remove everything
./scripts/stop.sh
```

### Database issues

```bash
# Reset database (CAUTION: deletes all data)
./scripts/stop.sh --remove

# Restart fresh
./scripts/start.sh
```

### Build cache issues

```bash
# Rebuild without cache
docker-compose build --no-cache

# Or use cleanup script
./scripts/cleanup.sh
./scripts/build.sh
```

### Permission issues

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Fix volume permissions (if needed)
sudo chown -R $USER:$USER backend/data/
```

## 🚢 Production Deployment

### Prerequisites

1. Install Docker and Docker Compose
2. Configure `.env` with production values
3. Set up SSL certificate (recommended: Let's Encrypt)
4. Configure reverse proxy (if needed)

### Deployment Steps

```bash
# 1. Pull latest code
git pull origin main

# 2. Run deployment script
./scripts/deploy.sh

# 3. Verify deployment
./scripts/status.sh

# 4. Monitor logs
./scripts/logs.sh
```

### SSL/HTTPS Setup

For production with HTTPS, add a reverse proxy (Nginx/Traefik) in front:

```yaml
# Add to docker-compose.yml
services:
  nginx-proxy:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx-ssl.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
```

## 🔄 Updates and Maintenance

### Updating the Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
./scripts/restart.sh --rebuild
```

### Database Backups

```bash
# Backup SQLite database
docker cp fingerflow-backend:/app/data/fingerflow.db ./backup-$(date +%Y%m%d).db

# Restore from backup
docker cp ./backup-20240101.db fingerflow-backend:/app/data/fingerflow.db
./scripts/restart.sh
```

### Cleaning Up

```bash
# Remove old images and containers
./scripts/cleanup.sh

# Complete cleanup (removes volumes too)
docker-compose down -v
docker system prune -a
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/docker/)
- [Nginx Configuration](https://nginx.org/en/docs/)

## 💡 Tips

1. **Development**: Always use `--dev` flag for hot reloading
2. **Production**: Use `--detach` to run services in background
3. **Logs**: Monitor logs regularly with `./scripts/logs.sh`
4. **Backups**: Set up automated database backups
5. **Updates**: Test updates in development before production
6. **Monitoring**: Use `./scripts/status.sh` for quick health checks
7. **Cleanup**: Run `./scripts/cleanup.sh` periodically to save disk space

## ❓ Support

For issues:
1. Check logs: `./scripts/logs.sh`
2. Check status: `./scripts/status.sh`
3. Try restart: `./scripts/restart.sh`
4. Clean rebuild: `./scripts/cleanup.sh && ./scripts/build.sh`
