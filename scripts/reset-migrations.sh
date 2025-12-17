#!/bin/bash
# Reset Alembic migrations and create fresh database schema
# WARNING: This will DROP ALL TABLES and recreate them!

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}  ⚠️  DATABASE RESET WARNING ⚠️${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "This will:"
echo "  1. DROP ALL TABLES in the database"
echo "  2. Remove all old migration files"
echo "  3. Create a fresh consolidated migration"
echo "  4. Apply the new migration"
echo ""
echo -e "${RED}ALL DATA WILL BE LOST!${NC}"
echo ""
read -p "Are you sure? Type 'RESET' to confirm: " CONFIRM

if [ "$CONFIRM" != "RESET" ]; then
    echo "Reset cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}📦 Creating safety backup...${NC}"
./scripts/backup-db.sh || echo "Backup failed or skipped"

echo ""
echo -e "${YELLOW}🗑️  Dropping all tables...${NC}"
docker exec fingerflow-postgres psql -U fingerflow -d fingerflow << 'EOF'
DROP TABLE IF EXISTS alembic_version CASCADE;
DROP TABLE IF EXISTS telemetry_events CASCADE;
DROP TABLE IF EXISTS typing_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS word_sets CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
EOF

echo -e "${GREEN}✅ Tables dropped${NC}"

echo ""
echo -e "${YELLOW}🧹 Removing old migration files...${NC}"
rm -f backend/alembic/versions/*.py
rm -rf backend/alembic/versions/__pycache__

echo -e "${GREEN}✅ Old migrations removed${NC}"

echo ""
echo -e "${YELLOW}📝 Creating fresh migration...${NC}"
docker exec fingerflow-backend alembic revision --autogenerate -m "consolidated_initial_schema"

echo -e "${GREEN}✅ Migration created${NC}"

echo ""
echo -e "${YELLOW}🚀 Applying migration...${NC}"
docker exec fingerflow-backend alembic upgrade head

echo -e "${GREEN}✅ Migration applied${NC}"

echo ""
echo -e "${YELLOW}📊 Verifying tables...${NC}"
docker exec fingerflow-postgres psql -U fingerflow -d fingerflow -c "\dt"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Database reset complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "  1. Restart backend: docker restart fingerflow-backend"
echo "  2. Test the application"
echo ""
