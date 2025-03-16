# Hashi Installation Guide

This guide provides detailed instructions for installing and configuring the Hashi ChimeraX Web Integration system in various environments.

## System Requirements

### Hardware Requirements

- **CPU**: 4+ cores recommended (minimum 2 cores)
- **RAM**: 8GB+ recommended (minimum 4GB)
- **Storage**: 20GB+ for application and data
- **Network**: 100Mbps+ internet connection

### Software Requirements

- **Operating System**: Linux (Ubuntu 20.04+, CentOS 8+), macOS 12+, or Windows Server 2019+
- **Container Platform**: Docker Engine 20.10+ and Docker Compose 2.0+
- **ChimeraX**: UCSF ChimeraX 1.4+ installed on the host system
- **Database**: PostgreSQL 13+ (recommended) or SQLite (for development/testing)
- **Reverse Proxy**: Nginx 1.18+ or Apache 2.4+ (for production)

## Installation Methods

There are three primary methods to install Hashi:

1. **Docker Deployment** (Recommended for production)
2. **Manual Installation** (For customized deployments)
3. **Development Setup** (For contributors and developers)

This guide focuses on the Docker deployment method.

## Docker Deployment

### Prerequisites

1. Install Docker and Docker Compose:
   ```bash
   # For Ubuntu/Debian
   sudo apt update
   sudo apt install docker.io docker-compose-plugin
   sudo systemctl enable docker
   sudo systemctl start docker
   
   # For CentOS/RHEL
   sudo yum install docker-ce docker-ce-cli containerd.io docker-compose-plugin
   sudo systemctl enable docker
   sudo systemctl start docker
   ```

2. Ensure ChimeraX is installed:
   ```bash
   # Example for Linux
   # Download from https://www.cgl.ucsf.edu/chimerax/download.html
   chmod +x chimerax-*.bin
   ./chimerax-*.bin
   ```

3. Create a directory for Hashi:
   ```bash
   sudo mkdir -p /opt/hashi
   sudo chown $USER:$USER /opt/hashi
   cd /opt/hashi
   ```

### Configuration

1. Clone the Hashi repository or download the release files:
   ```bash
   git clone https://github.com/gomesgroup/hashi.git .
   # OR download and extract the latest release
   ```

2. Create environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file to configure your deployment:
   ```bash
   nano .env
   ```

   Key settings to configure:
   - `NODE_ENV=production`
   - `CHIMERAX_PATH=/path/to/chimerax` (absolute path to ChimeraX executable)
   - `DB_TYPE=postgres` (recommended for production)
   - `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD` etc. for database connection
   - `JWT_SECRET` (set to a secure random string)

4. Validate your configuration:
   ```bash
   npm install
   node scripts/validate-env.js
   ```

### Deployment

1. Start the containers:
   ```bash
   docker-compose up -d
   ```

2. Verify the deployment:
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

3. Create initial admin user:
   ```bash
   docker-compose exec app node scripts/create-admin.js
   ```

4. Access the application at `http://localhost:3000` or your configured domain.

### Updating

To update Hashi to a new version:

1. Pull the latest changes or download the new release:
   ```bash
   git pull
   # OR download and extract the new release
   ```

2. Rebuild and restart the containers:
   ```bash
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

3. Run any pending database migrations:
   ```bash
   docker-compose exec app npm run migrate
   ```

## Production Deployment Considerations

For a production deployment, consider the following additional steps:

### Setting Up HTTPS

It's strongly recommended to use HTTPS in production:

1. Configure a reverse proxy (Nginx or Apache) in front of Hashi
2. Use Let's Encrypt for free SSL certificates
3. Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name hashi.example.com;
    
    # Redirect to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name hashi.example.com;
    
    ssl_certificate /etc/letsencrypt/live/hashi.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hashi.example.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Content-Security-Policy "default-src 'self'; connect-src 'self' ws: wss:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';" always;
    
    # Proxy to Hashi
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket proxy
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Database Backups

Set up regular database backups:

```bash
# Create a backup script
cat > /opt/hashi/scripts/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/hashi/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
docker-compose exec -T db pg_dump -U postgres hashi > $BACKUP_DIR/hashi_$TIMESTAMP.sql
find $BACKUP_DIR -name "hashi_*.sql" -type f -mtime +7 -delete
EOF

chmod +x /opt/hashi/scripts/backup-db.sh

# Add to crontab
echo "0 2 * * * /opt/hashi/scripts/backup-db.sh" | sudo tee -a /etc/crontab
```

### Monitoring Setup

1. Enable the monitoring services:
   ```bash
   docker-compose --profile monitoring up -d
   ```

2. Access the monitoring dashboards:
   - Prometheus: http://your-server:9090
   - Grafana: http://your-server:3002 (login with admin/admin, then change password)

3. Configure alerting in Grafana to receive notifications for critical issues.

## Scaling Hashi

For larger deployments, consider these scaling strategies:

1. **Vertical Scaling**: Increase CPU and memory allocation in `docker-compose.yml`
2. **Horizontal Scaling**: Use Docker Swarm or Kubernetes for multi-node deployments
3. **Database Optimization**: Move to a dedicated database server
4. **Caching**: Implement Redis for session and data caching

## Troubleshooting

### Common Issues

1. **Container fails to start**: Check logs with `docker-compose logs app`
2. **Database connection issues**: Verify credentials and network connectivity
3. **ChimeraX errors**: Ensure ChimeraX is installed and accessible
4. **Permission problems**: Check file ownership and permissions

### Diagnostic Commands

```bash
# Check container status
docker-compose ps

# View application logs
docker-compose logs -f app

# Check database connectivity
docker-compose exec app node scripts/check-db.js

# Verify ChimeraX connectivity
docker-compose exec app node scripts/check-chimerax.js
```

### Getting Help

If you encounter issues not covered here:
1. Check the [Troubleshooting Guide](troubleshooting.md) for more detailed solutions
2. Review the [Hashi GitHub repository](https://github.com/gomesgroup/hashi) for known issues
3. Contact the Hashi development team through GitHub issues

## Next Steps

After successful installation:
- [Configure Authentication](authentication.md)
- [Set Up Storage Systems](storage.md)
- [Configure Logging and Monitoring](monitoring.md)
- [Performance Tuning](performance_tuning.md)

---

*This documentation was last updated on [Current Date]. For the latest installation instructions, refer to the [Hashi GitHub repository](https://github.com/gomesgroup/hashi).*