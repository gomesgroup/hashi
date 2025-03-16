# Backup and Recovery Guide

This document outlines the backup and recovery procedures for Hashi deployments, ensuring data integrity and availability in case of system failures.

## Overview

A comprehensive backup strategy for Hashi should include:

1. **Database Backups**: Postgresql data
2. **File Storage Backups**: Uploaded molecular structures
3. **Snapshot Backups**: Rendered images and visualizations
4. **Configuration Backups**: Environment variables and settings
5. **Container Images**: Tagged and versioned Docker images

## Database Backup

### Automated Database Backup

Create a script to automate PostgreSQL database backups:

```bash
#!/bin/bash
# db-backup.sh

# Configuration
BACKUP_DIR="/path/to/backups/database"
RETAIN_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/hashi_db_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Execute backup
docker-compose exec -T db pg_dump \
  -U ${DB_USERNAME:-postgres} \
  -d ${DB_DATABASE:-hashi} \
  > $BACKUP_FILE

# Compress the backup
gzip $BACKUP_FILE

# Delete old backups
find ${BACKUP_DIR} -name "hashi_db_*.sql.gz" -type f -mtime +${RETAIN_DAYS} -delete

# Log backup completion
echo "Database backup completed: ${BACKUP_FILE}.gz ($(du -h ${BACKUP_FILE}.gz | cut -f1))"
```

### Scheduling Database Backups

Schedule regular backups using cron:

```bash
# Add to crontab (daily backup at 2 AM)
0 2 * * * /path/to/db-backup.sh >> /var/log/hashi-backups.log 2>&1
```

### Manual Database Backup

For one-time manual backups:

```bash
# For local PostgreSQL
pg_dump -U postgres -d hashi > hashi_db_backup.sql

# For Docker PostgreSQL
docker-compose exec db pg_dump -U postgres -d hashi > hashi_db_backup.sql
```

## File Storage Backup

### Automated File Storage Backup

Create a script to backup file storage:

```bash
#!/bin/bash
# files-backup.sh

# Configuration
BACKUP_DIR="/path/to/backups/files"
STORAGE_DIR="/path/to/hashi/storage"
SNAPSHOT_DIR="/path/to/hashi/snapshots"
RETAIN_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/hashi_files_${TIMESTAMP}.tar.gz"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Execute backup
tar -czf $BACKUP_FILE $STORAGE_DIR $SNAPSHOT_DIR

# Delete old backups
find ${BACKUP_DIR} -name "hashi_files_*.tar.gz" -type f -mtime +${RETAIN_DAYS} -delete

# Log backup completion
echo "File backup completed: ${BACKUP_FILE} ($(du -h ${BACKUP_FILE} | cut -f1))"
```

### Scheduling File Backups

Schedule regular file backups:

```bash
# Add to crontab (daily backup at 3 AM)
0 3 * * * /path/to/files-backup.sh >> /var/log/hashi-backups.log 2>&1
```

### Docker Volume Backup

For Docker deployments, back up volumes:

```bash
#!/bin/bash
# docker-volumes-backup.sh

# Configuration
BACKUP_DIR="/path/to/backups/volumes"
RETAIN_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/hashi_volumes_${TIMESTAMP}.tar.gz"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Stop containers to ensure data consistency
docker-compose stop

# Execute backup
docker run --rm \
  -v hashi_app-storage:/storage \
  -v hashi_app-snapshots:/snapshots \
  -v $(pwd)/$BACKUP_FILE:/backup.tar.gz \
  alpine \
  tar -czf /backup.tar.gz /storage /snapshots

# Restart containers
docker-compose start

# Delete old backups
find ${BACKUP_DIR} -name "hashi_volumes_*.tar.gz" -type f -mtime +${RETAIN_DAYS} -delete

# Log backup completion
echo "Volume backup completed: ${BACKUP_FILE} ($(du -h ${BACKUP_FILE} | cut -f1))"
```

## Configuration Backup

### Environment Variables Backup

Back up environment configuration:

```bash
#!/bin/bash
# config-backup.sh

# Configuration
BACKUP_DIR="/path/to/backups/config"
RETAIN_DAYS=90
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONFIG_FILE="/path/to/hashi/.env"
BACKUP_FILE="${BACKUP_DIR}/hashi_env_${TIMESTAMP}.env"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Execute backup (encrypt sensitive information)
gpg --symmetric --cipher-algo AES256 --output "${BACKUP_FILE}.gpg" $CONFIG_FILE

# Delete old backups
find ${BACKUP_DIR} -name "hashi_env_*.env.gpg" -type f -mtime +${RETAIN_DAYS} -delete

# Log backup completion
echo "Config backup completed: ${BACKUP_FILE}.gpg"
```

### Docker Compose Backup

Back up Docker Compose configuration:

```bash
# Back up Docker Compose files
cp docker-compose.yml "${BACKUP_DIR}/docker-compose_${TIMESTAMP}.yml"
```

## Comprehensive Backup Solution

For production environments, combine all backups into a single script:

```bash
#!/bin/bash
# hashi-backup.sh

# Configuration
BACKUP_ROOT="/path/to/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIRS=(
  "${BACKUP_ROOT}/database"
  "${BACKUP_ROOT}/files"
  "${BACKUP_ROOT}/config"
)
RETAIN_DAYS=30
PROJECT_PATH="/path/to/hashi"

# Create backup directories
for dir in "${BACKUP_DIRS[@]}"; do
  mkdir -p $dir
done

# Log start
echo "=== Starting Hashi backup at $(date) ==="

# 1. Database backup
echo "Backing up database..."
docker-compose -f $PROJECT_PATH/docker-compose.yml exec -T db \
  pg_dump -U postgres -d hashi > "${BACKUP_ROOT}/database/hashi_db_${TIMESTAMP}.sql"
gzip "${BACKUP_ROOT}/database/hashi_db_${TIMESTAMP}.sql"

# 2. Files backup
echo "Backing up files..."
tar -czf "${BACKUP_ROOT}/files/hashi_files_${TIMESTAMP}.tar.gz" \
  -C $PROJECT_PATH storage snapshots

# 3. Configuration backup
echo "Backing up configuration..."
cp $PROJECT_PATH/.env "${BACKUP_ROOT}/config/hashi_env_${TIMESTAMP}.env"
cp $PROJECT_PATH/docker-compose.yml "${BACKUP_ROOT}/config/docker-compose_${TIMESTAMP}.yml"

# Cleanup old backups
echo "Cleaning up old backups..."
find "${BACKUP_ROOT}" -type f -mtime +${RETAIN_DAYS} -delete

# Log completion
echo "=== Hashi backup completed at $(date) ==="
echo "Backup files:"
find "${BACKUP_ROOT}" -type f -name "*${TIMESTAMP}*" | sort
```

## Offsite Backup Storage

For added protection, replicate backups to offsite storage:

```bash
#!/bin/bash
# offsite-backup.sh

# Configuration
BACKUP_ROOT="/path/to/backups"
REMOTE_HOST="backup-server.example.com"
REMOTE_USER="backup-user"
REMOTE_PATH="/path/to/remote/backups"

# Sync backups to remote server (using rsync over SSH)
rsync -avz --delete \
  -e "ssh -i /path/to/ssh-key" \
  "${BACKUP_ROOT}/" \
  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/"

# Log completion
echo "Offsite backup completed at $(date)"
```

## Database Recovery

### Full Database Recovery

To restore a database backup:

```bash
# For local PostgreSQL
# First, drop the existing database if needed
dropdb -U postgres hashi
createdb -U postgres hashi
# Restore from backup
gunzip -c hashi_db_backup.sql.gz | psql -U postgres -d hashi

# For Docker PostgreSQL
# First, stop the application
docker-compose stop app
# Restore the database
gunzip -c hashi_db_backup.sql.gz | docker-compose exec -T db psql -U postgres -d hashi
# Restart the application
docker-compose start app
```

### Point-in-Time Recovery

If using PostgreSQL with WAL archiving, you can perform point-in-time recovery:

```bash
# Configure PostgreSQL for WAL archiving in postgresql.conf:
wal_level = replica
archive_mode = on
archive_command = 'cp %p /path/to/archive/%f'
```

## File Storage Recovery

### Restoring Files

To restore file storage:

```bash
# Extract backup to storage directory
tar -xzf hashi_files_backup.tar.gz -C /path/to/extract

# For Docker volumes
docker run --rm \
  -v hashi_app-storage:/storage \
  -v hashi_app-snapshots:/snapshots \
  -v $(pwd)/hashi_volumes_backup.tar.gz:/backup.tar.gz \
  alpine \
  sh -c "rm -rf /storage/* /snapshots/* && tar -xzf /backup.tar.gz -C /"
```

## Complete System Recovery

For a complete system recovery:

1. **Set up a new environment**:
   ```bash
   # Clone the repository
   git clone https://github.com/gomesgroup/hashi.git
   cd hashi
   ```

2. **Restore configuration**:
   ```bash
   # Copy the backed up environment file
   cp /path/to/backups/config/hashi_env_*.env .env
   # Copy the backed up docker-compose file
   cp /path/to/backups/config/docker-compose_*.yml docker-compose.yml
   ```

3. **Start the database container**:
   ```bash
   docker-compose up -d db
   ```

4. **Restore the database**:
   ```bash
   gunzip -c /path/to/backups/database/hashi_db_*.sql.gz | \
     docker-compose exec -T db psql -U postgres -d hashi
   ```

5. **Restore file storage**:
   ```bash
   # Create temporary container to restore volumes
   docker-compose up -d app
   docker-compose stop app
   
   # Restore volumes
   docker run --rm \
     -v hashi_app-storage:/storage \
     -v hashi_app-snapshots:/snapshots \
     -v /path/to/backups/files/hashi_files_*.tar.gz:/backup.tar.gz \
     alpine \
     sh -c "rm -rf /storage/* /snapshots/* && tar -xzf /backup.tar.gz -C /"
   ```

6. **Start the application**:
   ```bash
   docker-compose up -d
   ```

7. **Verify the recovery**:
   ```bash
   # Check application health
   curl http://localhost:3000/api/health
   
   # Check database connection
   docker-compose exec app node -e "const db = require('./dist/server/database'); db.testConnection().then(() => console.log('Database connection successful'));"
   ```

## Backup Verification

Regularly test your backups to ensure they can be restored:

```bash
#!/bin/bash
# verify-backup.sh

# Configuration
BACKUP_ROOT="/path/to/backups"
TEST_ENV="/path/to/test-environment"

# Get latest backups
LATEST_DB=$(ls -t ${BACKUP_ROOT}/database/hashi_db_*.sql.gz | head -1)
LATEST_FILES=$(ls -t ${BACKUP_ROOT}/files/hashi_files_*.tar.gz | head -1)
LATEST_CONFIG=$(ls -t ${BACKUP_ROOT}/config/hashi_env_*.env | head -1)

# Set up test environment
mkdir -p $TEST_ENV
cd $TEST_ENV

# Clone repository
git clone https://github.com/gomesgroup/hashi.git
cd hashi

# Restore configuration
cp $LATEST_CONFIG .env

# Start test database
docker-compose up -d db

# Restore database
gunzip -c $LATEST_DB | docker-compose exec -T db psql -U postgres -d hashi

# Start application
docker-compose up -d

# Test application health
if curl -s http://localhost:3000/api/health | grep -q "\"status\":\"ok\""; then
  echo "Backup verification successful!"
else
  echo "Backup verification failed!"
fi

# Clean up
docker-compose down -v
cd ..
rm -rf hashi
```

## Disaster Recovery Plan

Document a complete disaster recovery plan:

1. **Assessment**: Determine the extent of the failure
2. **Recovery Environment**: Set up new infrastructure if needed
3. **Configuration Restore**: Deploy application configuration
4. **Database Restore**: Restore from the latest backup
5. **File Restore**: Restore file storage
6. **Application Deployment**: Deploy and start the application
7. **Verification**: Test all functionality
8. **Documentation**: Document the recovery process and any issues encountered

## Monitoring Backup Health

Set up monitoring for backup health:

```bash
#!/bin/bash
# monitor-backups.sh

# Configuration
BACKUP_ROOT="/path/to/backups"
MAX_AGE_HOURS=25  # Alert if no backup in the last 25 hours

# Check database backups
LATEST_DB=$(find ${BACKUP_ROOT}/database -name "hashi_db_*.sql.gz" -type f -printf "%T@ %p\n" | sort -n | tail -1)
DB_AGE=$(echo $LATEST_DB | cut -d' ' -f1)
NOW=$(date +%s)
DB_AGE_HOURS=$(( ($NOW - $DB_AGE) / 3600 ))

if [ $DB_AGE_HOURS -gt $MAX_AGE_HOURS ]; then
  echo "WARNING: Database backup is $DB_AGE_HOURS hours old" >&2
  # Send alert (email, Slack, etc.)
fi

# Check file backups
# Similar checks for file backups...
```

## Conclusion

A robust backup and recovery strategy is essential for production Hashi deployments. By implementing regular backups, offsite storage, and recovery testing, you can ensure data integrity and minimize downtime in case of system failures.

Remember to:

1. **Test backups regularly** to ensure they can be restored
2. **Monitor backup health** to detect issues early
3. **Document recovery procedures** for quick response
4. **Update backup strategies** as the application evolves
5. **Train team members** on recovery procedures