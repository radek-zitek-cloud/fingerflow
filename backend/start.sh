#!/bin/bash
# FingerFlow Backend Startup Script

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting FingerFlow Backend...${NC}"

# Activate virtual environment
if [ -d ".venv" ]; then
    source .venv/bin/activate
    echo -e "${GREEN}✓ Virtual environment activated${NC}"
else
    echo "Error: Virtual environment not found. Run: python -m venv .venv"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env from template..."
    cp .env.example .env
    echo -e "${GREEN}✓ .env created. Please update with your configuration${NC}"
fi

# Start uvicorn server
echo -e "${BLUE}Starting uvicorn server...${NC}"
echo -e "${GREEN}Backend will be available at: http://localhost:8000${NC}"
echo -e "${GREEN}API Documentation at: http://localhost:8000/docs${NC}"
echo ""

uvicorn main:app --reload --log-level info
