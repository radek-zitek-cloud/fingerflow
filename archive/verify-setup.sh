#!/bin/bash
# Verify FingerFlow Setup

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   FingerFlow Setup Verification             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

ERRORS=0

# Check Python version
echo -n "Checking Python version... "
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    echo -e "${GREEN}✓ Python $PYTHON_VERSION${NC}"
else
    echo -e "${RED}✗ Python 3 not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check Node.js version
echo -n "Checking Node.js version... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check backend virtual environment
echo -n "Checking backend virtual environment... "
if [ -d "backend/.venv" ]; then
    echo -e "${GREEN}✓ Virtual environment exists${NC}"
else
    echo -e "${RED}✗ Virtual environment not found${NC}"
    echo "   Run: cd backend && python -m venv .venv"
    ERRORS=$((ERRORS + 1))
fi

# Check backend dependencies
echo -n "Checking backend dependencies... "
if [ -f "backend/.venv/bin/activate" ]; then
    source backend/.venv/bin/activate
    if python -c "import fastapi, sqlalchemy, pydantic" 2>/dev/null; then
        echo -e "${GREEN}✓ Core dependencies installed${NC}"
    else
        echo -e "${RED}✗ Dependencies missing${NC}"
        echo "   Run: cd backend && pip install -r requirements.txt"
        ERRORS=$((ERRORS + 1))
    fi
    deactivate
fi

# Check email-validator specifically
echo -n "Checking email-validator... "
if [ -f "backend/.venv/bin/activate" ]; then
    source backend/.venv/bin/activate
    if python -c "import email_validator" 2>/dev/null; then
        echo -e "${GREEN}✓ email-validator installed${NC}"
    else
        echo -e "${RED}✗ email-validator missing${NC}"
        echo "   Run: cd backend && pip install email-validator"
        ERRORS=$((ERRORS + 1))
    fi
    deactivate
fi

# Check frontend dependencies
echo -n "Checking frontend dependencies... "
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✓ Node modules installed${NC}"
else
    echo -e "${RED}✗ Node modules not found${NC}"
    echo "   Run: cd frontend && npm install"
    ERRORS=$((ERRORS + 1))
fi

# Check .env file
echo -n "Checking backend .env file... "
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
else
    echo -e "${RED}✗ .env file missing${NC}"
    echo "   Run: cd backend && cp .env.example .env"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready to start development.${NC}"
    echo ""
    echo "To start the application:"
    echo "  ./start-dev.sh          # Start both backend and frontend"
    echo "  cd backend && ./start.sh # Start backend only"
    echo "  cd frontend && npm run dev # Start frontend only"
else
    echo -e "${RED}✗ Found $ERRORS issue(s). Please resolve them first.${NC}"
    exit 1
fi
