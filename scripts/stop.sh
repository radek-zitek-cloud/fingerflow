#!/bin/bash
# Stop FingerFlow services

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     FingerFlow - Stop Services              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Check if --remove flag is passed
REMOVE_VOLUMES=false
if [ "$1" == "--remove" ] || [ "$1" == "-r" ]; then
    REMOVE_VOLUMES=true
    echo -e "${RED}Stopping services and removing volumes...${NC}"
else
    echo -e "${YELLOW}Stopping services...${NC}"
fi

echo ""

# Stop containers
if [ "$REMOVE_VOLUMES" = true ]; then
    docker compose down -v
    echo ""
    echo -e "${GREEN}✓ Services stopped and volumes removed!${NC}"
    echo -e "${RED}⚠ All data has been deleted!${NC}"
else
    docker compose down
    echo ""
    echo -e "${GREEN}✓ Services stopped!${NC}"
    echo -e "${BLUE}Data volumes preserved${NC}"
fi

echo ""
echo -e "${BLUE}To start services again:${NC}"
echo -e "  ./scripts/start.sh"
echo ""
echo -e "${BLUE}To remove volumes:${NC}"
echo -e "  ./scripts/stop.sh --remove"
