#!/bin/bash
set -e

# Blue-Green Deployment Script for Hashi
# This script implements a blue-green deployment pattern to minimize downtime
# Requires: docker, docker-compose, jq, curl

# Load deployment variables
source .env.deploy
export $(cut -d= -f1 .env.deploy)

# Configuration
APP_NAME="hashi"
BLUE_PORT=3000
GREEN_PORT=3010
NGINX_CONFIG_DIR="/etc/nginx/conf.d"
HEALTH_CHECK_PATH="/api/health"
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=5

# Determine current active environment (blue or green)
if [ -f ".env.active" ]; then
    source .env.active
    CURRENT_ENV=$ACTIVE_ENV
    echo "Current active environment: $CURRENT_ENV"
else
    # Default to blue if no active environment file exists
    CURRENT_ENV="blue"
    echo "No active environment found, defaulting to: $CURRENT_ENV"
fi

# Determine target environment
if [ "$CURRENT_ENV" == "blue" ]; then
    TARGET_ENV="green"
    TARGET_PORT=$GREEN_PORT
else
    TARGET_ENV="blue"
    TARGET_PORT=$BLUE_PORT
fi

echo "Deploying to $TARGET_ENV environment on port $TARGET_PORT"

# Create environment file for target environment
cat > .env.$TARGET_ENV << EOF
PORT=$TARGET_PORT
NODE_ENV=staging
IMAGE_TAG=$IMAGE_TAG
TARGET_ENV=$TARGET_ENV
EOF

# Deploy the new version to the target environment
echo "Starting $TARGET_ENV environment..."
docker-compose -f docker-compose.yml -f docker-compose.$TARGET_ENV.yml --env-file .env.$TARGET_ENV up -d

# Health check for the new deployment
echo "Performing health check on $TARGET_ENV environment..."
for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
    echo "Health check attempt $i of $HEALTH_CHECK_RETRIES..."
    
    if curl -s "http://localhost:$TARGET_PORT$HEALTH_CHECK_PATH" | grep -q "\"status\":\"ok\""; then
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
    docker-compose -f docker-compose.yml -f docker-compose.$TARGET_ENV.yml --env-file .env.$TARGET_ENV down
    exit 1
fi

# Update NGINX configuration to route traffic to the new environment
echo "Updating NGINX configuration to point to $TARGET_ENV environment..."
cat > $NGINX_CONFIG_DIR/$APP_NAME.conf << EOF
upstream $APP_NAME {
    server 127.0.0.1:$TARGET_PORT;
}

server {
    listen 80;
    server_name ${APP_NAME}.example.com;

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

# Update active environment file
echo "ACTIVE_ENV=$TARGET_ENV" > .env.active

echo "Successfully switched to $TARGET_ENV environment"

# Optional: Once the new environment is confirmed working, shut down the old environment
# Uncomment the following lines if you want to automatically shut down the old environment
# echo "Shutting down old $CURRENT_ENV environment..."
# docker-compose -f docker-compose.yml -f docker-compose.$CURRENT_ENV.yml --env-file .env.$CURRENT_ENV down

echo "Blue-green deployment completed successfully!"