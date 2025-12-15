#!/bin/bash
# Cleanup old Docker resources for FingerFlow

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     FingerFlow - Docker Cleanup             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

echo -e "${YELLOW}This will remove:${NC}"
echo -e "  - Stopped containers"
echo -e "  - Unused networks"
echo -e "  - Dangling images"
echo -e "  - Build cache"
echo ""
echo -e "${RED}⚠ This operation cannot be undone!${NC}"
echo ""

read -p "Continue with cleanup? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cleanup cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Cleaning up Docker resources...${NC}"
echo ""

# Stop all FingerFlow containers
echo -e "${BLUE}Stopping containers...${NC}"
docker-compose down

# Remove old FingerFlow images (keep latest)
echo -e "${BLUE}Removing old images...${NC}"
docker images | grep fingerflow | grep -v latest | awk '{print $3}' | xargs -r docker rmi || true

# Clean up dangling images
echo -e "${BLUE}Removing dangling images...${NC}"
docker image prune -f

# Clean up unused networks
echo -e "${BLUE}Removing unused networks...${NC}"
docker network prune -f

# Clean up build cache
echo -e "${BLUE}Removing build cache...${NC}"
docker builder prune -f

echo ""
echo -e "${GREEN}✓ Cleanup complete!${NC}"
echo ""

# Show disk space saved
echo -e "${BLUE}Docker disk usage:${NC}"
docker system df

echo ""
echo -e "${BLUE}To rebuild images:${NC}"
echo -e "  ./scripts/build.sh"
