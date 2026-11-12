import json
import os
import sys
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload


def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Required GitHub Actions secret is missing: {name}")
    return value


def main() -> int:
    try:
        service_account_json = required_env("GOOGLE_SERVICE_ACCOUNT_JSON")
        folder_id = required_env("GOOGLE_DRIVE_BACKUP_FOLDER_ID")
        backup_path = Path(required_env("BACKUP_FILE"))

        if not backup_path.is_file() or backup_path.stat().st_size == 0:
            raise RuntimeError("Encrypted backup file is missing or empty.")
        if not backup_path.name.endswith(".dump.gpg"):
            raise RuntimeError("Refusing to upload a file that is not an encrypted database dump.")

        credentials_info = json.loads(service_account_json)
        credentials = service_account.Credentials.from_service_account_info(
            credentials_info,
            scopes=["https://www.googleapis.com/auth/drive.file"],
        )
        drive = build("drive", "v3", credentials=credentials, cache_discovery=False)

        metadata = {
            "name": backup_path.name,
            "mimeType": "application/octet-stream",
            "parents": [folder_id],
            "description": "Encrypted Akshaya Center Pookiparamba Supabase PostgreSQL database backup.",
        }
        media = MediaFileUpload(
            str(backup_path),
            mimetype="application/octet-stream",
            resumable=True,
            chunksize=1024 * 1024,
        )
        uploaded = drive.files().create(
            body=metadata,
            media_body=media,
            fields="id,name,size,createdTime,parents",
            supportsAllDrives=True,
        ).execute()

        if not uploaded.get("id") or uploaded.get("name") != backup_path.name:
            raise RuntimeError("Google Drive did not confirm the uploaded backup.")
        if str(uploaded.get("size", "0")) != str(backup_path.stat().st_size):
            raise RuntimeError("Uploaded backup size does not match the local encrypted file size.")

        print(
            "Backup uploaded and verified: "
            + uploaded["name"]
            + " (Drive file ID "
            + uploaded["id"]
            + ", bytes "
            + str(uploaded.get("size"))
            + ")"
        )
        return 0
    except Exception as exc:
        print(f"Google Drive backup failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
