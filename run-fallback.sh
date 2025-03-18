#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Hashi - Fallback Viewer Server${NC}"
echo "========================================"

# Step 1: Kill existing processes
echo -e "Stopping existing processes..."

# Find and kill existing Node.js processes
NODE_PIDS=$(ps aux | grep "node \(standalone-interactive.js\|fallback-server.js\)" | grep -v grep | awk '{print $2}')
if [ -n "$NODE_PIDS" ]; then
    echo "Killing server processes: $NODE_PIDS"
    kill $NODE_PIDS 2>/dev/null
else
    echo "No server processes found."
fi

# Wait a moment to ensure processes are terminated
sleep 2

# Step 2: Start the fallback server
echo -e "Starting fallback server..."
mkdir -p logs
node fallback-server.js > logs/fallback-server.log 2>&1 &
SERVER_PID=$!

# Give the server time to start
sleep 2

# Step 3: Verify server is running
if ps -p $SERVER_PID > /dev/null; then
    echo -e "${GREEN}✓ Server is running with PID: $SERVER_PID${NC}"
    echo -e "  Fallback viewer available at: http://localhost:9876"
    echo -e "  Logs are being written to: logs/fallback-server.log"
else
    echo -e "${RED}✗ Server failed to start - check logs/fallback-server.log${NC}"
    exit 1
fi

# Step 4: Print links instead of opening browser
echo -e "${GREEN}Available URLs:${NC}"
echo -e "  Main server: http://localhost:9876"
echo -e "  API Health check: http://localhost:9876/api/health"
echo -e "  ChimeraX status check: http://localhost:9876/api/chimerax/status"
echo -e "  Direct file access: file://$(pwd)/fallback-viewer.html"
echo -e "${GREEN}Log Files:${NC}"
echo -e "  Server log: $(pwd)/logs/fallback-server.log"

# Keep script running with clean exit on Ctrl+C
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
trap "echo 'Stopping server...'; kill $SERVER_PID 2>/dev/null; echo 'Server stopped.'; exit" INT
wait $SERVER_PID