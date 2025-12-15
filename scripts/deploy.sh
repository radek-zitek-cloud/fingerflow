#!/bin/bash
# Deploy FingerFlow to production

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     FingerFlow - Production Deployment      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ .env file not found!${NC}"
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example .env
        echo -e "${GREEN}✓ .env created${NC}"
        echo -e "${YELLOW}⚠ Please update .env with production values!${NC}"
        echo ""
        read -p "Press enter to continue or Ctrl+C to exit and configure .env..."
    else
        echo -e "${RED}✗ backend/.env.example not found!${NC}"
        exit 1
    fi
fi

# Pre-deployment checks
echo -e "${BLUE}Running pre-deployment checks...${NC}"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker installed${NC}"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose installed${NC}"

# Check if ports are available
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port 80 is already in use${NC}"
fi

if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port 8000 is already in use${NC}"
fi

echo ""
echo -e "${BLUE}Deployment Steps:${NC}"
echo -e "  1. Pull latest code"
echo -e "  2. Build Docker images"
echo -e "  3. Stop existing containers"
echo -e "  4. Start new containers"
echo -e "  5. Run health checks"
echo ""

read -p "Continue with deployment? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Step 1: Pull latest code (if git repo)
if [ -d ".git" ]; then
    echo ""
    echo -e "${BLUE}Step 1: Pulling latest code...${NC}"
    git pull origin main || echo -e "${YELLOW}⚠ Git pull failed or not on main branch${NC}"
else
    echo -e "${YELLOW}⚠ Not a git repository, skipping pull${NC}"
fi

# Step 2: Build images
echo ""
echo -e "${BLUE}Step 2: Building Docker images...${NC}"
./scripts/build.sh

# Step 3: Stop existing containers
echo ""
echo -e "${BLUE}Step 3: Stopping existing containers...${NC}"
docker-compose down

# Step 4: Start new containers
echo ""
echo -e "${BLUE}Step 4: Starting containers...${NC}"
docker-compose up -d

# Step 5: Health checks
echo ""
echo -e "${BLUE}Step 5: Running health checks...${NC}"
sleep 5

# Check backend health
if curl -f http://localhost:8000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    echo -e "${YELLOW}Check logs: ./scripts/logs.sh backend${NC}"
fi

# Check frontend health
if curl -f http://localhost >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is healthy${NC}"
else
    echo -e "${RED}✗ Frontend health check failed${NC}"
    echo -e "${YELLOW}Check logs: ./scripts/logs.sh frontend${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Deployment Complete! ✨                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Access Points:${NC}"
echo -e "  Frontend: http://localhost"
echo -e "  Backend:  http://localhost:8000"
echo -e "  API Docs: http://localhost:8000/docs"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "  View logs:     ./scripts/logs.sh"
echo -e "  Restart:       ./scripts/restart.sh"
echo -e "  Stop:          ./scripts/stop.sh"
echo ""
