#!/bin/bash
# FingerFlow Production Deployment Script
# Usage: ./scripts/deploy-prod.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  FingerFlow Production Deployment${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo -e "${YELLOW}Please create .env from .env.production.template${NC}"
    exit 1
fi

# Check required environment variables
echo -e "${YELLOW}🔍 Checking environment configuration...${NC}"
required_vars=("SECRET_KEY" "POSTGRES_PASSWORD" "DOMAIN")
missing_vars=()

for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" .env || grep -q "^$var=CHANGE_ME" .env || grep -q "^$var=your-" .env; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing or invalid environment variables:${NC}"
    for var in "${missing_vars[@]}"; do
        echo -e "   - $var"
    done
    echo -e "${YELLOW}Please update .env with production values${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment configuration OK${NC}"
echo ""

# Backup database before deployment
echo -e "${YELLOW}📦 Creating database backup...${NC}"
if docker compose ps postgres | grep -q "Up"; then
    ./scripts/backup-db.sh
    echo -e "${GREEN}✅ Database backup created${NC}"
else
    echo -e "${YELLOW}⚠️  Database not running, skipping backup${NC}"
fi
echo ""

# Pull latest code (if in git repo)
if [ -d .git ]; then
    echo -e "${YELLOW}📥 Pulling latest code...${NC}"
    git pull origin main
    echo -e "${GREEN}✅ Code updated${NC}"
    echo ""
fi

# Build images
echo -e "${YELLOW}🔨 Building production images...${NC}"
docker compose -f docker-compose.prod-standalone.yml build --no-cache
echo -e "${GREEN}✅ Images built successfully${NC}"
echo ""

# Stop old containers
echo -e "${YELLOW}🛑 Stopping old containers...${NC}"
docker compose -f docker-compose.prod-standalone.yml down
echo -e "${GREEN}✅ Containers stopped${NC}"
echo ""

# Start services
echo -e "${YELLOW}🚀 Starting production services...${NC}"
docker compose -f docker-compose.prod-standalone.yml up -d
echo -e "${GREEN}✅ Services started${NC}"
echo ""

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check backend health
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker exec fingerflow-backend curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
        break
    fi
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}❌ Backend health check failed after ${max_attempts} attempts${NC}"
        echo -e "${YELLOW}Check logs with: docker logs fingerflow-backend${NC}"
        exit 1
    fi
    sleep 2
done
echo ""

# Check frontend health
if docker exec fingerflow-frontend curl -f http://localhost:80 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
    echo -e "${YELLOW}Check logs with: docker logs fingerflow-frontend${NC}"
    exit 1
fi
echo ""

# Run database migrations (happens automatically, but verify)
echo -e "${YELLOW}🗄️  Verifying database migrations...${NC}"
docker exec fingerflow-backend alembic current | grep -q "head"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database migrations up to date${NC}"
else
    echo -e "${YELLOW}⚠️  Running database migrations...${NC}"
    docker exec fingerflow-backend alembic upgrade head
    echo -e "${GREEN}✅ Database migrations applied${NC}"
fi
echo ""

# Show container status
echo -e "${YELLOW}📊 Container status:${NC}"
docker ps --filter name=fingerflow
echo ""

# Show logs
echo -e "${YELLOW}📋 Recent logs:${NC}"
docker logs fingerflow-backend --tail=10
docker logs fingerflow-frontend --tail=10
echo ""

# Final verification
DOMAIN=$(grep "^DOMAIN=" .env | cut -d'=' -f2)
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "🌐 Application URL: ${GREEN}https://${DOMAIN}${NC}"
echo -e "💚 Health Check:    ${GREEN}https://${DOMAIN}/health${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Test the application in browser"
echo "  2. Monitor logs: docker compose logs -f"
echo "  3. Check metrics: ./scripts/health-check.sh"
echo ""
