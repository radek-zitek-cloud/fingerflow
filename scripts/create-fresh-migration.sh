#!/bin/bash
# Create fresh consolidated migration
# Run this ON YOUR VPS

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Creating fresh consolidated migration...${NC}"

cd /opt/fingerflow

# 1. Remove old migrations (on VPS, not in local dev)
echo "Removing old migration files..."
sudo rm -f backend/alembic/versions/*.py
sudo rm -rf backend/alembic/versions/__pycache__

# 2. Drop all tables (can't drop database while connected, so drop schema instead)
echo "Dropping all tables..."
docker exec fingerflow-postgres psql -U fingerflow -d fingerflow << 'EOF'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO fingerflow;
GRANT ALL ON SCHEMA public TO public;
EOF

# 3. Generate fresh migration in container
echo "Generating migration..."
docker exec fingerflow-backend alembic revision --autogenerate -m "initial_consolidated_schema"

# 4. Copy migration from container to host
MIGRATION_FILE=$(docker exec fingerflow-backend ls -t alembic/versions/*.py | head -1)
echo "Migration created: $MIGRATION_FILE"

# 5. Apply migration
echo "Applying migration..."
docker exec fingerflow-backend alembic upgrade head

# 6. Verify
echo ""
echo -e "${GREEN}Verification:${NC}"
docker exec fingerflow-backend alembic current
docker exec fingerflow-postgres psql -U fingerflow -d fingerflow -c "\dt"

echo ""
echo -e "${GREEN}✅ Migration created and applied!${NC}"
echo "Now restart backend: docker restart fingerflow-backend"
