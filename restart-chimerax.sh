#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Hashi - ChimeraX Restart Script${NC}"
echo "========================================"

# Step 1: Kill existing processes
echo -e "${YELLOW}Step 1: Stopping existing processes...${NC}"

# Find and kill existing Node.js processes for the standalone server
NODE_PIDS=$(ps aux | grep "node standalone-interactive.js" | grep -v grep | awk '{print $2}')
if [ -n "$NODE_PIDS" ]; then
    echo "Killing ChimeraX server processes: $NODE_PIDS"
    kill $NODE_PIDS 2>/dev/null
else
    echo "No ChimeraX server processes found."
fi

# Wait a moment to ensure processes are terminated
sleep 2

# Step 2: Set up environment for macOS
echo -e "${YELLOW}Step 2: Setting up macOS environment variables...${NC}"

# Find OSMesa libraries
if command -v brew &> /dev/null; then
    OSMESA_PATH="$(brew --prefix)/lib"
    OSMESA_LIB="${OSMESA_PATH}/libOSMesa.dylib"
    
    if [ -f "$OSMESA_LIB" ]; then
        echo -e "${GREEN}✓ Found OSMesa at: $OSMESA_LIB${NC}"
    else
        echo -e "${RED}⚠ OSMesa not found. Install with: brew install mesa${NC}"
    fi
else
    echo -e "${RED}⚠ Homebrew not found. OSMesa may not be available.${NC}"
fi

# Setting up environment variables
export OSMESA_LIBRARY="$OSMESA_LIB"
export DYLD_LIBRARY_PATH="$OSMESA_PATH:$DYLD_LIBRARY_PATH"
export PYOPENGL_PLATFORM="osmesa"
export DISPLAY=":0"
export LIBGL_ALWAYS_SOFTWARE="1" 
export MESA_GL_VERSION_OVERRIDE="3.3"
export LIBGL_ALWAYS_INDIRECT="0"

echo "Environment variables set:"
echo "OSMESA_LIBRARY=$OSMESA_LIBRARY"
echo "DYLD_LIBRARY_PATH=$DYLD_LIBRARY_PATH"
echo "PYOPENGL_PLATFORM=$PYOPENGL_PLATFORM"
echo "DISPLAY=$DISPLAY"
echo "LIBGL_ALWAYS_SOFTWARE=$LIBGL_ALWAYS_SOFTWARE"
echo "MESA_GL_VERSION_OVERRIDE=$MESA_GL_VERSION_OVERRIDE"
echo "LIBGL_ALWAYS_INDIRECT=$LIBGL_ALWAYS_INDIRECT"

# Step 3: Start ChimeraX standalone server
echo -e "${YELLOW}Step 3: Starting ChimeraX standalone server...${NC}"

# Create log directory if it doesn't exist
mkdir -p logs

# Start the server in the background and capture logs
node standalone-interactive.js > logs/chimerax-server.log 2>&1 &
CHIMERA_PID=$!

echo -e "${GREEN}✓ ChimeraX server started with PID: $CHIMERA_PID${NC}"
echo "Logs are being written to logs/chimerax-server.log"

# Wait for the server to start
echo "Waiting for ChimeraX server to initialize..."
sleep 3

# Step 4: Open the page in the browser
echo -e "${YELLOW}Step 4: Opening ChimeraX interactive page...${NC}"
open http://localhost:9876

echo -e "${GREEN}Done! ChimeraX server should now be running.${NC}"
echo "--------------------------------------"
echo "To test the embedded version, go to: http://localhost:3001/chimerax"
echo "To stop the server, press Ctrl+C or run: kill $CHIMERA_PID"
echo "To view logs: tail -f logs/chimerax-server.log"

# Keep script running to make it easy to stop with Ctrl+C
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
trap "echo 'Stopping ChimeraX server...'; kill $CHIMERA_PID; exit" INT
wait $CHIMERA_PID