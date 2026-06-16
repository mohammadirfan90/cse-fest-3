#!/bin/bash
# Backup parameters
BACKUP_DIR="/var/www/cse-fest/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_BACKUP_FILE="${BACKUP_DIR}/supabase_backup_${TIMESTAMP}.sql"
SUBMISSION_BACKUP_FILE="${BACKUP_DIR}/submissions_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

# Dump Supabase Database (Using connection parameters)
pg_dump "postgresql://postgres:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
  -F c -b -v -f "$DB_BACKUP_FILE"

# Package submissions folder
tar -czf "$SUBMISSION_BACKUP_FILE" -C /var/www/cse-fest/storage submissions

# Encrypt backups using gpg key
gpg --encrypt --recipient admin@smuct.edu.bd "$DB_BACKUP_FILE"
gpg --encrypt --recipient admin@smuct.edu.bd "$SUBMISSION_BACKUP_FILE"

# Clean up unencrypted versions
rm "$DB_BACKUP_FILE"
rm "$SUBMISSION_BACKUP_FILE"

# Transmit encrypted files to offsite secure backup repository immediately (due to strict 50GB local server limit)
scp "${DB_BACKUP_FILE}.gpg" "${SUBMISSION_BACKUP_FILE}.gpg" backup-user@backup-host.smuct.edu.bd:/var/backups/cse-fest/

# Verify upload, then immediately remove encrypted local files to keep disk usage near zero
if [ $? -eq 0 ]; then
  rm "${DB_BACKUP_FILE}.gpg"
  rm "${SUBMISSION_BACKUP_FILE}.gpg"
else
  # Alert admin of failed backup transfer
  curl -X POST -H "Content-Type: application/json" -d '{"content": "🚨 ALERT: Offsite backup transfer failed!"}' https://discord.com/api/webhooks/your-alert-webhook
fi
