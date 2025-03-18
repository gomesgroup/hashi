#!/bin/bash
set -e

echo "=== Hashi ChimeraX Integration Server ==="
echo "Starting initialization..."

# Create log file
LOG_FILE="/app/logs/initialization.log"
mkdir -p /app/logs
touch $LOG_FILE
echo "$(date) - Container initialization started" >> $LOG_FILE

# Setup for headless rendering with OSMesa
echo "Setting up virtual framebuffer for offscreen rendering..."
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!
export DISPLAY=:99

# Wait for Xvfb to start with better diagnostics
echo "Waiting for Xvfb to initialize..."
for i in $(seq 1 20); do
  if xdpyinfo -display :99 >/dev/null 2>&1; then
    echo "Xvfb started successfully after $i attempts"
    echo "$(date) - Xvfb started successfully after $i attempts" >> $LOG_FILE
    break
  fi
  
  if [ $i -eq 20 ]; then
    echo "Error: Failed to start Xvfb within 20 seconds"
    echo "$(date) - ERROR: Failed to start Xvfb" >> $LOG_FILE
    exit 1
  fi
  
  echo "Waiting for Xvfb... attempt $i/20"
  sleep 1
done

# Run graphics diagnostics
if command -v glxinfo >/dev/null 2>&1; then
  echo "OpenGL information:" | tee -a $LOG_FILE
  DISPLAY=:99 glxinfo | grep -i "direct rendering\|opengl vendor\|opengl renderer" | tee -a $LOG_FILE
else
  echo "glxinfo not available - skipping OpenGL diagnostics" | tee -a $LOG_FILE
fi

# Create necessary directories with more comprehensive structure
echo "Ensuring necessary directories exist..."
mkdir -p /app/snapshots /app/logs /app/storage/uploads /app/storage/sessions /app/src/assets
chmod 777 /app/snapshots /app/logs /app/storage /app/storage/uploads

# Check ChimeraX availability with path detection
if [ -z "$CHIMERAX_PATH" ]; then
  echo "CHIMERAX_PATH not set, attempting auto-detection..." | tee -a $LOG_FILE
  
  # Check common locations
  COMMON_PATHS=(
    "/usr/bin/chimerax"
    "/usr/local/bin/chimerax"
    "/opt/UCSF/ChimeraX/bin/chimerax"
    "/Applications/ChimeraX.app/Contents/MacOS/ChimeraX"
    "/Applications/UCSF ChimeraX.app/Contents/MacOS/ChimeraX"
  )
  
  for path in "${COMMON_PATHS[@]}"; do
    if [ -f "$path" ]; then
      export CHIMERAX_PATH="$path"
      echo "Auto-detected ChimeraX at: $CHIMERAX_PATH" | tee -a $LOG_FILE
      break
    fi
  done
  
  # If still not found, try to find in PATH
  if [ -z "$CHIMERAX_PATH" ]; then
    if command -v chimerax >/dev/null 2>&1; then
      export CHIMERAX_PATH=$(which chimerax)
      echo "Found ChimeraX in PATH at: $CHIMERAX_PATH" | tee -a $LOG_FILE
    fi
  fi
fi

# Check ChimeraX availability
echo "Checking ChimeraX installation..."
if [ ! -f "$CHIMERAX_PATH" ]; then
  echo "ERROR: ChimeraX not found at $CHIMERAX_PATH" | tee -a $LOG_FILE
  echo "Visualization will fall back to placeholder images" | tee -a $LOG_FILE
  export OSMESA_AVAILABLE=false
  export XVFB_AVAILABLE=true
else
  echo "ChimeraX found at $CHIMERAX_PATH" | tee -a $LOG_FILE
  
  # Check ChimeraX version with error handling
  echo "Checking ChimeraX version..." | tee -a $LOG_FILE
  set +e
  CHIMERAX_VERSION_OUTPUT=$($CHIMERAX_PATH --version 2>&1)
  set -e
  CHIMERAX_VERSION=$(echo "$CHIMERAX_VERSION_OUTPUT" | head -n 1)
  echo "ChimeraX version: $CHIMERAX_VERSION" | tee -a $LOG_FILE
  
  # Test OSMesa capabilities with enhanced script
  echo "Testing ChimeraX with OSMesa for offscreen rendering..." | tee -a $LOG_FILE
  
  # Create a test script with more comprehensive testing
  mkdir -p /tmp/chimerax_test
  cat > /tmp/chimerax_test/test_osmesa.py << EOF
import sys
import os
from chimerax.core.commands import run

try:
    print("Starting ChimeraX OSMesa test...")
    
    # Basic command test
    run(session, "version")
    print("Command execution working")
    
    # Try to render and save an image
    print("Creating sample molecule...")
    run(session, "open")
    
    # Set up visualization
    print("Setting up visualization parameters...")
    run(session, "camera position 0,0,100")
    run(session, "lighting soft")
    run(session, "background solid white")
    
    # Try rendering with different options
    print("Attempting to render image...")
    test_image_path = "/tmp/chimerax_test/test_render.png"
    run(session, f"save {test_image_path} width 200 height 200")
    
    # Verify the file exists and has content
    if os.path.exists(test_image_path) and os.path.getsize(test_image_path) > 1000:
        print(f"Image successfully created with size: {os.path.getsize(test_image_path)} bytes")
        print("SUCCESS: OSMesa rendering test completed")
        sys.exit(0)
    else:
        if os.path.exists(test_image_path):
            size = os.path.getsize(test_image_path)
            print(f"Image created but too small: {size} bytes - likely corrupted")
        else:
            print("Image file was not created")
        print("ERROR: OSMesa rendering test failed - invalid output")
        sys.exit(1)
except Exception as e:
    import traceback
    print(f"ERROR: OSMesa rendering test failed - {str(e)}")
    traceback.print_exc()
    sys.exit(1)
EOF

  # Run the test script with detailed output
  echo "Running ChimeraX OSMesa test script..." | tee -a $LOG_FILE
  set +e
  $CHIMERAX_PATH --nogui --silent --script /tmp/chimerax_test/test_osmesa.py > /tmp/chimerax_test/osmesa_output.log 2>&1
  OSMESA_TEST_RESULT=$?
  cat /tmp/chimerax_test/osmesa_output.log | tee -a $LOG_FILE
  set -e
  
  # Check if image was created
  if [ $OSMESA_TEST_RESULT -eq 0 ] && [ -f "/tmp/chimerax_test/test_render.png" ]; then
    echo "SUCCESS: ChimeraX offscreen rendering (OSMesa) is working correctly" | tee -a $LOG_FILE
    export OSMESA_AVAILABLE=true
    export XVFB_AVAILABLE=true
    
    # Keep test image for diagnostics
    mkdir -p /app/snapshots/tests
    cp /tmp/chimerax_test/test_render.png /app/snapshots/tests/osmesa_test.png
    echo "Test image saved to /app/snapshots/tests/osmesa_test.png" | tee -a $LOG_FILE
  else
    echo "WARNING: ChimeraX offscreen rendering (OSMesa) not working properly" | tee -a $LOG_FILE
    
    # Try with explicit Xvfb
    echo "Testing ChimeraX with Xvfb fallback..." | tee -a $LOG_FILE
    set +e
    DISPLAY=:99 $CHIMERAX_PATH --nogui --silent --script /tmp/chimerax_test/test_osmesa.py > /tmp/chimerax_test/xvfb_output.log 2>&1
    XVFB_TEST_RESULT=$?
    cat /tmp/chimerax_test/xvfb_output.log | tee -a $LOG_FILE
    set -e
    
    if [ $XVFB_TEST_RESULT -eq 0 ] && [ -f "/tmp/chimerax_test/test_render.png" ]; then
      echo "SUCCESS: ChimeraX with Xvfb fallback is working" | tee -a $LOG_FILE
      export OSMESA_AVAILABLE=false
      export XVFB_AVAILABLE=true
      
      # Keep test image for diagnostics
      mkdir -p /app/snapshots/tests
      cp /tmp/chimerax_test/test_render.png /app/snapshots/tests/xvfb_test.png
      echo "Test image saved to /app/snapshots/tests/xvfb_test.png" | tee -a $LOG_FILE
    else
      echo "ERROR: Neither OSMesa nor Xvfb rendering is working" | tee -a $LOG_FILE
      echo "Visualization will fall back to placeholder images" | tee -a $LOG_FILE
      export OSMESA_AVAILABLE=false
      export XVFB_AVAILABLE=false
    fi
  fi
  
  # Clean up test files but keep logs
  mkdir -p /app/logs/chimerax
  mv /tmp/chimerax_test/*.log /app/logs/chimerax/ 2>/dev/null || true
  rm -rf /tmp/chimerax_test
fi

# Generate placeholder images if canvas package is available
if npm list canvas >/dev/null 2>&1 || [ -d "node_modules/canvas" ]; then
  echo "Generating placeholder images for fallback rendering..." | tee -a $LOG_FILE
  mkdir -p /app/src/assets
  
  if [ -f "scripts/generate-placeholder.ts" ]; then
    node_modules/.bin/ts-node scripts/generate-placeholder.ts | tee -a $LOG_FILE
  elif [ -f "node_modules/.bin/ts-node" ]; then
    # Try to generate on-the-fly
    echo "Creating placeholder image generator script..." | tee -a $LOG_FILE
    mkdir -p scripts
    cat > scripts/generate-placeholder-temp.js << EOF
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create assets directory
const assetsDir = path.join(process.cwd(), 'src', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create placeholder image
const canvas = createCanvas(800, 600);
const ctx = canvas.getContext('2d');

// Fill background
ctx.fillStyle = '#f0f0f0';
ctx.fillRect(0, 0, 800, 600);

// Draw border
ctx.strokeStyle = '#cccccc';
ctx.lineWidth = 3;
ctx.strokeRect(10, 10, 780, 580);

// Draw text
ctx.fillStyle = '#666666';
ctx.font = 'bold 28px Arial';
ctx.textAlign = 'center';
ctx.fillText('ChimeraX Rendering Unavailable', 400, 280);

ctx.font = '18px Arial';
ctx.fillText('OSMesa libraries missing or not configured', 400, 320);

// Save image
const outputPath = path.join(assetsDir, 'placeholder.png');
fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
console.log('Generated placeholder image at ' + outputPath);
EOF

    node scripts/generate-placeholder-temp.js | tee -a $LOG_FILE
    rm scripts/generate-placeholder-temp.js
  else
    echo "WARNING: Cannot generate placeholder images - canvas library or ts-node not available" | tee -a $LOG_FILE
  fi
else
  echo "WARNING: Canvas package not installed - placeholder images not generated" | tee -a $LOG_FILE
fi

# Set environment variables for application
export NODE_ENV=${NODE_ENV:-"production"}
export DEBUG_CHIMERAX=${DEBUG_CHIMERAX:-"false"}

# Print environment info
echo "=== Environment Information ==="
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "OSMesa available: $OSMESA_AVAILABLE"
echo "Xvfb available: $XVFB_AVAILABLE"
echo "Working directory: $(pwd)"
echo "Display: $DISPLAY"
echo "Debug mode: $DEBUG_CHIMERAX"
echo "Node environment: $NODE_ENV"
echo "==============================="

# Log all environment info 
env | sort >> $LOG_FILE

echo "$(date) - Initialization complete. Starting application." >> $LOG_FILE

# Start the Node.js application
echo "Starting Hashi server..."
exec "$@"