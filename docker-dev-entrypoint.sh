#!/bin/bash
set -e

echo "=== Hashi ChimeraX Integration - DEVELOPMENT ENVIRONMENT ==="
echo "Starting initialization..."

# Setup for headless rendering with OSMesa
echo "Setting up virtual framebuffer for offscreen rendering..."
Xvfb :99 -screen 0 1280x1024x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!
export DISPLAY=:99
export CHIMERAX_PATH=/usr/bin/chimerax

# Wait for Xvfb to start
echo "Waiting for Xvfb to initialize..."
for i in $(seq 1 10); do
  if xdpyinfo -display :99 >/dev/null 2>&1; then
    echo "Xvfb started successfully"
    break
  fi
  
  if [ $i -eq 10 ]; then
    echo "Error: Failed to start Xvfb within 10 seconds"
    exit 1
  fi
  
  echo "Waiting for Xvfb... attempt $i/10"
  sleep 1
done

# Create necessary directories
echo "Ensuring necessary directories exist..."
mkdir -p /app/snapshots /app/logs /app/storage/uploads
chmod 777 /app/snapshots /app/logs /app/storage/uploads

# Check ChimeraX availability
echo "Checking ChimeraX installation..."
if [ ! -f "$CHIMERAX_PATH" ]; then
  echo "ERROR: ChimeraX not found at $CHIMERAX_PATH"
  echo "Visualization will fall back to placeholder images"
  export OSMESA_AVAILABLE=false
else
  echo "ChimeraX found at $CHIMERAX_PATH"
  
  # Check ChimeraX version
  CHIMERAX_VERSION=$($CHIMERAX_PATH --version 2>&1 | head -n 1)
  echo "ChimeraX version: $CHIMERAX_VERSION"
  
  # Test OpenGL capabilities
  echo "Testing OpenGL capabilities..."
  glxinfo | grep -i "opengl" | head -n 3 || echo "glxinfo command failed - OpenGL might not be available"
  
  # Test OSMesa capabilities
  echo "Testing ChimeraX with OSMesa for offscreen rendering..."
  
  # Create a test script
  mkdir -p /tmp/chimerax_test
  cat > /tmp/chimerax_test/test_osmesa.py << EOF
import sys
from chimerax.core.commands import run

try:
    # Create a simple molecule
    run(session, "open")
    
    # Try to render and save an image
    run(session, "camera position 0,0,100")
    run(session, "save /tmp/chimerax_test/test_render.png width 200 height 200")
    
    print("SUCCESS: OSMesa rendering test completed - image saved")
    sys.exit(0)
except Exception as e:
    print(f"ERROR: OSMesa rendering test failed - {str(e)}")
    sys.exit(1)
EOF

  # Run the test script
  set +e
  $CHIMERAX_PATH --nogui --silent --script /tmp/chimerax_test/test_osmesa.py
  OSMESA_TEST_RESULT=$?
  set -e
  
  # Check if image was created
  if [ $OSMESA_TEST_RESULT -eq 0 ] && [ -f "/tmp/chimerax_test/test_render.png" ]; then
    echo "SUCCESS: ChimeraX offscreen rendering (OSMesa) is working correctly"
    export OSMESA_AVAILABLE=true
    # Keep test image for debugging if needed
    cp /tmp/chimerax_test/test_render.png /app/snapshots/osmesa_test.png 
    echo "Test image saved to /app/snapshots/osmesa_test.png"
  else
    echo "WARNING: ChimeraX offscreen rendering (OSMesa) is not working"
    echo "Visualization will fall back to placeholder images"
    export OSMESA_AVAILABLE=false
  fi
  
  # Clean up test files
  rm -rf /tmp/chimerax_test
fi

# Check if we need to install dependencies
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.install-stamp" ]; then
  echo "Installing dependencies..."
  npm install
  touch node_modules/.install-stamp
fi

# Print environment info
echo "=== Development Environment Information ==="
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "OSMesa available: $OSMESA_AVAILABLE"
echo "Working directory: $(pwd)"
echo "Display: $DISPLAY"
echo "========================================"

# Start the requested command
echo "Starting command: $@"
exec "$@"