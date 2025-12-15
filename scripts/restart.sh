#!/bin/bash
# Restart FingerFlow services

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     FingerFlow - Restart Services           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Parse arguments
DEV_MODE=false
REBUILD=false

for arg in "$@"; do
    case $arg in
        --dev|-d)
            DEV_MODE=true
            ;;
        --rebuild|-r)
            REBUILD=true
            ;;
    esac
done

if [ "$DEV_MODE" = true ]; then
    echo -e "${YELLOW}Restarting in DEVELOPMENT mode...${NC}"
    COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml"
else
    echo -e "${YELLOW}Restarting in PRODUCTION mode...${NC}"
    COMPOSE_FILES=""
fi

echo ""

# Stop services
echo -e "${BLUE}Stopping services...${NC}"
docker-compose $COMPOSE_FILES down

# Rebuild if requested
if [ "$REBUILD" = true ]; then
    echo ""
    echo -e "${BLUE}Rebuilding images...${NC}"
    if [ "$DEV_MODE" = true ]; then
        ./scripts/build.sh --dev
    else
        ./scripts/build.sh
    fi
fi

# Start services
echo ""
echo -e "${BLUE}Starting services...${NC}"
docker-compose $COMPOSE_FILES up -d

echo ""
echo -e "${GREEN}✓ Services restarted successfully!${NC}"
echo ""
echo -e "${BLUE}Access points:${NC}"
if [ "$DEV_MODE" = true ]; then
    echo -e "  Frontend: http://localhost:5173"
else
    echo -e "  Frontend: http://localhost"
fi
echo -e "  Backend:  http://localhost:8000"
echo -e "  API Docs: http://localhost:8000/docs"
echo ""
echo -e "${BLUE}To view logs:${NC}"
echo -e "  ./scripts/logs.sh"
