#!/usr/bin/env bash
# Local test: mimics the GitHub Actions sanity-backup workflow
# Usage: GDRIVE_SERVICE_ACCOUNT_JSON="$(cat /path/to/sa.json)" \
#        GDRIVE_FOLDER_ID="your-folder-id" \
#        SANITY_BACKUP_TOKEN="your-token" \
#        bash scripts/test-gdrive-backup.sh
set -euo pipefail

# ── Load from .env.local if vars not already set ──────────────────────────────
if [ -f ".env.local" ]; then
  echo "Loading .env.local..."
  set -a
  # shellcheck disable=SC1091
  source .env.local 2>/dev/null || true
  set +a
fi

# ── Check required vars ───────────────────────────────────────────────────────
missing=()
[ -z "${GDRIVE_SERVICE_ACCOUNT_JSON:-}" ] && missing+=("GDRIVE_SERVICE_ACCOUNT_JSON")
[ -z "${GDRIVE_FOLDER_ID:-}" ]            && missing+=("GDRIVE_FOLDER_ID")
[ -z "${SANITY_BACKUP_TOKEN:-}" ]         && missing+=("SANITY_BACKUP_TOKEN")

if [ ${#missing[@]} -gt 0 ]; then
  echo "❌  Missing required env vars: ${missing[*]}"
  echo "    Set them in .env.local or export them before running."
  exit 1
fi

SA_FILE="/tmp/gdrive-sa-test.json"
RCLONE_CONF="/tmp/rclone-test.conf"
BACKUP_DIR="backups"
BACKUP_FILE="${BACKUP_DIR}/production.tar.gz"
PROJECT_ID="8293wrxp"

# ── Step 1: write service account JSON ───────────────────────────────────────
echo ""
echo "── Step 1: Write service account JSON ──────────────────────────────────"
printf '%s' "$GDRIVE_SERVICE_ACCOUNT_JSON" > "$SA_FILE"
echo "   Written to $SA_FILE ($(wc -c < "$SA_FILE") bytes)"

# ── Step 2: Validate JSON ─────────────────────────────────────────────────────
echo ""
echo "── Step 2: Validate JSON ────────────────────────────────────────────────"
if command -v python3 &>/dev/null; then
  python3 -c "
import json, sys
with open('$SA_FILE') as f:
  data = json.load(f)
print('   ✅  JSON valid')
print(f'   type: {data.get(\"type\")}')
print(f'   project_id: {data.get(\"project_id\")}')
print(f'   client_email: {data.get(\"client_email\")}')
pk = data.get('private_key', '')
print(f'   private_key starts with: {pk[:40]}...')
# Check for literal newlines inside the private key string
if '\n' in pk:
  print('   ℹ️   private_key contains actual newline chars (expected for a valid key)')
" || { echo "   ❌  JSON is invalid — this is your problem!"; cat "$SA_FILE" | head -5; exit 1; }
else
  echo "   (python3 not available, skipping JSON validation)"
fi

# ── Step 3: Configure rclone ──────────────────────────────────────────────────
echo ""
echo "── Step 3: Configure rclone ─────────────────────────────────────────────"
if ! command -v rclone &>/dev/null; then
  echo "   ⚠️   rclone not installed. Install with: brew install rclone"
  echo "   Skipping rclone steps."
  SKIP_RCLONE=1
else
  cat > "$RCLONE_CONF" << EOF
[gdrive]
type = drive
service_account_file = $SA_FILE
EOF
  echo "   rclone config written to $RCLONE_CONF"
  SKIP_RCLONE=0
fi

# ── Step 4: Test rclone connection ────────────────────────────────────────────
if [ "${SKIP_RCLONE:-0}" = "0" ]; then
  echo ""
  echo "── Step 4: Test rclone connection ───────────────────────────────────────"
  rclone lsf "gdrive:" \
    --config "$RCLONE_CONF" \
    --drive-root-folder-id "$GDRIVE_FOLDER_ID" \
    --dirs-only \
    --max-depth 1 \
    && echo "   ✅  rclone can list Drive folder" \
    || { echo "   ❌  rclone connection failed"; exit 1; }
fi

# ── Step 5: Test Sanity export ────────────────────────────────────────────────
echo ""
echo "── Step 5: Test Sanity export ───────────────────────────────────────────"
mkdir -p "$BACKUP_DIR"
SANITY_AUTH_TOKEN="$SANITY_BACKUP_TOKEN" \
  npx sanity@latest dataset export production \
    "$BACKUP_FILE" \
    -p "$PROJECT_ID" \
    --overwrite \
  && echo "   ✅  Export saved to $BACKUP_FILE" \
  || { echo "   ❌  Sanity export failed"; exit 1; }

# ── Step 6: Test rclone upload ────────────────────────────────────────────────
if [ "${SKIP_RCLONE:-0}" = "0" ]; then
  FOLDER=$(date -u '+%m%d%Y')
  echo ""
  echo "── Step 6: Test rclone upload ───────────────────────────────────────────"
  rclone copy "$BACKUP_FILE" \
    "gdrive:${FOLDER}/" \
    --config "$RCLONE_CONF" \
    --drive-root-folder-id "$GDRIVE_FOLDER_ID" \
    --progress \
  && echo "   ✅  Upload complete" \
  || { echo "   ❌  Upload failed"; exit 1; }
fi

echo ""
echo "✅  All steps passed!"

# Cleanup
rm -f "$SA_FILE" "$RCLONE_CONF"
