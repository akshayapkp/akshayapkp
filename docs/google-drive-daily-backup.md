# Google Drive daily database backup

This backup is separate from the existing Google Drive folder used for application forms, PDFs, and photos. It does not move, edit, or delete existing files.

## What it does

- Runs manually from GitHub Actions or daily at 02:00 India Standard Time.
- Creates a PostgreSQL custom-format dump of the Supabase database.
- Encrypts the dump with AES-256 before upload.
- Uploads only the encrypted `.dump.gpg` file to a dedicated Drive folder.
- Verifies that Google Drive reports the uploaded file size matches the local encrypted file.
- Does not automatically delete old backups or migrate application records.

## Required GitHub Actions secrets

Add these in **GitHub repository → Settings → Secrets and variables → Actions → New repository secret**:

1. `SUPABASE_DB_URL`: PostgreSQL connection string for the intended Supabase project. Use the database connection string from Supabase Dashboard → Connect. Keep it secret; do not commit it to the repository.
2. `GOOGLE_SERVICE_ACCOUNT_JSON`: the complete JSON key for a Google Cloud service account with Google Drive API enabled.
3. `GOOGLE_DRIVE_BACKUP_FOLDER_ID`: ID of a **dedicated database-backup folder**, not the existing folder for application forms and uploads.
4. `BACKUP_ENCRYPTION_PASSPHRASE`: a long, unique passphrase. Store it separately in a password manager; restoring a backup requires this exact passphrase.

## Google Drive setup

1. In Google Cloud Console, create/select a project and enable Google Drive API.
2. Create a service account and a JSON key. Treat the key as a password.
3. Create a separate folder in Google Drive named, for example, `Akshaya PKP Database Backups`.
4. Share only that backup folder with the service account email, with Editor access. Do not share the existing application-documents folder.
5. Put the folder ID and service-account JSON in GitHub Actions secrets.

## Safe rollout requirements

- Do not run this against the production database until the live billing/data verification has been completed and the correct Supabase project has been confirmed.
- The first run should be started manually from Actions and checked for a successful upload before relying on the schedule.
- Keep the encryption passphrase safe and separate from Drive. If it is lost, the encrypted backups cannot be restored.
- This workflow backs up the Supabase PostgreSQL database only. It does not back up Supabase Storage objects or files in Google Drive.
- The script does not delete any old Drive files. Retention and restore testing should be added only after the first successful backup is verified.

## Restore outline

Download the encrypted `.dump.gpg` file, decrypt it using the saved passphrase, then restore with a compatible `pg_restore` to a separate/test database first. Never restore over production without a verified recovery plan.
