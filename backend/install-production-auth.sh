#!/bin/bash
# Install Production Authentication Features

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  FingerFlow Production Auth Installation    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Check if in backend directory
if [ ! -f "requirements.txt" ]; then
    echo -e "${YELLOW}Please run this script from the backend directory${NC}"
    exit 1
fi

# Activate virtual environment
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}Virtual environment not found. Creating...${NC}"
    python -m venv .venv
fi

echo -e "${BLUE}Activating virtual environment...${NC}"
source .venv/bin/activate

# Install new dependencies
echo -e "${BLUE}Installing new dependencies...${NC}"
pip install aiosmtplib==3.0.1
pip install pyotp==2.9.0
pip install qrcode[pil]==7.4.2

echo -e "${GREEN}✓ Dependencies installed${NC}"

# Backup existing database
if [ -f "fingerflow.db" ]; then
    echo -e "${YELLOW}Backing up existing database...${NC}"
    cp fingerflow.db fingerflow.db.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✓ Database backed up${NC}"
fi

# Update .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env from template...${NC}"
    cp .env.example .env
fi

# Add new environment variables if not present
if ! grep -q "EMAIL_PROVIDER" .env; then
    echo -e "${BLUE}Adding new configuration to .env...${NC}"
    cat >> .env << 'EOL'

# Email Configuration (Production Auth Features)
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@fingerflow.com
EMAIL_FROM_NAME=FingerFlow
FRONTEND_URL=http://localhost:5173

# SMTP Settings (uncomment and configure if using SMTP)
#SMTP_HOST=smtp.gmail.com
#SMTP_PORT=587
#SMTP_USERNAME=your-email@gmail.com
#SMTP_PASSWORD=your-app-password
#SMTP_USE_TLS=true

# Refresh Token
REFRESH_TOKEN_EXPIRE_DAYS=7

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_SECONDS=60
EOL
    echo -e "${GREEN}✓ Configuration added to .env${NC}"
fi

# Create new database with updated schema
echo ""
echo -e "${YELLOW}Database Migration Required${NC}"
echo "The new features require database schema changes."
echo ""
echo "Choose migration option:"
echo "  1) Fresh database (DELETE existing data)"
echo "  2) Keep database (manual migration needed)"
echo -n "Enter choice [1-2]: "
read choice

if [ "$choice" = "1" ]; then
    echo -e "${YELLOW}Deleting existing database...${NC}"
    rm -f fingerflow.db
    echo -e "${GREEN}✓ Database will be recreated on next server start${NC}"
elif [ "$choice" = "2" ]; then
    echo -e "${YELLOW}Keeping existing database${NC}"
    echo -e "${YELLOW}Run migrations manually:${NC}"
    echo "  python migrate.py"
    echo "Or if using Docker:"
    echo "  docker exec fingerflow-backend python migrate.py"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Installation Complete! ✨             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Configure email settings in .env"
echo "2. Start the server: uvicorn main:app --reload"
echo "3. Test new features:"
echo "   - Email verification"
echo "   - Password reset"
echo "   - 2FA setup"
echo "   - Refresh tokens"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "- See PRODUCTION_AUTH.md for complete guide"
echo "- API docs: http://localhost:8000/docs"
echo ""
