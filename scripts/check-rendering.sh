#!/bin/bash
#
# ChimeraX Rendering Capability Check
#
# This script checks the rendering capabilities of your system for ChimeraX:
# 1. Verifies ChimeraX installation
# 2. Checks for OSMesa libraries
# 3. Tests Xvfb fallback
# 4. Attempts to render a test image
# 5. Reports the rendering capabilities
#

# Text formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

# Create log directory
mkdir -p logs
LOG_FILE="logs/rendering-check-$(date +%Y%m%d-%H%M%S).log"
touch $LOG_FILE

echo -e "${BOLD}ChimeraX Rendering Capability Check${RESET}"
echo "Results will be logged to: $LOG_FILE"
echo

# Function to log messages
log() {
  echo "$1" | tee -a $LOG_FILE
}

# Function to run a command and log results
run_cmd() {
  local cmd="$1"
  local label="$2"
  
  echo -e "${BLUE}→ $label${RESET}" | tee -a $LOG_FILE
  echo "$ $cmd" >> $LOG_FILE
  
  # Run command and capture output
  if output=$(eval "$cmd" 2>&1); then
    echo -e "${GREEN}✓ Success${RESET}" | tee -a $LOG_FILE
    echo "$output" >> $LOG_FILE
    return 0
  else
    echo -e "${RED}✗ Failed${RESET}" | tee -a $LOG_FILE
    echo "$output" >> $LOG_FILE
    return 1
  fi
}

# Function to check if a command exists
check_command() {
  local cmd="$1"
  local label="$2"
  
  echo -e "${BLUE}→ Checking for $label${RESET}" | tee -a $LOG_FILE
  
  if command -v $cmd >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Found: $(which $cmd)${RESET}" | tee -a $LOG_FILE
    echo "Version: $($cmd --version 2>&1 | head -n 1)" >> $LOG_FILE
    return 0
  else
    echo -e "${RED}✗ Not found: $cmd${RESET}" | tee -a $LOG_FILE
    return 1
  fi
}

# Check system information
echo -e "${BOLD}System Information${RESET}" | tee -a $LOG_FILE
log "OS: $(uname -s)"
log "Architecture: $(uname -m)"
log "Kernel: $(uname -r)"
if [ -f /etc/os-release ]; then
  log "Distribution: $(grep PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d \")"
fi
log "Hostname: $(hostname)"
log "Date: $(date)"
echo

# Check for ChimeraX installation
echo -e "${BOLD}ChimeraX Installation${RESET}" | tee -a $LOG_FILE

# Auto-detect ChimeraX path
CHIMERAX_PATH=${CHIMERAX_PATH:-""}
if [ -z "$CHIMERAX_PATH" ]; then
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
      CHIMERAX_PATH="$path"
      log "Auto-detected ChimeraX at: $CHIMERAX_PATH"
      break
    fi
  done
  
  # If still not found, try to find in PATH
  if [ -z "$CHIMERAX_PATH" ]; then
    if command -v chimerax >/dev/null 2>&1; then
      CHIMERAX_PATH=$(which chimerax)
      log "Found ChimeraX in PATH at: $CHIMERAX_PATH"
    fi
  fi
fi

if [ -z "$CHIMERAX_PATH" ]; then
  echo -e "${RED}✗ ChimeraX not found${RESET}" | tee -a $LOG_FILE
  log "Please install ChimeraX or set CHIMERAX_PATH environment variable."
  exit 1
else
  if [ -f "$CHIMERAX_PATH" ]; then
    echo -e "${GREEN}✓ ChimeraX found at: $CHIMERAX_PATH${RESET}" | tee -a $LOG_FILE
    
    # Check ChimeraX version
    CHIMERAX_VERSION=$("$CHIMERAX_PATH" --version 2>&1 | head -n 1)
    log "ChimeraX version: $CHIMERAX_VERSION"
  else
    echo -e "${RED}✗ ChimeraX not found at: $CHIMERAX_PATH${RESET}" | tee -a $LOG_FILE
    log "Please install ChimeraX or set CHIMERAX_PATH environment variable."
    exit 1
  fi
fi
echo

# Check for OSMesa libraries
echo -e "${BOLD}OSMesa Availability${RESET}" | tee -a $LOG_FILE

OSMesa_AVAILABLE=false

# Check for OSMesa libraries on Linux
if [ "$(uname -s)" = "Linux" ]; then
  # Check with ldconfig
  if ldconfig -p | grep -q "libosmesa"; then
    echo -e "${GREEN}✓ OSMesa libraries found in system paths${RESET}" | tee -a $LOG_FILE
    log "$(ldconfig -p | grep -i osmesa)"
    OSMesa_AVAILABLE=true
  # Check common locations
  elif [ -f "/usr/lib/x86_64-linux-gnu/libOSMesa.so" ] || \
       [ -f "/usr/lib/libOSMesa.so" ] || \
       [ -f "/usr/local/lib/libOSMesa.so" ]; then
    echo -e "${GREEN}✓ OSMesa libraries found in standard locations${RESET}" | tee -a $LOG_FILE
    OSMesa_AVAILABLE=true
  else
    echo -e "${YELLOW}! OSMesa libraries not found${RESET}" | tee -a $LOG_FILE
    log "Consider installing OSMesa with: sudo apt-get install libosmesa6 libosmesa6-dev"
  fi
  
  # Check if ChimeraX links to OSMesa
  if ldd "$CHIMERAX_PATH" 2>/dev/null | grep -q "osmesa"; then
    echo -e "${GREEN}✓ ChimeraX links to OSMesa libraries${RESET}" | tee -a $LOG_FILE
    OSMesa_AVAILABLE=true
  else
    echo -e "${YELLOW}! ChimeraX does not link to OSMesa libraries${RESET}" | tee -a $LOG_FILE
  fi
elif [ "$(uname -s)" = "Darwin" ]; then
  # macOS - harder to detect OSMesa
  echo -e "${YELLOW}! OSMesa detection on macOS is limited${RESET}" | tee -a $LOG_FILE
  log "OSMesa setup on macOS requires custom compilation. Using Docker is recommended."
fi

# Create a test script to verify OSMesa rendering
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

# Test OSMesa rendering
echo -e "${BOLD}\nOSMesa Rendering Test${RESET}" | tee -a $LOG_FILE
echo "Testing ChimeraX with OSMesa offscreen rendering..." | tee -a $LOG_FILE

# Remove any previous test files
rm -f /tmp/chimerax_test/test_render.png

# Run the test with an empty DISPLAY variable to force OSMesa
OSMESA_TEST_RESULT=1
if [ "$OSMesa_AVAILABLE" = true ]; then
  export ORIG_DISPLAY=$DISPLAY
  unset DISPLAY
  "$CHIMERAX_PATH" --nogui --silent --script /tmp/chimerax_test/test_osmesa.py > /tmp/chimerax_test/osmesa_output.log 2>&1
  OSMESA_TEST_RESULT=$?
  export DISPLAY=$ORIG_DISPLAY
  
  cat /tmp/chimerax_test/osmesa_output.log >> $LOG_FILE
  
  if [ $OSMESA_TEST_RESULT -eq 0 ] && [ -f "/tmp/chimerax_test/test_render.png" ]; then
    echo -e "${GREEN}✓ OSMesa rendering test passed${RESET}" | tee -a $LOG_FILE
    log "Test image created: /tmp/chimerax_test/test_render.png"
    log "Image size: $(ls -lh /tmp/chimerax_test/test_render.png | awk '{print $5}')"
    mkdir -p logs/images
    cp /tmp/chimerax_test/test_render.png logs/images/osmesa_test.png
    log "Test image copied to logs/images/osmesa_test.png"
  else
    echo -e "${RED}✗ OSMesa rendering test failed${RESET}" | tee -a $LOG_FILE
    log "Test image was not created or is invalid"
    OSMesa_AVAILABLE=false
  fi
else
  echo -e "${YELLOW}! Skipping OSMesa test - libraries not available${RESET}" | tee -a $LOG_FILE
fi

# Check for Xvfb
echo -e "${BOLD}\nXvfb Availability${RESET}" | tee -a $LOG_FILE

XVFB_AVAILABLE=false

if [ "$(uname -s)" = "Linux" ]; then
  # Check for Xvfb
  if command -v Xvfb >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Xvfb found: $(which Xvfb)${RESET}" | tee -a $LOG_FILE
    
    # Check if Xvfb is already running
    if ps aux | grep -v grep | grep -q "[X]vfb"; then
      echo -e "${GREEN}✓ Xvfb is already running${RESET}" | tee -a $LOG_FILE
      XVFB_AVAILABLE=true
    else
      # Start Xvfb
      echo "Starting Xvfb..." | tee -a $LOG_FILE
      Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
      XVFB_PID=$!
      export DISPLAY=:99
      
      # Wait for Xvfb to start
      sleep 1
      
      # Check if Xvfb is running
      if xdpyinfo -display :99 >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Xvfb started successfully${RESET}" | tee -a $LOG_FILE
        XVFB_AVAILABLE=true
      else
        echo -e "${RED}✗ Failed to start Xvfb${RESET}" | tee -a $LOG_FILE
        XVFB_AVAILABLE=false
      fi
    fi
  else
    echo -e "${RED}✗ Xvfb not found${RESET}" | tee -a $LOG_FILE
    log "Consider installing Xvfb with: sudo apt-get install xvfb"
  fi
elif [ "$(uname -s)" = "Darwin" ]; then
  echo -e "${YELLOW}! Xvfb is not available on macOS${RESET}" | tee -a $LOG_FILE
  log "On macOS, XQuartz can be used for local development"
fi

# Test Xvfb rendering if OSMesa failed
XVFB_TEST_RESULT=1
if [ "$OSMesa_AVAILABLE" = false ] && [ "$XVFB_AVAILABLE" = true ]; then
  echo -e "${BOLD}\nXvfb Rendering Test${RESET}" | tee -a $LOG_FILE
  echo "Testing ChimeraX with Xvfb virtual framebuffer..." | tee -a $LOG_FILE
  
  # Remove any previous test files
  rm -f /tmp/chimerax_test/test_render.png
  
  # Run the test with Xvfb
  "$CHIMERAX_PATH" --nogui --silent --script /tmp/chimerax_test/test_osmesa.py > /tmp/chimerax_test/xvfb_output.log 2>&1
  XVFB_TEST_RESULT=$?
  
  cat /tmp/chimerax_test/xvfb_output.log >> $LOG_FILE
  
  if [ $XVFB_TEST_RESULT -eq 0 ] && [ -f "/tmp/chimerax_test/test_render.png" ]; then
    echo -e "${GREEN}✓ Xvfb rendering test passed${RESET}" | tee -a $LOG_FILE
    log "Test image created: /tmp/chimerax_test/test_render.png"
    log "Image size: $(ls -lh /tmp/chimerax_test/test_render.png | awk '{print $5}')"
    mkdir -p logs/images
    cp /tmp/chimerax_test/test_render.png logs/images/xvfb_test.png
    log "Test image copied to logs/images/xvfb_test.png"
  else
    echo -e "${RED}✗ Xvfb rendering test failed${RESET}" | tee -a $LOG_FILE
    log "Test image was not created or is invalid"
  fi
fi

# Check for Node.js canvas library
echo -e "${BOLD}\nPlaceholder Image Generation${RESET}" | tee -a $LOG_FILE

CANVAS_AVAILABLE=false

# Check if canvas package is installed
if npm list canvas >/dev/null 2>&1 || [ -d "node_modules/canvas" ]; then
  echo -e "${GREEN}✓ Node.js canvas library is installed${RESET}" | tee -a $LOG_FILE
  CANVAS_AVAILABLE=true
else
  echo -e "${YELLOW}! Node.js canvas library not found${RESET}" | tee -a $LOG_FILE
  log "Install canvas with: npm install canvas"
fi

# Test placeholder image generation
if [ "$CANVAS_AVAILABLE" = true ]; then
  if [ -f "scripts/generate-placeholder.ts" ]; then
    echo "Testing placeholder image generation..." | tee -a $LOG_FILE
    
    # Run the script if node and ts-node are available
    if command -v node >/dev/null 2>&1 && [ -f "node_modules/.bin/ts-node" ]; then
      node_modules/.bin/ts-node scripts/generate-placeholder.ts > /tmp/placeholder_output.log 2>&1
      PLACEHOLDER_TEST_RESULT=$?
      
      cat /tmp/placeholder_output.log >> $LOG_FILE
      
      if [ $PLACEHOLDER_TEST_RESULT -eq 0 ] && [ -f "src/assets/placeholder.png" ]; then
        echo -e "${GREEN}✓ Placeholder image generation test passed${RESET}" | tee -a $LOG_FILE
        log "Placeholder image created: src/assets/placeholder.png"
        log "Image size: $(ls -lh src/assets/placeholder.png | awk '{print $5}')"
      else
        echo -e "${RED}✗ Placeholder image generation test failed${RESET}" | tee -a $LOG_FILE
      fi
    else
      echo -e "${YELLOW}! Skipping placeholder test - ts-node not available${RESET}" | tee -a $LOG_FILE
    fi
  else
    echo -e "${YELLOW}! Placeholder script not found at scripts/generate-placeholder.ts${RESET}" | tee -a $LOG_FILE
  fi
fi

# Clean up test files
rm -rf /tmp/chimerax_test
rm -f /tmp/placeholder_output.log

# Kill Xvfb if we started it
if [ -n "$XVFB_PID" ]; then
  kill $XVFB_PID 2>/dev/null || true
fi

# Display summary
echo -e "\n${BOLD}Rendering Capability Summary${RESET}" | tee -a $LOG_FILE

echo "┌─────────────────────────────────────┐" | tee -a $LOG_FILE
echo "│ Capability         │ Status         │" | tee -a $LOG_FILE
echo "├─────────────────────────────────────┤" | tee -a $LOG_FILE
if [ "$OSMesa_AVAILABLE" = true ] && [ $OSMESA_TEST_RESULT -eq 0 ]; then
  echo "│ OSMesa Rendering  │ ${GREEN}Available${RESET}      │" | tee -a $LOG_FILE
else
  echo "│ OSMesa Rendering  │ ${RED}Not Available${RESET}  │" | tee -a $LOG_FILE
fi

if [ "$XVFB_AVAILABLE" = true ] && { [ $XVFB_TEST_RESULT -eq 0 ] || [ "$OSMesa_AVAILABLE" = true ]; }; then
  echo "│ Xvfb Fallback     │ ${GREEN}Available${RESET}      │" | tee -a $LOG_FILE
else
  echo "│ Xvfb Fallback     │ ${RED}Not Available${RESET}  │" | tee -a $LOG_FILE
fi

if [ "$CANVAS_AVAILABLE" = true ]; then
  echo "│ Placeholder Images│ ${GREEN}Available${RESET}      │" | tee -a $LOG_FILE
else
  echo "│ Placeholder Images│ ${RED}Not Available${RESET}  │" | tee -a $LOG_FILE
fi
echo "└─────────────────────────────────────┘" | tee -a $LOG_FILE

echo | tee -a $LOG_FILE
if [ "$OSMesa_AVAILABLE" = true ] && [ $OSMESA_TEST_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ Your system is configured for optimal ChimeraX rendering with OSMesa.${RESET}" | tee -a $LOG_FILE
elif [ "$XVFB_AVAILABLE" = true ] && [ $XVFB_TEST_RESULT -eq 0 ]; then
  echo -e "${YELLOW}! Your system is using Xvfb fallback for ChimeraX rendering.${RESET}" | tee -a $LOG_FILE
  echo "For better performance, consider installing OSMesa libraries." | tee -a $LOG_FILE
elif [ "$CANVAS_AVAILABLE" = true ]; then
  echo -e "${YELLOW}! Your system will use placeholder images for rendering.${RESET}" | tee -a $LOG_FILE
  echo "Please check the troubleshooting section in docs/chimerax_rendering_setup.md." | tee -a $LOG_FILE
else
  echo -e "${RED}✗ Your system is not properly configured for ChimeraX rendering.${RESET}" | tee -a $LOG_FILE
  echo "Please follow the setup instructions in docs/chimerax_rendering_setup.md." | tee -a $LOG_FILE
fi

# Make the script executable
chmod +x scripts/check-rendering.sh