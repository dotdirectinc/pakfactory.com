#!/usr/bin/env python3
"""
Direct Google Drive API test using the service account.
Bypasses rclone to pinpoint whether the issue is access or rclone config.

Usage: python3 scripts/test-gdrive-api.py
Requires: pip install google-auth google-api-python-client
"""
import json, os, sys
from pathlib import Path

# ── Load env ──────────────────────────────────────────────────────────────────
env_file = Path(".env.local")
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        v = v.strip("'\"")
        os.environ.setdefault(k, v)

SA_JSON   = os.environ.get("GDRIVE_SERVICE_ACCOUNT_JSON", "")
FOLDER_ID = os.environ.get("GDRIVE_FOLDER_ID", "")

if not SA_JSON or not FOLDER_ID:
    print("❌  GDRIVE_SERVICE_ACCOUNT_JSON or GDRIVE_FOLDER_ID not set")
    sys.exit(1)

# ── Install deps if missing ───────────────────────────────────────────────────
try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
except ImportError:
    import subprocess
    print("Installing google-auth and google-api-python-client...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q",
                           "google-auth", "google-api-python-client"])
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload

SCOPES = ["https://www.googleapis.com/auth/drive"]

print("\n── Step 1: Authenticate service account ─────────────────────────────────")
sa_info = json.loads(SA_JSON)
creds = service_account.Credentials.from_service_account_info(sa_info, scopes=SCOPES)
service = build("drive", "v3", credentials=creds)
print(f"   ✅  Authenticated as: {sa_info['client_email']}")

print("\n── Step 2: Get folder metadata ──────────────────────────────────────────")
folder = None
for attempt, kwargs in enumerate([
    {"supportsAllDrives": False},
    {"supportsAllDrives": True},
    {"supportsAllDrives": True, "includePermissionsForView": "published"},
], 1):
    try:
        folder = service.files().get(
            fileId=FOLDER_ID,
            fields="id,name,mimeType,capabilities,permissions",
            **kwargs
        ).execute()
        print(f"   ✅  Found folder (attempt {attempt}): '{folder['name']}'")
        print(f"       kwargs used : {kwargs}")
        caps = folder.get("capabilities", {})
        print(f"       canAddChildren : {caps.get('canAddChildren')}")
        print(f"       canUploadFiles : {caps.get('canUploadFiles')}")
        break
    except Exception as e:
        print(f"   attempt {attempt} ({kwargs}): ❌  {e}")

if not folder:
    print()
    print("   ── Searching shared-with-me items for the folder ────────────────")
    res = service.files().list(
        q=f"sharedWithMe=true and mimeType='application/vnd.google-apps.folder'",
        fields="files(id,name)"
    ).execute()
    shared = res.get("files", [])
    if shared:
        print(f"   Folders shared with service account ({len(shared)}):")
        for f in shared:
            print(f"     - {f['name']}  ({f['id']})")
    else:
        print("   No folders shared with this service account at all.")
        print("   → Re-share the folder in Google Drive and re-run.")
    sys.exit(1)

print("\n── Step 3: List files in folder ─────────────────────────────────────────")
try:
    res = service.files().list(
        q=f"'{FOLDER_ID}' in parents",
        fields="files(id,name)"
    ).execute()
    files = res.get("files", [])
    print(f"   ✅  Listed {len(files)} file(s) in folder")
except Exception as e:
    print(f"   ❌  files.list failed: {e}")

print("\n── Step 4: Find the Shared Drive ID ────────────────────────────────────")
shared_drive_id = None
try:
    drives = service.drives().list(fields="drives(id,name)").execute()
    for d in drives.get("drives", []):
        print(f"   Shared Drive: '{d['name']}' ({d['id']})")
        shared_drive_id = d["id"]
except Exception as e:
    print(f"   drives.list failed: {e}")

# Also get driveId from folder metadata
try:
    folder_meta = service.files().get(
        fileId=FOLDER_ID, fields="id,name,driveId", supportsAllDrives=True
    ).execute()
    if folder_meta.get("driveId"):
        shared_drive_id = folder_meta["driveId"]
        print(f"   Folder belongs to Shared Drive: {shared_drive_id}")
        print(f"   → Set GDRIVE_SHARED_DRIVE_ID={shared_drive_id} in .env.local")
except Exception as e:
    print(f"   folder driveId lookup failed: {e}")

print("\n── Step 5: Create a test file (with supportsAllDrives=True) ─────────────")
import tempfile
with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tmp:
    tmp.write(b"rclone test upload")
    tmp_path = tmp.name

try:
    file_meta = {"name": "rclone-test.txt", "parents": [FOLDER_ID]}
    media = MediaFileUpload(tmp_path, mimetype="text/plain")
    created = service.files().create(
        body=file_meta, media_body=media, fields="id,name",
        supportsAllDrives=True
    ).execute()
    print(f"   ✅  Created test file: '{created['name']}' (id: {created['id']})")
    service.files().delete(fileId=created["id"], supportsAllDrives=True).execute()
    print("   ✅  Test file deleted — write access confirmed")
except Exception as e:
    print(f"   ❌  files.create failed: {e}")
finally:
    os.unlink(tmp_path)

print("\n✅  Drive API test complete\n")
