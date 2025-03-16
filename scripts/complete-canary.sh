#!/bin/bash
set -e

# Complete Canary Deployment Script for Hashi
# This script completes a canary deployment by promoting the canary to stable
# Requires: docker, docker-compose, jq, curl

# Load canary status
if [ -f ".canary-status" ]; then
    source .canary-status
else
    echo "No active canary deployment found."
    exit 1
fi

if [ "$CANARY_ACTIVE" != "true" ]; then
    echo "No active canary deployment found."
    exit 1
fi

# Load deployment variables
source .env.deploy
export $(cut -d= -f1 .env.deploy)

# Configuration
APP_NAME="hashi"
STABLE_PORT=3000
CANARY_PORT=3010
NGINX_CONFIG_DIR="/etc/nginx/conf.d"

echo "Completing canary deployment - promoting canary to stable"

# Check if we want to proceed with the promotion
read -p "Are you sure you want to promote the canary ($CANARY_IMAGE) to stable? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Promotion cancelled."
    exit 1
fi

# Create environment file for stable environment with the canary image
cat > .env.stable << EOF
PORT=$STABLE_PORT
NODE_ENV=production
IMAGE_TAG=$CANARY_IMAGE
EOF

# Deploy the canary image to the stable environment
echo "Updating stable environment with canary image..."
docker-compose -f docker-compose.yml -f docker-compose.stable.yml --env-file .env.stable up -d

# Wait for stable environment to be ready
echo "Waiting for stable environment to be ready..."
sleep 10

# Update NGINX configuration to route all traffic to the stable environment
echo "Updating NGINX configuration to route all traffic to stable environment..."
cat > $NGINX_CONFIG_DIR/$APP_NAME.conf << EOF
upstream $APP_NAME {
    server 127.0.0.1:$STABLE_PORT;
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

# Shutdown canary environment
echo "Shutting down canary environment..."
docker-compose -f docker-compose.yml -f docker-compose.canary.yml --env-file .env.canary down

# Remove canary status file
rm -f .canary-status

echo "Canary promotion completed successfully!"
echo "All traffic is now routed to the stable environment."
echo "The stable environment is now running the former canary image: $CANARY_IMAGE"