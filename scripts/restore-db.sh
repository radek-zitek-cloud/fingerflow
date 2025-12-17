#!/bin/bash
# FingerFlow Database Restore Script
# Usage: ./scripts/restore-db.sh <backup-file>

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if backup file provided
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Error: No backup file specified${NC}"
    echo ""
    echo "Usage: $0 <backup-file>"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/*.dump 2>/dev/null || echo "  No backups found in ./backups/"
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  ⚠️  DATABASE RESTORE WARNING ⚠️${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "This will REPLACE the current database with:"
echo "  File: $BACKUP_FILE"
echo "  Size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo ""
echo -e "${RED}ALL CURRENT DATA WILL BE LOST!${NC}"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Check if postgres container is running
if ! docker compose ps postgres | grep -q "Up"; then
    echo -e "${RED}❌ Error: PostgreSQL container is not running${NC}"
    exit 1
fi

# Stop backend to prevent writes during restore
echo ""
echo -e "${YELLOW}🛑 Stopping backend...${NC}"
docker compose stop backend

# Create a safety backup of current state
echo ""
echo -e "${YELLOW}📦 Creating safety backup of current state...${NC}"
SAFETY_BACKUP="./backups/pre_restore_$(date +%Y%m%d_%H%M%S).dump"
docker compose exec -T postgres pg_dump -U fingerflow -Fc fingerflow > "$SAFETY_BACKUP"
echo -e "${GREEN}✅ Safety backup created: $SAFETY_BACKUP${NC}"

# Restore database
echo ""
echo -e "${YELLOW}🔄 Restoring database from backup...${NC}"
cat "$BACKUP_FILE" | docker compose exec -T postgres pg_restore -U fingerflow -d fingerflow -c --if-exists

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database restored successfully${NC}"
else
    echo -e "${RED}❌ Restore failed!${NC}"
    echo ""
    echo "Rolling back to safety backup..."
    cat "$SAFETY_BACKUP" | docker compose exec -T postgres pg_restore -U fingerflow -d fingerflow -c --if-exists
    echo "Restore rolled back. Check logs for errors."
    exit 1
fi

# Restart backend
echo ""
echo -e "${YELLOW}🚀 Restarting backend...${NC}"
docker compose start backend

# Wait for backend to be healthy
echo -e "${YELLOW}⏳ Waiting for backend to be healthy...${NC}"
sleep 5

max_attempts=15
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker compose exec -T backend curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
        break
    fi
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}❌ Backend health check failed${NC}"
        echo "Check logs with: docker compose logs backend"
        exit 1
    fi
    sleep 2
done

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Database restore completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Restored from: $BACKUP_FILE"
echo "Safety backup: $SAFETY_BACKUP (keep this in case of issues)"
echo ""
