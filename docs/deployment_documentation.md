# Hashi Deployment Documentation

This document provides a comprehensive guide to deploying and operating Hashi in various environments, from development to production.

## Overview

Hashi is designed to be deployed as a containerized application using Docker and Docker Compose. This approach provides consistent deployments across different environments and simplifies the setup process.

## Deployment Methods

Hashi supports three primary deployment methods:

1. **Docker Deployment** (Recommended for production)
2. **Manual Installation** (For customized deployments)
3. **Development Setup** (For contributors and developers)

## Docker Deployment

### Prerequisites

- Docker Engine 20.10+ and Docker Compose 2.0+
- UCSF ChimeraX installed on the host system
- At least 2GB RAM and 2 CPU cores

### Quick Start

1. Clone the repository
   ```bash
   git clone https://github.com/gomesgroup/hashi.git
   cd hashi
   ```

2. Configure environment
   ```bash
   cp .env.example .env
   # Edit .env to set CHIMERAX_PATH to your ChimeraX installation
   ```

3. Start containers
   ```bash
   docker-compose up -d
   ```

4. Access Hashi at `http://localhost:3000`

### Production Configuration

For production deployment, update the `.env` file with appropriate settings:

```
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_TYPE=postgres
DB_HOST=db
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<strong-password>
DB_DATABASE=hashi
DB_SYNCHRONIZE=false

# Security Configuration
JWT_SECRET=<random-string>  # Generate with: openssl rand -hex 32
CORS_ORIGIN=https://your-domain.com
```

### Deployment Profiles

The Docker Compose setup supports multiple deployment profiles:

1. **Default**: Runs the application and database
   ```bash
   docker-compose up -d
   ```

2. **Monitoring**: Includes Prometheus, Grafana, and cAdvisor
   ```bash
   docker-compose --profile monitoring up -d
   ```

3. **Logging**: Includes ELK stack (Elasticsearch, Logstash, Kibana)
   ```bash
   docker-compose --profile logging up -d
   ```

4. **Full**: Includes all services
   ```bash
   docker-compose --profile monitoring --profile logging up -d
   ```

### Container Architecture

The Docker setup includes the following containers:

1. **app**: Node.js application running Hashi
2. **db**: PostgreSQL database for persistent storage
3. **prometheus**: Metrics collection (monitoring profile)
4. **grafana**: Metrics visualization (monitoring profile)
5. **elasticsearch**: Log storage (logging profile)
6. **logstash**: Log processing (logging profile)
7. **kibana**: Log visualization (logging profile)

### Volume Management

The Docker Compose setup creates the following volumes:

1. **db-data**: PostgreSQL data
2. **app-storage**: Uploaded files and structures
3. **app-snapshots**: Rendered snapshots
4. **app-logs**: Application logs
5. **prometheus-data**: Collected metrics
6. **grafana-data**: Dashboard configurations
7. **elasticsearch-data**: Log data

## Advanced Deployment Options

### Blue-Green Deployment

Hashi supports blue-green deployment for zero-downtime updates:

```bash
# Deploy new version to inactive environment
./scripts/blue-green-deploy.sh
```

This script:
1. Detects the inactive environment (blue or green)
2. Deploys the new version to the inactive environment
3. Runs health checks to verify the deployment
4. Switches traffic to the new environment once verified

### Canary Deployment

For critical updates, you can use canary deployment to gradually shift traffic:

```bash
# Deploy canary with 10% traffic
./scripts/canary-deploy.sh 10

# Complete canary deployment after verification
./scripts/complete-canary.sh
```

### Load Balancing

For high-availability deployments, Hashi can be deployed behind a load balancer:

1. Deploy multiple Hashi instances with shared database and storage
2. Configure a load balancer (Nginx, HAProxy, or cloud-based)
3. Configure WebSocket sticky sessions for persistent connections

## Monitoring & Observability

### Metrics

Hashi exposes Prometheus metrics at the `/metrics` endpoint. Key metrics include:

1. **HTTP request metrics**: Request counts, response times, error rates
2. **ChimeraX session metrics**: Active sessions, session creation/termination rates
3. **File operation metrics**: Upload/download rates, storage usage
4. **System metrics**: CPU, memory, disk usage

### Logging

Logs are formatted as JSON with consistent fields:

1. **timestamp**: ISO 8601 timestamp
2. **level**: Log level (debug, info, warn, error)
3. **message**: Log message
4. **correlationId**: Request correlation ID
5. **context**: Additional context (module, function, etc.)
6. **meta**: Relevant metadata

### Alerting

Grafana can be configured to send alerts based on metrics:

1. **System alerts**: High CPU/memory usage, disk space, etc.
2. **Application alerts**: Error rates, slow responses, failed sessions
3. **Security alerts**: Failed authentication attempts, rate limit breaches

## Security Considerations

### Container Security

The Docker containers are hardened with several security measures:

1. **Non-root user**: Containers run as non-root user
2. **Read-only filesystem**: Where possible, filesystems are mounted read-only
3. **Dropped capabilities**: Unnecessary Linux capabilities are dropped
4. **Resource limits**: Memory and CPU limits prevent resource exhaustion

### Network Security

1. **Internal network**: Containers communicate on an internal network
2. **Minimal port exposure**: Only necessary ports are exposed
3. **HTTPS termination**: Use a reverse proxy for SSL/TLS termination

### Authentication

Production deployments should use:

1. **Strong JWT secret**: Use a long, random string for JWT_SECRET
2. **Short token lifetime**: Set reasonable JWT expiration times
3. **HTTPS only**: Secure cookies and HTTPS-only communication

## Backup & Recovery

### Database Backup

Schedule regular database backups:

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

### File Storage Backup

The uploaded files and snapshots should be backed up regularly:

```bash
# Create a backup script
cat > /opt/hashi/scripts/backup-files.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/hashi/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/hashi_files_$TIMESTAMP.tar.gz /opt/hashi/storage /opt/hashi/snapshots
find $BACKUP_DIR -name "hashi_files_*.tar.gz" -type f -mtime +7 -delete
EOF

chmod +x /opt/hashi/scripts/backup-files.sh

# Add to crontab
echo "0 3 * * * /opt/hashi/scripts/backup-files.sh" | sudo tee -a /etc/crontab
```

## Scaling Strategies

### Vertical Scaling

Increase resources for the Docker containers:

```yaml
# docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2'
```

### Horizontal Scaling

For larger deployments, consider:

1. **Docker Swarm**: For simple multi-node deployments
2. **Kubernetes**: For complex, large-scale deployments
3. **Managed services**: Consider cloud-managed Kubernetes or container services

## Troubleshooting

### Common Issues

1. **Container fails to start**: Check logs with `docker-compose logs app`
2. **Database connection issues**: Verify credentials and network connectivity
3. **ChimeraX errors**: Ensure ChimeraX is installed and accessible
4. **Permission problems**: Check file ownership and permissions

### Diagnostic Tools

```bash
# Check container status
docker-compose ps

# View application logs
docker-compose logs -f app

# Check application health
curl http://localhost:3000/api/health

# Verify ChimeraX connectivity
docker-compose exec app node scripts/check-chimerax.js
```

## Configuration Reference

See the [Configuration Options](./admin_guide/configuration.md) document for a complete reference of all configuration options.

## Further Resources

- [Installation Guide](./admin_guide/installation.md): Detailed installation instructions
- [Security Hardening](./admin_guide/security.md): Additional security measures
- [Monitoring Guide](./admin_guide/monitoring.md): Setting up and using monitoring tools
- [Backup & Recovery](./admin_guide/backup_recovery.md): Detailed backup and recovery procedures