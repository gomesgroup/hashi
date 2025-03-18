#!/bin/bash

# Script to properly restart and test the Hashi ChimeraX interactive server
# This script stops any running processes, rebuilds, and launches both server and test page

# Stop any running processes
echo "Stopping any running servers..."
pkill -f "node standalone-interactive.js" || true
pkill -f "node.*vite" || true
pkill -f "npm run dev" || true

# Wait for processes to fully terminate
sleep 1

# Ensure snapshots directory exists
mkdir -p snapshots

# Clean up old snapshots
echo "Cleaning up old snapshots..."
find snapshots -name "*.png" -type f -mtime +1 -delete

# Port check
echo "Checking if ports are available..."
if lsof -i :9876 >/dev/null; then
    echo "Warning: Port 9876 is still in use. Trying to kill the process..."
    lsof -i :9876 -t | xargs kill -9 || true
fi

if lsof -i :3001 >/dev/null; then
    echo "Warning: Port 3001 is still in use. Trying to kill the process..."
    lsof -i :3001 -t | xargs kill -9 || true
fi

# Set up environment variables for macOS ChimeraX compatibility
echo "Setting up macOS environment variables for ChimeraX OpenGL compatibility..."
export OSMESA_LIBRARY="/opt/homebrew/lib/libOSMesa.dylib"
export DYLD_LIBRARY_PATH="/opt/homebrew/lib:$DYLD_LIBRARY_PATH"
export PYOPENGL_PLATFORM="osmesa"
export DISPLAY=":0"
export LIBGL_ALWAYS_SOFTWARE="1" 
export MESA_GL_VERSION_OVERRIDE="3.3"
export LIBGL_ALWAYS_INDIRECT="0"

# Start the interactive server in the background
echo "Starting ChimeraX interactive server..."
node standalone-interactive.js > chimerax-server.log 2>&1 &
CHIMERAX_SERVER_PID=$!

# Quick check to make sure server started properly
sleep 2
if ! ps -p $CHIMERAX_SERVER_PID > /dev/null; then
    echo "Error: ChimeraX server failed to start. Check chimerax-server.log for details."
    exit 1
fi

# Start the dev client server
echo "Starting development server for the React client..."
(cd "$(dirname "$0")" && npm run dev:client > client-server.log 2>&1 &)
DEV_SERVER_PID=$!

# Wait for the dev server to start
sleep 3
if ! ps -p $DEV_SERVER_PID > /dev/null; then
    echo "Error: Development server failed to start. Check client-server.log for details."
    kill $CHIMERAX_SERVER_PID
    exit 1
fi

# Open the test page in the default browser
echo "Opening test page in your browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3001/chimerax
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:3001/chimerax
else
    echo "Please open http://localhost:3001/chimerax in your browser."
fi

# Output status
echo "==================================================="
echo "ChimeraX server running on http://localhost:9876"
echo "Web app running on http://localhost:3001"
echo "ChimeraX interactive UI at http://localhost:3001/chimerax"
echo "==================================================="
echo "Server logs are being written to chimerax-server.log"
echo "Client logs are being written to client-server.log"
echo "Press Ctrl+C to stop all servers"

# Function to handle cleanup on exit
cleanup() {
    echo "Stopping servers..."
    kill $CHIMERAX_SERVER_PID $DEV_SERVER_PID 2>/dev/null || true
    echo "Servers stopped."
    exit 0
}

# Trap for Ctrl+C
trap cleanup SIGINT

# Keep script running until user presses Ctrl+C
while true; do
    sleep 1
done