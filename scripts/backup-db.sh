#!/bin/bash
# FingerFlow Database Backup Script
# Usage: ./scripts/backup-db.sh

set -e  # Exit on any error

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/fingerflow_backup_$DATE.dump"
RETENTION_DAYS=7

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}📦 Starting database backup...${NC}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if postgres container is running
if ! docker compose ps postgres | grep -q "Up"; then
    echo "❌ Error: PostgreSQL container is not running"
    exit 1
fi

# Create compressed backup
echo "Creating backup: $BACKUP_FILE"
docker compose exec -T postgres pg_dump -U fingerflow -Fc fingerflow > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    # Get backup size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup completed successfully${NC}"
    echo "   File: $BACKUP_FILE"
    echo "   Size: $SIZE"

    # Clean up old backups
    echo ""
    echo "🗑️  Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
    find "$BACKUP_DIR" -name "fingerflow_backup_*.dump" -mtime +$RETENTION_DAYS -delete

    # List recent backups
    echo ""
    echo "📁 Recent backups:"
    ls -lh "$BACKUP_DIR" | tail -n 5
else
    echo "❌ Backup failed!"
    exit 1
fi
