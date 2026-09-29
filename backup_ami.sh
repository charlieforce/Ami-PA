#!/bin/bash
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"
cp "src/data/ami_memory.db" "$BACKUP_DIR/ami_backup_$(date +%Y%m%d_%H%M%S).db"
echo "✅ Backup created"
cd "$BACKUP_DIR"
ls -t ami_backup_*.db | tail -n +11 | xargs rm -f 2>/dev/null
echo "✅ Old backups cleaned"
