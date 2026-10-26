#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Royal Design Studio — Database & File Backup Script
#  Run this script on a cron schedule (e.g., daily at 2am):
#  0 2 * * * /app/scripts/backup.sh >> /var/log/rds-backup.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
UPLOADS_DIR="${UPLOAD_DIR:-/app/uploads}"
KEEP_DAYS="${POSTGRES_BACKUP_KEEP_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="rds_backup_${TIMESTAMP}"

# Parse DATABASE_URL for pg_dump
DB_URL="${DATABASE_URL:-}"

# ── Create backup directory ───────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"

echo "=========================================="
echo "Royal Design Studio Backup"
echo "Timestamp: ${TIMESTAMP}"
echo "=========================================="

# ── Database backup ───────────────────────────────────────────────────────────
echo "[1/3] Backing up PostgreSQL database..."
pg_dump "${DB_URL}" \
  --format=custom \
  --no-acl \
  --no-owner \
  --file="${BACKUP_DIR}/${BACKUP_NAME}/database.pgdump"

echo "    ✓ Database dump complete"

# ── Uploads backup ────────────────────────────────────────────────────────────
echo "[2/3] Backing up uploaded files..."
if [ -d "${UPLOADS_DIR}" ]; then
  tar -czf "${BACKUP_DIR}/${BACKUP_NAME}/uploads.tar.gz" -C "$(dirname ${UPLOADS_DIR})" "$(basename ${UPLOADS_DIR})"
  echo "    ✓ Uploads archived"
else
  echo "    ⚠ Uploads directory not found, skipping"
fi

# ── Compress whole backup ─────────────────────────────────────────────────────
echo "[3/3] Compressing backup package..."
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" -C "${BACKUP_DIR}" "${BACKUP_NAME}"
rm -rf "${BACKUP_DIR}/${BACKUP_NAME}"
echo "    ✓ Backup saved: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# ── Cleanup old backups ───────────────────────────────────────────────────────
echo "Cleaning up backups older than ${KEEP_DAYS} days..."
find "${BACKUP_DIR}" -name "rds_backup_*.tar.gz" -mtime "+${KEEP_DAYS}" -delete
echo "    ✓ Cleanup done"

# ── Summary ───────────────────────────────────────────────────────────────────
BACKUP_SIZE=$(du -sh "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
echo ""
echo "Backup complete! Size: ${BACKUP_SIZE}"
echo "File: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo ""
echo "⚠ IMPORTANT: Copy this backup off-server to remote storage (S3, Google Drive, etc.)"
