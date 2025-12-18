#!/bin/bash
# Reset database and apply all migrations from scratch
# Run this ON YOUR VPS or locally with Docker
#
# WARNING: This DELETES ALL DATA!

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}⚠️  WARNING: This will DELETE ALL DATA in the database!${NC}"
echo -e "${YELLOW}This script will:${NC}"
echo "  1. Drop the entire public schema (all tables, data, everything)"
echo "  2. Recreate the schema"
echo "  3. Run all migrations from scratch"
echo ""
read -p "Type 'YES' to confirm: " -r
echo

if [[ ! $REPLY == "YES" ]]; then
    echo "Aborted."
    exit 1
fi

echo -e "${YELLOW}Resetting database...${NC}"

# Drop and recreate schema
echo "Dropping schema..."
docker exec fingerflow-postgres psql -U fingerflow -d fingerflow << 'EOF'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO fingerflow;
GRANT ALL ON SCHEMA public TO public;
EOF

echo -e "${GREEN}✓ Schema dropped and recreated${NC}"

# Run migrations
echo ""
echo "Running migrations..."
docker exec fingerflow-backend python migrate.py

# Verify
echo ""
echo -e "${GREEN}Verification:${NC}"
docker exec fingerflow-backend python migrate.py --current

echo ""
echo -e "${GREEN}✅ Database reset complete!${NC}"
echo "Restart backend to ensure clean state: docker restart fingerflow-backend"
