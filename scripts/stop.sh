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

# Parse arguments
REMOVE_VOLUMES=false
DEV_MODE=false

for arg in "$@"; do
    case $arg in
        --remove|-r)
            REMOVE_VOLUMES=true
            ;;
        --dev|-d)
            DEV_MODE=true
            ;;
    esac
done

if [ "$REMOVE_VOLUMES" = true ]; then
    echo -e "${RED}Stopping services and removing volumes...${NC}"
else
    echo -e "${YELLOW}Stopping services...${NC}"
fi

echo ""

# Build docker compose command
if [ "$DEV_MODE" = true ]; then
    COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml"
    echo -e "${BLUE}Stopping development containers...${NC}"
else
    # Stop both dev and prod to be safe
    COMPOSE_FILES="-f docker-compose.yml"
    echo -e "${BLUE}Stopping production containers...${NC}"
fi

# Stop containers
if [ "$REMOVE_VOLUMES" = true ]; then
    docker compose $COMPOSE_FILES down -v
    # Also try to stop dev containers if stopping prod
    if [ "$DEV_MODE" = false ]; then
        docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v 2>/dev/null || true
    fi
    echo ""
    echo -e "${GREEN}✓ Services stopped and volumes removed!${NC}"
    echo -e "${RED}⚠ All data has been deleted!${NC}"
else
    docker compose $COMPOSE_FILES down
    # Also try to stop dev containers if stopping prod
    if [ "$DEV_MODE" = false ]; then
        docker compose -f docker-compose.yml -f docker-compose.dev.yml down 2>/dev/null || true
    fi
    echo ""
    echo -e "${GREEN}✓ Services stopped!${NC}"
    echo -e "${BLUE}Data volumes preserved${NC}"
fi

echo ""
echo -e "${BLUE}To start services again:${NC}"
echo -e "  ./scripts/start.sh         ${NC}# Production mode"
echo -e "  ./scripts/start.sh --dev   ${NC}# Development mode"
echo ""
echo -e "${BLUE}Options:${NC}"
echo -e "  --dev, -d     Stop development containers"
echo -e "  --remove, -r  Stop and remove volumes (deletes all data)"
