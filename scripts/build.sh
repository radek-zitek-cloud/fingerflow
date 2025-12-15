#!/bin/bash
# Build Docker images for FingerFlow

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     FingerFlow - Docker Build Script        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Check if running in dev mode
DEV_MODE=false
if [ "$1" == "--dev" ] || [ "$1" == "-d" ]; then
    DEV_MODE=true
    echo -e "${YELLOW}Building in DEVELOPMENT mode...${NC}"
else
    echo -e "${YELLOW}Building in PRODUCTION mode...${NC}"
fi

# Navigate to project root
cd "$(dirname "$0")/.."

if [ "$DEV_MODE" = true ]; then
    # Build development images
    echo -e "${BLUE}Building backend development image...${NC}"
    docker build -t fingerflow-backend:dev -f backend/Dockerfile.dev backend/

    echo -e "${BLUE}Building frontend development image...${NC}"
    docker build -t fingerflow-frontend:dev -f frontend/Dockerfile.dev frontend/

    echo ""
    echo -e "${GREEN}✓ Development images built successfully!${NC}"
    echo ""
    echo -e "${BLUE}To start development environment:${NC}"
    echo -e "  ./scripts/start.sh --dev"
else
    # Build production images
    echo -e "${BLUE}Building backend production image...${NC}"
    docker build -t fingerflow-backend:latest backend/

    echo -e "${BLUE}Building frontend production image...${NC}"
    docker build -t fingerflow-frontend:latest frontend/

    echo ""
    echo -e "${GREEN}✓ Production images built successfully!${NC}"
    echo ""
    echo -e "${BLUE}To start production environment:${NC}"
    echo -e "  ./scripts/start.sh"
fi

# Show images
echo ""
echo -e "${BLUE}Docker images:${NC}"
docker images | grep fingerflow || true

echo ""
echo -e "${GREEN}Build complete!${NC}"
