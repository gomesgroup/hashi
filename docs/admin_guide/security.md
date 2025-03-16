# Hashi Security Hardening Guide

This guide provides comprehensive security recommendations for hardening your Hashi deployment in production environments.

## Overview

Securing Hashi involves multiple layers of security, including:

1. **Application Security**: Securing the Hashi application itself
2. **Container Security**: Hardening the Docker containers
3. **Network Security**: Securing network communications
4. **Authentication**: Protecting user accounts and access
5. **Data Security**: Securing stored data and files
6. **Operational Security**: Secure operational practices

## Application Security

### HTTP Security Headers

Ensure the following HTTP security headers are configured (typically in a reverse proxy or in the application):

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; connect-src 'self' ws: wss:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

You can set these headers in Nginx:

```nginx
# Example Nginx configuration
server {
    # Other configuration...
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Content-Security-Policy "default-src 'self'; connect-src 'self' ws: wss:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
}
```

### Rate Limiting

Configure rate limiting to prevent abuse:

```
# In .env
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

For more aggressive rate limiting, configure in Nginx:

```nginx
# Example Nginx rate limiting
http {
    # Define limit zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    server {
        # Apply rate limiting to API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            # Other configuration...
        }
    }
}
```

### Input Validation

Ensure all API endpoints have proper input validation. This is already implemented in Hashi using Joi, but you should review validation rules regularly.

### Dependency Security

Regularly scan and update dependencies:

```bash
# Install npm-audit-resolver
npm install -g npm-audit-resolver

# Audit dependencies
npm audit

# Resolve vulnerabilities
npm-audit-resolver

# Update dependencies
npm update
```

## Container Security

### Non-Root User

Ensure containers run as a non-root user. This is configured in the Dockerfile:

```dockerfile
# Create non-root user
RUN groupadd -r hashi && useradd -r -g hashi hashi

# Set directory permissions
RUN mkdir -p /app/logs /app/snapshots /app/storage \
    && chown -R hashi:hashi /app

# Switch to non-root user
USER hashi
```

### Container Capabilities

Drop unnecessary capabilities:

```yaml
# In docker-compose.yml
services:
  app:
    # Other configuration...
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE  # Only if binding to ports < 1024
```

### Read-Only Filesystem

Mount filesystems as read-only where possible:

```yaml
# In docker-compose.yml
services:
  app:
    # Other configuration...
    read_only: true
    tmpfs:
      - /tmp
    volumes:
      - app-storage:/app/storage
      - app-snapshots:/app/snapshots
      - app-logs:/app/logs
```

### Resource Limits

Set resource limits to prevent resource exhaustion:

```yaml
# In docker-compose.yml
services:
  app:
    # Other configuration...
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.5'
```

### Security Scanning

Regularly scan container images for vulnerabilities:

```bash
# Using Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
    aquasec/trivy image hashi-app:latest
```

## Network Security

### HTTPS Configuration

Always use HTTPS in production. Configure your reverse proxy (Nginx, Apache) with strong SSL/TLS settings:

```nginx
# Example Nginx SSL configuration
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    
    # Strong SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_ecdh_curve secp384r1;
    ssl_session_timeout 10m;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Add HSTS header
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Other configuration...
}
```

### Network Isolation

Ensure proper network isolation between containers:

```yaml
# In docker-compose.yml
networks:
  frontend:
    name: hashi-frontend
  backend:
    name: hashi-backend
    internal: true  # Not accessible from outside

services:
  app:
    # Other configuration...
    networks:
      - frontend
      - backend
      
  db:
    # Other configuration...
    networks:
      - backend
```

### WebSocket Security

Secure WebSocket connections:

1. Ensure WebSocket connections use wss:// (WebSocket Secure)
2. Implement authentication for WebSocket connections
3. Set appropriate timeouts for WebSocket connections

## Authentication Security

### JWT Configuration

Configure JWT securely:

```
# In .env
JWT_SECRET=<strong-random-value>  # Generate with: openssl rand -hex 32
JWT_EXPIRES_IN=15m  # Short expiration for access tokens
JWT_REFRESH_EXPIRES_IN=7d  # Longer expiration for refresh tokens
```

### Password Policy

Enforce strong password policies:

```
# In .env
PASSWORD_MIN_LENGTH=12
PASSWORD_REQUIRES_SPECIAL_CHAR=true
PASSWORD_REQUIRES_NUMBER=true
PASSWORD_REQUIRES_UPPERCASE=true
PASSWORD_REQUIRES_LOWERCASE=true
```

### Multi-Factor Authentication

Consider implementing multi-factor authentication for administrative accounts.

## Data Security

### Database Security

1. **Use strong passwords** for database users
2. **Limit database user permissions** to only what's needed
3. **Enable SSL** for database connections
4. **Regularly backup** the database
5. **Encrypt sensitive data** in the database

```
# In .env
DB_SSL=true
```

### File Storage Security

1. **Validate file uploads** (already implemented)
2. **Scan uploaded files** for malware (consider integrating ClamAV)
3. **Store files outside the web root**
4. **Set proper file permissions**

### Secret Management

For production environments, consider using a dedicated secrets management solution:

1. **HashiCorp Vault**: Enterprise-grade secrets management
2. **AWS Secrets Manager**: For AWS deployments
3. **Azure Key Vault**: For Azure deployments
4. **Google Secret Manager**: For Google Cloud deployments

## Operational Security

### Logging and Monitoring

1. **Enable detailed logging** for security events
2. **Set up alerts** for suspicious activities:
   - Failed login attempts
   - Unusual API usage patterns
   - Access to sensitive endpoints
   - Rate limit breaches

```
# In .env
LOG_LEVEL=info
LOG_FORMAT=json
```

### Regular Updates

1. **Keep Hashi updated** with the latest version
2. **Update dependencies** regularly
3. **Patch the host system** with security updates
4. **Update Docker** and related components

### Backup and Recovery

1. **Regularly backup** database and file storage
2. **Test backups** to ensure they can be restored
3. **Store backups securely**, preferably encrypted
4. **Document recovery procedures**

## Security Checklist

Use this checklist to verify your security configuration:

- [ ] HTTPS is properly configured with strong ciphers
- [ ] HTTP security headers are set
- [ ] Rate limiting is enabled
- [ ] Containers run as non-root user
- [ ] Container resources are limited
- [ ] JWT is configured with strong secret
- [ ] Password policies are enforced
- [ ] Database connections are secure
- [ ] File uploads are validated
- [ ] File storage is properly secured
- [ ] Logging and monitoring are configured
- [ ] Regular backups are scheduled
- [ ] Updates are applied regularly

## Advanced Security Measures

### Web Application Firewall (WAF)

Consider adding a WAF like ModSecurity or a cloud-based WAF solution:

```nginx
# Example ModSecurity with Nginx
load_module modules/ngx_http_modsecurity_module.so;

server {
    # Other configuration...
    
    modsecurity on;
    modsecurity_rules_file /etc/nginx/modsecurity/main.conf;
}
```

### Intrusion Detection/Prevention

Consider implementing an IDS/IPS solution like Wazuh, Snort, or Suricata.

### File Integrity Monitoring

Monitor for unexpected changes to critical files:

```bash
# Using AIDE (Advanced Intrusion Detection Environment)
apt-get install aide
aide --init
mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
```

## Incident Response Plan

Develop an incident response plan that includes:

1. **Identifying security incidents**
2. **Containing the incident**
3. **Eradicating the threat**
4. **Recovering systems**
5. **Learning from the incident**

Document contact information, procedures, and responsibilities for handling security incidents.

## Conclusion

By implementing these security measures, you can significantly reduce the risk of security incidents in your Hashi deployment. Remember that security is an ongoing process that requires regular attention, updates, and improvements.

For assistance with security issues, please contact the Hashi security team or file a security issue via the GitHub repository.