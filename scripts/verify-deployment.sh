#!/bin/bash
set -e

# Deployment Verification Script for Hashi
# This script verifies the health of a deployment and checks key metrics

# Configuration
HEALTH_CHECK_URL="http://localhost:3000/api/health"
METRICS_URL="http://localhost:9091/metrics"
TIMEOUT=5 # seconds
MAX_CPU_THRESHOLD=80 # percent
MAX_MEMORY_THRESHOLD=80 # percent
MAX_RESPONSE_TIME=500 # milliseconds

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if required tools are installed
if ! command_exists curl; then
  echo "Error: curl is not installed"
  exit 1
fi

if ! command_exists jq; then
  echo "Error: jq is not installed"
  exit 1
fi

# Check application health
echo "Checking application health..."
HEALTH_RESPONSE=$(curl -s -m $TIMEOUT $HEALTH_CHECK_URL)
HEALTH_STATUS=$(echo $HEALTH_RESPONSE | jq -r '.status')

if [ "$HEALTH_STATUS" != "ok" ]; then
  echo "Error: Health check failed. Status: $HEALTH_STATUS"
  echo "Response: $HEALTH_RESPONSE"
  exit 1
fi

echo "Health check passed. Status: $HEALTH_STATUS"

# Check if the application is responding to basic API requests
echo "Checking API responsiveness..."
API_RESPONSE=$(curl -s -m $TIMEOUT -o /dev/null -w "%{http_code}" "http://localhost:3000/api/docs")

if [ "$API_RESPONSE" != "200" ]; then
  echo "Error: API check failed with HTTP status $API_RESPONSE"
  exit 1
fi

echo "API check passed with HTTP status $API_RESPONSE"

# Optional: Check metrics if available
if command_exists wget; then
  echo "Checking application metrics..."
  if wget -q -O - $METRICS_URL > /dev/null 2>&1; then
    METRICS=$(wget -q -O - $METRICS_URL)
    
    # Extract key metrics
    CPU_USAGE=$(echo "$METRICS" | grep "hashi_process_cpu_usage" | awk '{print $2}')
    MEMORY_USAGE=$(echo "$METRICS" | grep "hashi_process_memory_usage" | awk '{print $2}')
    AVG_RESPONSE_TIME=$(echo "$METRICS" | grep "hashi_http_response_time_average" | awk '{print $2}')
    
    # Check against thresholds
    if (( $(echo "$CPU_USAGE > $MAX_CPU_THRESHOLD" | bc -l) )); then
      echo "Warning: CPU usage is high: $CPU_USAGE%"
    else
      echo "CPU usage is normal: $CPU_USAGE%"
    fi
    
    if (( $(echo "$MEMORY_USAGE > $MAX_MEMORY_THRESHOLD" | bc -l) )); then
      echo "Warning: Memory usage is high: $MEMORY_USAGE%"
    else
      echo "Memory usage is normal: $MEMORY_USAGE%"
    fi
    
    if (( $(echo "$AVG_RESPONSE_TIME > $MAX_RESPONSE_TIME" | bc -l) )); then
      echo "Warning: Average response time is high: ${AVG_RESPONSE_TIME}ms"
    else
      echo "Average response time is acceptable: ${AVG_RESPONSE_TIME}ms"
    fi
  else
    echo "Metrics endpoint not available. Skipping metrics checks."
  fi
else
  echo "wget not installed. Skipping metrics checks."
fi

# Check database connection
echo "Checking database connection..."
DB_CHECK=$(curl -s -m $TIMEOUT "http://localhost:3000/api/health/database" | jq -r '.status')

if [ "$DB_CHECK" != "ok" ]; then
  echo "Error: Database connection check failed"
  exit 1
fi

echo "Database connection check passed"

# Check container status
echo "Checking container status..."
CONTAINER_ID=$(docker ps -qf "name=hashi-app")

if [ -z "$CONTAINER_ID" ]; then
  echo "Error: Hashi container is not running"
  exit 1
fi

CONTAINER_STATUS=$(docker inspect --format='{{.State.Status}}' $CONTAINER_ID)
if [ "$CONTAINER_STATUS" != "running" ]; then
  echo "Error: Container is not in running state. Current state: $CONTAINER_STATUS"
  exit 1
fi

echo "Container status check passed. Container is $CONTAINER_STATUS"

# All checks passed
echo "All verification checks passed! Deployment is healthy."
exit 0