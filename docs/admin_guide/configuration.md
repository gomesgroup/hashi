# Hashi Configuration Guide

This document provides a comprehensive guide to configuring Hashi for various environments and use cases.

## Overview

Hashi is highly configurable through environment variables, which can be set in the `.env` file or directly in the environment. This document explains all available configuration options and provides recommendations for different deployment scenarios.

## Configuration Files

Hashi uses the following configuration files:

1. `.env`: Primary configuration file for environment variables
2. `.env.example`: Example configuration with documented options
3. `docker-compose.yml`: Docker Compose configuration
4. `Dockerfile`: Docker build configuration

## Core Configuration Categories

Hashi's configuration is organized into the following categories:

1. **Server Configuration**: Base server settings
2. **ChimeraX Configuration**: ChimeraX process management
3. **Security Configuration**: Authentication and access control
4. **Database Configuration**: Database connection and settings
5. **Storage Configuration**: File storage settings
6. **Rendering Configuration**: Snapshot rendering settings
7. **WebSocket Configuration**: Real-time communication settings
8. **Logging Configuration**: Logging and monitoring
9. **Docker Configuration**: Container-specific settings

## Server Configuration

```env
# Server Configuration
PORT=3000                          # Port for the HTTP server
NODE_ENV=production                # Environment: development, test, production
CORS_ORIGIN=https://example.com    # CORS origins (comma-separated for multiple)
```

### Recommendations:

- **Development**: Use default settings
- **Production**: Set appropriate `PORT` and `CORS_ORIGIN` values
- **High Security**: Set specific `CORS_ORIGIN` values, never use wildcard (*) in production

## ChimeraX Configuration

```env
# ChimeraX Configuration
CHIMERAX_PATH=/opt/chimerax/bin/chimerax    # Absolute path to ChimeraX executable
CHIMERAX_BASE_PORT=6100                     # Starting port for ChimeraX instances
MAX_CHIMERAX_INSTANCES=10                   # Maximum concurrent ChimeraX processes
```

### Recommendations:

- **Development**: Use default settings with local ChimeraX
- **Production**: Adjust `MAX_CHIMERAX_INSTANCES` based on server resources
- **Resource Constrained**: Reduce `MAX_CHIMERAX_INSTANCES` to 5 or less

## Security Configuration

```env
# Security Configuration
JWT_SECRET=your-secret-key-here            # JWT signing secret
JWT_EXPIRES_IN=1h                          # JWT token expiration
JWT_REFRESH_EXPIRES_IN=7d                  # JWT refresh token expiration
JWT_ISSUER=hashi-api                       # JWT issuer
JWT_AUDIENCE=hashi-client                  # JWT audience
BCRYPT_SALT_ROUNDS=12                      # Bcrypt password hashing rounds

# Rate Limiting
RATE_LIMIT_WINDOW=15                       # Rate limit window in minutes
RATE_LIMIT_MAX=100                         # Maximum requests per window

# Password Policies
PASSWORD_MIN_LENGTH=8                      # Minimum password length
PASSWORD_MAX_LENGTH=128                    # Maximum password length
PASSWORD_REQUIRES_SPECIAL_CHAR=true        # Require special characters
PASSWORD_REQUIRES_NUMBER=true              # Require numbers
PASSWORD_REQUIRES_UPPERCASE=true           # Require uppercase letters
PASSWORD_REQUIRES_LOWERCASE=true           # Require lowercase letters
```

### Recommendations:

- **Development**: Use simpler password policies
- **Production**: Generate strong `JWT_SECRET` (use `openssl rand -hex 32`)
- **High Security**: Reduce `JWT_EXPIRES_IN` to `15m`, enable all password requirements

## Database Configuration

```env
# Database Configuration
DB_TYPE=postgres                            # Database type: postgres, sqlite
DB_HOST=localhost                           # Database host
DB_PORT=5432                                # Database port
DB_USERNAME=postgres                        # Database username
DB_PASSWORD=postgres                        # Database password
DB_DATABASE=hashi                           # Database name
DB_SYNCHRONIZE=false                        # Auto-sync database schema (not for production)
DB_LOGGING=false                            # Enable SQL query logging
DB_ENTITIES_PATH=                           # Custom entities path
DB_MIGRATIONS_PATH=                         # Custom migrations path
DB_MIGRATIONS_RUN=true                      # Auto-run migrations on startup
```

### Recommendations:

- **Development**: Use SQLite or PostgreSQL with `DB_SYNCHRONIZE=true`
- **Testing**: Use SQLite in-memory database
- **Production**: Use PostgreSQL with `DB_SYNCHRONIZE=false` and `DB_MIGRATIONS_RUN=true`

## Storage Configuration

```env
# Storage Configuration
STORAGE_BASE_PATH=./storage                 # Base path for file storage
STORAGE_MAX_SIZE_PER_USER=1024              # Max storage per user in MB (1GB)
STORAGE_ALLOWED_FILE_TYPES=pdb,xyz,mol,mol2,sdf,cif  # Allowed file types
STORAGE_MAX_VERSIONS_PER_STRUCTURE=10       # Max versions per structure
```

### Recommendations:

- **Development**: Use default settings
- **Production**: Set `STORAGE_BASE_PATH` to a dedicated volume
- **High Usage**: Increase `STORAGE_MAX_SIZE_PER_USER` and adjust based on server resources

## Rendering Configuration

```env
# Rendering Configuration
SNAPSHOT_DIR=./snapshots                    # Directory for snapshots
MAX_CONCURRENT_RENDERING_JOBS=5             # Max concurrent rendering jobs
DEFAULT_IMAGE_WIDTH=800                     # Default image width
DEFAULT_IMAGE_HEIGHT=600                    # Default image height
MAX_IMAGE_WIDTH=3840                        # Maximum image width (4K)
MAX_IMAGE_HEIGHT=2160                       # Maximum image height (4K)
```

### Recommendations:

- **Development**: Use default settings
- **Production**: Set `SNAPSHOT_DIR` to a dedicated volume
- **Resource Constrained**: Reduce `MAX_CONCURRENT_RENDERING_JOBS` to 2 or 3

## WebSocket Configuration

```env
# WebSocket Configuration
WEBSOCKET_PORT=3001                         # WebSocket server port
WEBSOCKET_PATH=/ws                          # WebSocket path
WEBSOCKET_HEARTBEAT_INTERVAL=30000          # Heartbeat interval in ms (30 seconds)
WEBSOCKET_HEARTBEAT_TIMEOUT=10000           # Heartbeat timeout in ms (10 seconds)
WEBSOCKET_MAX_CONNECTIONS=100               # Max WebSocket connections
WEBSOCKET_MESSAGE_QUEUE_SIZE=50             # Message queue size per connection
WEBSOCKET_MESSAGE_RETRY_ATTEMPTS=3          # Message retry attempts
WEBSOCKET_MESSAGE_EXPIRY_TIME=60000         # Message expiry time in ms (60 seconds)
```

### Recommendations:

- **Development**: Use default settings
- **Production**: Adjust `WEBSOCKET_MAX_CONNECTIONS` based on expected user count
- **High Usage**: Increase `WEBSOCKET_MESSAGE_QUEUE_SIZE` for busy environments

## Logging Configuration

```env
# Logging Configuration
LOG_LEVEL=info                              # Log level: debug, info, warn, error
LOG_FORMAT=json                             # Log format: json, text
LOG_CORRELATION_HEADER=x-correlation-id     # Correlation ID header name
```

### Recommendations:

- **Development**: Use `LOG_LEVEL=debug` and `LOG_FORMAT=text`
- **Production**: Use `LOG_LEVEL=info` and `LOG_FORMAT=json`
- **Troubleshooting**: Temporarily set `LOG_LEVEL=debug` for detailed logs

## Monitoring Configuration

```env
# Monitoring Configuration
ENABLE_METRICS=true                         # Enable Prometheus metrics
METRICS_PORT=9091                           # Metrics server port
METRICS_PATH=/metrics                       # Metrics endpoint path
METRICS_PREFIX=hashi_                       # Metrics name prefix
```

### Recommendations:

- **Development**: Use `ENABLE_METRICS=false` to save resources
- **Production**: Enable metrics and set up Prometheus/Grafana
- **High Traffic**: Set up dedicated metrics monitoring

## Docker Configuration

```env
# Docker Configuration
DOCKER_TARGET=production                    # Docker build target: builder, production
```

### Recommendations:

- **Development**: Use `DOCKER_TARGET=builder` for development containers
- **Production**: Use `DOCKER_TARGET=production` for optimized containers

## Environment-Specific Configurations

### Development Environment

For development environments, prioritize ease of use and debugging:

```env
NODE_ENV=development
DB_TYPE=sqlite
DB_SYNCHRONIZE=true
LOG_LEVEL=debug
LOG_FORMAT=text
ENABLE_METRICS=false
PASSWORD_MIN_LENGTH=4
PASSWORD_REQUIRES_SPECIAL_CHAR=false
PASSWORD_REQUIRES_NUMBER=false
PASSWORD_REQUIRES_UPPERCASE=false
PASSWORD_REQUIRES_LOWERCASE=false
```

### Testing Environment

For testing environments, use ephemeral resources:

```env
NODE_ENV=test
DB_TYPE=sqlite
DB_DATABASE=:memory:
DB_SYNCHRONIZE=true
LOG_LEVEL=error
STORAGE_BASE_PATH=./test-storage
SNAPSHOT_DIR=./test-snapshots
MAX_CHIMERAX_INSTANCES=2
MAX_CONCURRENT_RENDERING_JOBS=1
```

### Staging Environment

For staging environments, mirror production with reduced resources:

```env
NODE_ENV=production
DB_TYPE=postgres
DB_SYNCHRONIZE=false
DB_MIGRATIONS_RUN=true
LOG_LEVEL=info
LOG_FORMAT=json
MAX_CHIMERAX_INSTANCES=5
MAX_CONCURRENT_RENDERING_JOBS=3
```

### Production Environment

For production environments, prioritize security, stability, and performance:

```env
NODE_ENV=production
DB_TYPE=postgres
DB_SYNCHRONIZE=false
DB_MIGRATIONS_RUN=true
DB_LOGGING=false
LOG_LEVEL=info
LOG_FORMAT=json
JWT_EXPIRES_IN=15m
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

## Configuration Validation

Hashi includes a configuration validation script that checks your settings for errors or potential issues:

```bash
node scripts/validate-env.js
```

This script:
1. Validates all environment variables against defined schemas
2. Checks directory permissions and existence
3. Verifies ChimeraX path if provided
4. Provides special validation for production environments

## Docker Compose Profiles

The Docker Compose configuration supports different profiles:

1. **Default**: App and database services
   ```bash
   docker-compose up -d
   ```

2. **Monitoring**: Includes Prometheus and Grafana
   ```bash
   docker-compose --profile monitoring up -d
   ```

3. **Logging**: Includes ELK stack
   ```bash
   docker-compose --profile logging up -d
   ```

4. **All Services**: Complete environment
   ```bash
   docker-compose --profile monitoring --profile logging up -d
   ```

## Advanced Configuration

### Custom Database Configuration

For advanced database setups:

```env
# PostgreSQL with SSL
DB_TYPE=postgres
DB_SSL=true
DB_SSL_CA=/path/to/ca.pem
DB_POOL_MIN=5
DB_POOL_MAX=20
```

### Redis for Session Caching

To enable Redis for session caching:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
USE_REDIS_SESSIONS=true
```

### External Storage

For external storage providers:

```env
# External Storage
STORAGE_PROVIDER=s3  # Options: local, s3, azure
S3_BUCKET=hashi-files
S3_REGION=us-west-2
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
```

## Configuration Best Practices

1. **Never commit .env files** to version control
2. **Use environment-specific .env files** (.env.development, .env.production)
3. **Set sensitive variables through environment** rather than .env files
4. **Validate configuration** before deployment
5. **Document custom settings** for future reference
6. **Review configurations** regularly for security and optimization

## Troubleshooting Configuration Issues

### Database Connection Issues

If unable to connect to the database:
- Verify DB_HOST, DB_PORT, DB_USERNAME, and DB_PASSWORD
- Check network connectivity and firewall rules
- Ensure the database server is running

### ChimeraX Issues

If ChimeraX processes fail to start:
- Verify CHIMERAX_PATH points to the correct executable
- Ensure ChimeraX has all required dependencies installed
- Check ChimeraX logs for specific errors

### Permission Issues

For file system permission problems:
- Check ownership of storage directories
- Ensure the application has write permissions
- For Docker, verify volume mounts are configured correctly

## Complete Configuration Reference

For a complete reference of all configuration options, see the [.env.example](https://github.com/gomesgroup/hashi/blob/main/.env.example) file in the repository, which includes detailed comments for each option.