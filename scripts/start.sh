#!/bin/bash
# Start FingerFlow services with Docker Compose

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     FingerFlow - Start Services             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Check if running in dev mode
DEV_MODE=false
DETACHED=false

for arg in "$@"; do
    case $arg in
        --dev|-d)
            DEV_MODE=true
            ;;
        --detach|--background|-b)
            DETACHED=true
            ;;
    esac
done

if [ "$DEV_MODE" = true ]; then
    echo -e "${YELLOW}Starting in DEVELOPMENT mode...${NC}"
    echo -e "${BLUE}Hot reloading enabled for both frontend and backend${NC}"
    echo ""

    if [ "$DETACHED" = true ]; then
        docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
    else
        docker compose -f docker-compose.yml -f docker-compose.dev.yml up
    fi
else
    echo -e "${YELLOW}Starting in PRODUCTION mode...${NC}"
    echo ""

    if [ "$DETACHED" = true ]; then
        docker compose up -d
    else
        docker compose up
    fi
fi

if [ "$DETACHED" = true ]; then
    echo ""
    echo -e "${GREEN}✓ Services started in background!${NC}"
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
    echo ""
    echo -e "${BLUE}To stop services:${NC}"
    echo -e "  ./scripts/stop.sh"
fi
