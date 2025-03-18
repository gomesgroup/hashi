#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== Hashi - ChimeraX Debug Script =====${NC}"

# Create logs directory
mkdir -p logs

# Step 1: Verify ChimeraX installation
CHIMERAX_PATH="/Applications/ChimeraX.app/Contents/MacOS/ChimeraX"
echo -e "${BLUE}[1] Checking ChimeraX installation...${NC}"
if [ -f "$CHIMERAX_PATH" ]; then
    echo -e "  ${GREEN}✓ ChimeraX found at: $CHIMERAX_PATH${NC}"
    CHIMERAX_VERSION=$("$CHIMERAX_PATH" --version 2>/dev/null || echo "Unknown")
    echo -e "  ${GREEN}✓ ChimeraX version: $CHIMERAX_VERSION${NC}"
else
    echo -e "  ${RED}✗ ChimeraX not found at expected path: $CHIMERAX_PATH${NC}"
    echo -e "  ${RED}  Please install ChimeraX or update the path in this script.${NC}"
    exit 1
fi

# Step 2: Verify OSMesa installation
echo -e "${BLUE}[2] Checking OSMesa installation...${NC}"
if command -v brew &> /dev/null; then
    OSMESA_PATH="$(brew --prefix)/lib"
    OSMESA_LIB="${OSMESA_PATH}/libOSMesa.dylib"
    
    if [ -f "$OSMESA_LIB" ]; then
        echo -e "  ${GREEN}✓ OSMesa found at: $OSMESA_LIB${NC}"
    else
        echo -e "  ${YELLOW}! OSMesa not found at expected path: $OSMESA_LIB${NC}"
        echo -e "  ${YELLOW}  You can install it with: brew install mesa${NC}"
    fi
else
    echo -e "  ${YELLOW}! Homebrew not found, cannot check for OSMesa${NC}"
fi

# Step 3: Check network ports
echo -e "${BLUE}[3] Checking if required ports are available...${NC}"
PORT_9876=$(lsof -i:9876 | grep LISTEN)
PORT_9877=$(lsof -i:9877 | grep LISTEN)

if [ -n "$PORT_9876" ]; then
    echo -e "  ${YELLOW}! Port 9876 is already in use:${NC}"
    echo -e "    $PORT_9876"
else
    echo -e "  ${GREEN}✓ Port 9876 is available${NC}"
fi

if [ -n "$PORT_9877" ]; then
    echo -e "  ${YELLOW}! Port 9877 is already in use:${NC}"
    echo -e "    $PORT_9877"
else
    echo -e "  ${GREEN}✓ Port 9877 is available${NC}"
fi

# Step 4: Stop existing processes
echo -e "${BLUE}[4] Stopping any existing ChimeraX server processes...${NC}"
NODE_PIDS=$(ps aux | grep "node standalone-interactive.js" | grep -v grep | awk '{print $2}')
if [ -n "$NODE_PIDS" ]; then
    echo -e "  ${YELLOW}! Found running server processes: $NODE_PIDS${NC}"
    for pid in $NODE_PIDS; do
        kill $pid 2>/dev/null
        echo -e "  ${GREEN}✓ Stopped process $pid${NC}"
    done
else
    echo -e "  ${GREEN}✓ No running server processes found${NC}"
fi

# Give processes time to terminate
sleep 2

# Step 5: Setup macOS environment variables
echo -e "${BLUE}[5] Setting up macOS environment variables...${NC}"
# Create a file to document the environment
cat > logs/environment-variables.log << EOL
OSMESA_LIBRARY=${OSMESA_LIB}
DYLD_LIBRARY_PATH=${OSMESA_PATH}:${DYLD_LIBRARY_PATH}
PYOPENGL_PLATFORM=osmesa
DISPLAY=:0
LIBGL_ALWAYS_SOFTWARE=1
MESA_GL_VERSION_OVERRIDE=3.3
LIBGL_ALWAYS_INDIRECT=0
EOL

echo -e "  ${GREEN}✓ Environment variables set (see logs/environment-variables.log)${NC}"

# Export the variables
export OSMESA_LIBRARY="$OSMESA_LIB"
export DYLD_LIBRARY_PATH="$OSMESA_PATH:$DYLD_LIBRARY_PATH"
export PYOPENGL_PLATFORM="osmesa"
export DISPLAY=":0"
export LIBGL_ALWAYS_SOFTWARE="1" 
export MESA_GL_VERSION_OVERRIDE="3.3"
export LIBGL_ALWAYS_INDIRECT="0"

# Step 6: Validate files
echo -e "${BLUE}[6] Validating required files...${NC}"
STANDALONE_JS="standalone-interactive.js"
TEST_HTML="test-interactive.html"
MINIMAL_HTML="minimal-chimerax.html"

if [ -f "$STANDALONE_JS" ]; then
    echo -e "  ${GREEN}✓ Found server script: $STANDALONE_JS${NC}"
else
    echo -e "  ${RED}✗ Missing server script: $STANDALONE_JS${NC}"
    exit 1
fi

if [ -f "$TEST_HTML" ]; then
    echo -e "  ${GREEN}✓ Found test HTML: $TEST_HTML${NC}"
else
    echo -e "  ${RED}✗ Missing test HTML: $TEST_HTML${NC}"
    exit 1
fi

if [ -f "$MINIMAL_HTML" ]; then
    echo -e "  ${GREEN}✓ Found minimal test HTML: $MINIMAL_HTML${NC}"
else
    echo -e "  ${YELLOW}! Missing minimal test HTML: $MINIMAL_HTML${NC}"
fi

# Step 7: Create snapshots directory if needed
echo -e "${BLUE}[7] Ensuring directories exist...${NC}"
if [ ! -d "snapshots" ]; then
    mkdir -p snapshots
    echo -e "  ${GREEN}✓ Created snapshots directory${NC}"
else
    echo -e "  ${GREEN}✓ Snapshots directory exists${NC}"
fi

if [ ! -d "public" ]; then
    mkdir -p public
    echo -e "  ${GREEN}✓ Created public directory${NC}"
else
    echo -e "  ${GREEN}✓ Public directory exists${NC}"
fi

# Step 8: Start the server
echo -e "${BLUE}[8] Starting ChimeraX standalone server...${NC}"
echo -e "  Server will be available at: http://localhost:9876"
echo -e "  Logs will be written to: logs/chimerax-server.log"
node standalone-interactive.js > logs/chimerax-server.log 2>&1 &
SERVER_PID=$!

# Give the server time to start
sleep 3

# Step 9: Verify server is running
echo -e "${BLUE}[9] Verifying server is running...${NC}"
if ps -p $SERVER_PID > /dev/null; then
    echo -e "  ${GREEN}✓ Server is running with PID: $SERVER_PID${NC}"
else
    echo -e "  ${RED}✗ Server failed to start - check logs/chimerax-server.log${NC}"
    tail -n 20 logs/chimerax-server.log
    exit 1
fi

# Step 10: Print test page links instead of opening browser
echo -e "${BLUE}[10] Test page URLs:${NC}"
echo -e "  Main test page: http://localhost:9876"
echo -e "  Minimal test page: file://$(pwd)/minimal-chimerax.html"
echo -e "  Debug test page: file://$(pwd)/debug-test.html"
echo -e "  Empty test page: file://$(pwd)/empty-test.html"

# Step 11: Set up log monitoring
echo -e "${BLUE}[11] Setting up log monitoring...${NC}"
echo -e "  ${GREEN}✓ Server logs are being captured in logs/chimerax-server.log${NC}"
echo -e "  ${YELLOW}! To monitor logs in real-time: tail -f logs/chimerax-server.log${NC}"

# Summary
echo -e "${YELLOW}===== Debug Environment Ready =====${NC}"
echo -e "Server PID: $SERVER_PID"
echo -e "${GREEN}Available URLs:${NC}"
echo -e "  Server URL: http://localhost:9876"
echo -e "  API Health check: http://localhost:9876/api/health"
echo -e "  Minimal test: file://$(pwd)/minimal-chimerax.html"
echo -e "  Debug test: file://$(pwd)/debug-test.html"
echo -e "  Empty test: file://$(pwd)/empty-test.html"
echo -e "  Fallback viewer: file://$(pwd)/fallback-viewer.html"
echo -e "${GREEN}Log Files:${NC}"
echo -e "  Server log: $(pwd)/logs/chimerax-server.log"
echo -e "  Environment variables: $(pwd)/logs/environment-variables.log"
echo
echo -e "${RED}Press Ctrl+C to stop the server and exit${NC}"

# Keep script running for easy cleanup
trap "echo -e '${YELLOW}Stopping ChimeraX server...${NC}'; kill $SERVER_PID 2>/dev/null; wait $SERVER_PID 2>/dev/null; echo -e '${GREEN}Server stopped.${NC}'; exit" INT
wait $SERVER_PID