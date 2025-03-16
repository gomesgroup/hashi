#!/bin/bash
set -e

# Canary Deployment Script for Hashi
# This script implements a canary deployment pattern for gradual traffic shifting
# Requires: docker, docker-compose, jq, curl, nginx with sticky sessions

# First argument is the percentage of traffic to route to the new version (default: 10%)
CANARY_PERCENTAGE=${1:-10}

# Load deployment variables
source .env.deploy
export $(cut -d= -f1 .env.deploy)

# Configuration
APP_NAME="hashi"
STABLE_PORT=3000
CANARY_PORT=3010
NGINX_CONFIG_DIR="/etc/nginx/conf.d"
HEALTH_CHECK_PATH="/api/health"
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=5

echo "Starting canary deployment with $CANARY_PERCENTAGE% traffic routing"

# Create environment file for canary environment
cat > .env.canary << EOF
PORT=$CANARY_PORT
NODE_ENV=production
IMAGE_TAG=$IMAGE_TAG
EOF

# Deploy the new version as canary
echo "Starting canary environment..."
docker-compose -f docker-compose.yml -f docker-compose.canary.yml --env-file .env.canary up -d

# Health check for the canary deployment
echo "Performing health check on canary environment..."
for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
    echo "Health check attempt $i of $HEALTH_CHECK_RETRIES..."
    
    if curl -s "http://localhost:$CANARY_PORT$HEALTH_CHECK_PATH" | grep -q "\"status\":\"ok\""; then
        echo "Health check passed!"
        HEALTH_CHECK_PASSED=true
        break
    else
        echo "Health check failed, retrying in $HEALTH_CHECK_INTERVAL seconds..."
        sleep $HEALTH_CHECK_INTERVAL
    fi
done

# If health check failed, rollback and exit
if [ "$HEALTH_CHECK_PASSED" != "true" ]; then
    echo "Health check failed after $HEALTH_CHECK_RETRIES attempts. Rolling back..."
    docker-compose -f docker-compose.yml -f docker-compose.canary.yml --env-file .env.canary down
    exit 1
fi

# Update NGINX configuration to route some traffic to the canary environment
echo "Updating NGINX configuration to route $CANARY_PERCENTAGE% traffic to canary environment..."
cat > $NGINX_CONFIG_DIR/$APP_NAME.conf << EOF
# Set up upstream servers with weights
upstream $APP_NAME {
    server 127.0.0.1:$STABLE_PORT weight=$(( 100 - $CANARY_PERCENTAGE ));
    server 127.0.0.1:$CANARY_PORT weight=$CANARY_PERCENTAGE;
    
    # Optional: Sticky session configuration
    # ip_hash; # Uncomment for sticky sessions based on client IP
}

# Record canary status for monitoring
map \$upstream_addr \$upstream_name {
    "127.0.0.1:$STABLE_PORT" "stable";
    "127.0.0.1:$CANARY_PORT" "canary";
    default "unknown";
}

server {
    listen 80;
    server_name ${APP_NAME}.example.com;

    # Add headers for tracking canary vs stable
    add_header X-Upstream-Name \$upstream_name;
    
    # Log detailed information about requests
    log_format canary '\$remote_addr [\$time_local] "\$request" \$status '
                      '\$body_bytes_sent "\$http_referer" "\$http_user_agent" '
                      '\$request_time \$upstream_name';
    
    access_log /var/log/nginx/$APP_NAME-access.log canary;

    location / {
        proxy_pass http://$APP_NAME;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Reload NGINX
echo "Reloading NGINX configuration..."
nginx -t && systemctl reload nginx

# Write canary status file
cat > .canary-status << EOF
CANARY_ACTIVE=true
CANARY_PERCENTAGE=$CANARY_PERCENTAGE
CANARY_IMAGE=$IMAGE_TAG
CANARY_DEPLOYED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

echo "Canary deployment completed successfully!"
echo "Canary instance is now receiving approximately $CANARY_PERCENTAGE% of traffic."
echo "Monitor the application metrics and logs to ensure the canary is performing as expected."
echo "When ready to complete the deployment, run the complete-canary.sh script."