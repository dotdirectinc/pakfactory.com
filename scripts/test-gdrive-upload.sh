#!/usr/bin/env bash
# Local test: GDrive upload only (assumes backup file already exists)
# Usage: bash scripts/test-gdrive-upload.sh [path/to/backup.tar.gz]
set -euo pipefail

# ── Load .env.local ───────────────────────────────────────────────────────────
if [ -f ".env.local" ]; then
  set -a; source .env.local 2>/dev/null || true; set +a
fi

# ── Check required vars ───────────────────────────────────────────────────────
missing=()
[ -z "${GDRIVE_SERVICE_ACCOUNT_JSON:-}" ] && missing+=("GDRIVE_SERVICE_ACCOUNT_JSON")
[ -z "${GDRIVE_FOLDER_ID:-}" ]            && missing+=("GDRIVE_FOLDER_ID")
if [ ${#missing[@]} -gt 0 ]; then
  echo "❌  Missing: ${missing[*]}"; exit 1
fi

# ── Pick backup file ──────────────────────────────────────────────────────────
BACKUP_FILE="${1:-backups/production.tar.gz}"
if [ ! -f "$BACKUP_FILE" ]; then
  # Fall back to any production backup
  BACKUP_FILE=$(ls -t backups/sanity-production-*.tar.gz 2>/dev/null | head -1 || true)
fi
if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "❌  No backup file found. Run the backup first: bash scripts/test-gdrive-backup.sh"
  exit 1
fi

SA_FILE="/tmp/gdrive-sa-test.json"
RCLONE_CONF="/tmp/rclone-test.conf"
FOLDER=$(date -u '+%m%d%Y')

echo "Uploading: $BACKUP_FILE (→ gdrive:${FOLDER}/$(basename "$BACKUP_FILE"))"

# ── Write service account JSON ────────────────────────────────────────────────
echo ""
echo "── Step 1: Write + validate service account JSON ───────────────────────"
printf '%s' "$GDRIVE_SERVICE_ACCOUNT_JSON" > "$SA_FILE"
python3 -c "
import json
with open('$SA_FILE') as f: data = json.load(f)
print('   ✅  JSON valid —', data.get('client_email'))
" || { echo "   ❌  Invalid JSON — fix GDRIVE_SERVICE_ACCOUNT_JSON in .env.local"; exit 1; }

# ── Configure rclone ──────────────────────────────────────────────────────────
echo ""
echo "── Step 2: Configure rclone ─────────────────────────────────────────────"
SHARED_DRIVE_ID="${GDRIVE_SHARED_DRIVE_ID:-}"
if [ -z "$SHARED_DRIVE_ID" ]; then
  echo "❌  GDRIVE_SHARED_DRIVE_ID not set in .env.local"; exit 1
fi

cat > "$RCLONE_CONF" << EOF
[gdrive]
type = drive
service_account_file = $SA_FILE
team_drive = $SHARED_DRIVE_ID
root_folder_id = $GDRIVE_FOLDER_ID
EOF
echo "   Config written"

# ── Upload to service account's own Drive ────────────────────────────────────
echo ""
echo "── Step 3: Upload to Shared Drive folder (${FOLDER}/) ───────────────────"
rclone copy "$BACKUP_FILE" \
  "gdrive:${FOLDER}/" \
  --config "$RCLONE_CONF" \
  --progress \
  && echo "   ✅  Upload complete → gdrive:${FOLDER}/$(basename "$BACKUP_FILE")" \
  || { echo "   ❌  Upload failed"; exit 1; }

# ── Auto-share the sanity-backups folder with the human user ─────────────────
echo ""
echo "── Step 4: Share sanity-backups folder with ${SHARE_WITH_EMAIL:-} ────────"
if [ -z "${SHARE_WITH_EMAIL:-}" ]; then
  echo "   ⚠️   SHARE_WITH_EMAIL not set in .env.local — skipping auto-share"
  echo "   Add SHARE_WITH_EMAIL=your@email.com to .env.local to auto-share"
else
  python3 - <<PYEOF
import json, os, sys
from google.oauth2 import service_account
from googleapiclient.discovery import build

SA_JSON = os.environ["GDRIVE_SERVICE_ACCOUNT_JSON"]
email   = os.environ["SHARE_WITH_EMAIL"]

creds   = service_account.Credentials.from_service_account_info(
    json.loads(SA_JSON),
    scopes=["https://www.googleapis.com/auth/drive"]
)
service = build("drive", "v3", credentials=creds)

# Find the sanity-backups folder
res = service.files().list(
    q="name='sanity-backups' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields="files(id,name)"
).execute()
files = res.get("files", [])
if not files:
    print("   ⚠️   sanity-backups folder not found yet (may take a moment)")
    sys.exit(0)
folder_id = files[0]["id"]

# Share with the user (skip if already shared)
try:
    service.permissions().create(
        fileId=folder_id,
        body={"type": "user", "role": "reader", "emailAddress": email},
        sendNotificationEmail=False
    ).execute()
    print(f"   ✅  sanity-backups shared with {email}")
    print(f"   Open: https://drive.google.com/drive/folders/{folder_id}")
except Exception as e:
    print(f"   ℹ️   {e}")
PYEOF
fi

echo ""
echo "✅  Done!"
rm -f "$SA_FILE" "$RCLONE_CONF"
