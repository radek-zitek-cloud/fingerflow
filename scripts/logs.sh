#!/bin/bash
# View logs for FingerFlow services

set -e

# Colors for output
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     FingerFlow - Service Logs                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Parse arguments
FOLLOW=true
SERVICE=""
DEV_MODE=false

for arg in "$@"; do
    case $arg in
        --no-follow|-n)
            FOLLOW=false
            ;;
        --dev|-d)
            DEV_MODE=true
            ;;
        backend|frontend)
            SERVICE=$arg
            ;;
    esac
done

# Build docker compose command with appropriate files
if [ "$DEV_MODE" = true ]; then
    COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml"
else
    COMPOSE_FILES="-f docker-compose.yml"
fi

if [ "$FOLLOW" = true ]; then
    LOGS_CMD="docker compose $COMPOSE_FILES logs -f"
else
    LOGS_CMD="docker compose $COMPOSE_FILES logs"
fi

# Add service if specified
if [ -n "$SERVICE" ]; then
    LOGS_CMD="$LOGS_CMD $SERVICE"
    echo -e "${BLUE}Showing logs for: $SERVICE${NC}"
else
    echo -e "${BLUE}Showing logs for all services${NC}"
fi

echo ""
if [ "$DEV_MODE" = true ]; then
    echo -e "${BLUE}Viewing development logs...${NC}"
else
    echo -e "${BLUE}Viewing production logs...${NC}"
fi
echo -e "${BLUE}Press Ctrl+C to exit${NC}"
echo ""

# Show logs
$LOGS_CMD
