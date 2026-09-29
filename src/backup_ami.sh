#!/bin/bash

BACKUP_DIR="backups"
DB_FILE="src/data/ami_memory.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/ami_backup_$TIMESTAMP.db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
cp "$DB_FILE" "$BACKUP_FILE"

echo "✅ Backup created: $BACKUP_FILE"

# Keep only last 10 backups
cd "$BACKUP_DIR"
ls -t ami_backup_*.db | tail -n +11 | xargs rm -f 2>/dev/null

echo "✅ Old backups cleaned (keeping last 10)"
