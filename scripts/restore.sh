#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Royal Design Studio — Database Restore Script
#  Usage: ./scripts/restore.sh /path/to/rds_backup_YYYYMMDD_HHMMSS.tar.gz
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "Usage: $0 /path/to/rds_backup_YYYYMMDD_HHMMSS.tar.gz"
  exit 1
fi

DB_URL="${DATABASE_URL:-}"
UPLOADS_DIR="${UPLOAD_DIR:-/app/uploads}"
TMP_DIR="/tmp/rds_restore_$$"

echo "================================================"
echo "Royal Design Studio — Database Restore"
echo "File: ${BACKUP_FILE}"
echo "================================================"
echo ""
echo "⚠  WARNING: This will overwrite the current database and uploads!"
read -p "Type 'yes' to confirm: " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

# ── Extract ───────────────────────────────────────────────────────────────────
echo "[1/3] Extracting backup..."
mkdir -p "${TMP_DIR}"
tar -xzf "${BACKUP_FILE}" -C "${TMP_DIR}"
BACKUP_NAME=$(ls "${TMP_DIR}")
echo "    ✓ Extracted: ${BACKUP_NAME}"

# ── Restore database ──────────────────────────────────────────────────────────
echo "[2/3] Restoring PostgreSQL database..."
pg_restore \
  --dbname="${DB_URL}" \
  --clean \
  --if-exists \
  --no-acl \
  --no-owner \
  "${TMP_DIR}/${BACKUP_NAME}/database.pgdump"
echo "    ✓ Database restored"

# ── Restore uploads ───────────────────────────────────────────────────────────
echo "[3/3] Restoring uploaded files..."
if [ -f "${TMP_DIR}/${BACKUP_NAME}/uploads.tar.gz" ]; then
  mkdir -p "${UPLOADS_DIR}"
  tar -xzf "${TMP_DIR}/${BACKUP_NAME}/uploads.tar.gz" -C "$(dirname ${UPLOADS_DIR})"
  echo "    ✓ Uploads restored"
else
  echo "    ⚠ No uploads archive found, skipping"
fi

# ── Cleanup ───────────────────────────────────────────────────────────────────
rm -rf "${TMP_DIR}"

echo ""
echo "✅ Restore complete!"
echo "Run: npx prisma migrate deploy  (to ensure migrations are current)"
