#!/bin/bash
# Quick production update script (no full rebuild)
# Use when you only need to pull code changes and restart

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔄 Updating FingerFlow production...${NC}"

# Pull latest code
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git pull origin main

# Restart services
echo -e "${YELLOW}🔄 Restarting services...${NC}"
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart

# Wait for health
echo -e "${YELLOW}⏳ Waiting for services...${NC}"
sleep 5

# Check status
docker compose ps

echo -e "${GREEN}✅ Update complete${NC}"
