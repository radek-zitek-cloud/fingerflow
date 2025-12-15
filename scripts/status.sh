#!/bin/bash
# Check status of FingerFlow services

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     FingerFlow - Service Status             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Check if containers are running
echo -e "${BLUE}Container Status:${NC}"
docker-compose ps

echo ""
echo -e "${BLUE}Health Checks:${NC}"

# Check backend
if curl -f http://localhost:8000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend:  HEALTHY (http://localhost:8000)${NC}"
else
    echo -e "${RED}✗ Backend:  UNHEALTHY or not running${NC}"
fi

# Check frontend
if curl -f http://localhost >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend: HEALTHY (http://localhost)${NC}"
else
    if curl -f http://localhost:5173 >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend: HEALTHY (http://localhost:5173) [DEV MODE]${NC}"
    else
        echo -e "${RED}✗ Frontend: UNHEALTHY or not running${NC}"
    fi
fi

echo ""
echo -e "${BLUE}Resource Usage:${NC}"
docker stats --no-stream fingerflow-backend fingerflow-frontend 2>/dev/null || echo -e "${YELLOW}Containers not running${NC}"

echo ""
echo -e "${BLUE}Volumes:${NC}"
docker volume ls | grep fingerflow || echo -e "${YELLOW}No volumes found${NC}"

echo ""
echo -e "${BLUE}Networks:${NC}"
docker network ls | grep fingerflow || echo -e "${YELLOW}No networks found${NC}"
