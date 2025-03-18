#!/bin/bash

# Script to test OSMesa integration and fallbacks
# This script will:
# 1. Check for ChimeraX installation
# 2. Run the dependency verification script
# 3. Test the API endpoints with the standalone test server

echo "========== ChimeraX OSMesa Testing Script =========="
echo "This script will test ChimeraX integration and OSMesa fallbacks"
echo ""

# Check if ChimeraX is installed
CHIMERAX_PATH=""
if [[ -f "/Applications/ChimeraX.app/Contents/MacOS/ChimeraX" ]]; then
  CHIMERAX_PATH="/Applications/ChimeraX.app/Contents/MacOS/ChimeraX"
  echo "✅ ChimeraX found at $CHIMERAX_PATH"
else
  POSSIBLE_PATHS=(
    "/usr/local/bin/chimerax"
    "/usr/bin/chimerax"
    "$HOME/bin/chimerax"
  )
  
  for path in "${POSSIBLE_PATHS[@]}"; do
    if [[ -f "$path" ]]; then
      CHIMERAX_PATH="$path"
      echo "✅ ChimeraX found at $CHIMERAX_PATH"
      break
    fi
  done
  
  if [[ -z "$CHIMERAX_PATH" ]]; then
    echo "❌ ChimeraX not found. Please install ChimeraX or set the correct path."
    exit 1
  fi
fi

# Check for OSMesa libraries
echo ""
echo "Checking for OSMesa libraries..."

if [[ "$(uname)" == "Darwin" ]]; then
  # macOS
  echo "🍎 Running on macOS"
  if [[ -f "/opt/homebrew/lib/libOSMesa.dylib" ]]; then
    OSMESA_LIB="/opt/homebrew/lib/libOSMesa.dylib"
    echo "✅ OSMesa found in homebrew at $OSMESA_LIB"
    echo "ℹ️ We'll configure the test server to use these libraries."
    USE_OSMESA=true
  elif [[ -f "$(brew --prefix 2>/dev/null)/lib/libOSMesa.dylib" ]]; then
    OSMESA_LIB="$(brew --prefix)/lib/libOSMesa.dylib"
    OSMESA_PATH="$(brew --prefix)/lib"
    echo "✅ OSMesa found in homebrew at $OSMESA_LIB"
    echo "ℹ️ We'll configure the test server to use these libraries."
    USE_OSMESA=true
  else
    echo "ℹ️ OSMesa not found via homebrew. This is expected on macOS."
    echo "ℹ️ The fallback mechanisms should activate when testing the API."
    USE_OSMESA=false
  fi
elif [[ "$(uname)" == "Linux" ]]; then
  # Linux
  echo "🐧 Running on Linux"
  if ldconfig -p | grep -q "libOSMesa"; then
    echo "✅ OSMesa libraries found"
  else
    echo "⚠️ OSMesa libraries not found. The fallback mechanisms should activate."
  fi
else
  echo "⚠️ Unknown operating system. Cannot check for OSMesa libraries."
fi

# Run dependency verification if available
if [[ -f "src/scripts/verifyDependencies.js" ]]; then
  echo ""
  echo "Running dependency verification script..."
  node src/scripts/verifyDependencies.js --check-osmesa
else
  echo ""
  echo "⚠️ Dependency verification script not found. Skipping."
fi

# Test the API endpoints
echo ""
echo "Starting standalone test server..."
echo "This will run in the background. Press Ctrl+C to stop when done."

# Start the standalone test server in the background
if [[ "$USE_OSMESA" == "true" && "$(uname)" == "Darwin" ]]; then
  echo "Starting test server with OSMesa support..."
  # Create a temporary copy of the server with OSMesa support
  cp -f standalone-test.js standalone-test-osmesa.js
  
  # Add OSMesa environment variables
  OSMESA_PATH=$(dirname "$OSMESA_LIB")
  sed -i.bak -e 's/chimeraxProcess = spawn(CHIMERAX_PATH, \["--nogui", "--offscreen"\], {/chimeraxProcess = spawn(CHIMERAX_PATH, ["--nogui", "--offscreen"], {\n      env: {\n        ...process.env,\n        OSMESA_LIBRARY: "'"$OSMESA_LIB"'",\n        DYLD_LIBRARY_PATH: "'"$OSMESA_PATH"':" + (process.env.DYLD_LIBRARY_PATH || "")\n      },/g' standalone-test-osmesa.js
  
  # Run the modified server
  node standalone-test-osmesa.js &
  SERVER_PID=$!
else
  echo "Starting test server without OSMesa optimizations..."
  node standalone-test.js &
  SERVER_PID=$!
fi

# Give it a moment to start
sleep 2

# Now test the endpoints
echo ""
echo "Testing API endpoints..."
echo ""

# Test health endpoint
echo "1. Testing health endpoint:"
curl -s http://localhost:9876/api/health
echo -e "\n"

# Start ChimeraX
echo "2. Starting ChimeraX process:"
curl -s -X POST http://localhost:9876/api/chimerax/start
echo -e "\n"

# Send command to open a structure
echo "3. Sending command to open a structure:"
curl -s -X POST -H "Content-Type: application/json" -d '{"command":"open 1ubq"}' http://localhost:9876/api/chimerax/command
echo -e "\n"

# Try to take a snapshot
echo "4. Attempting to create a snapshot (this might fail on macOS without OSMesa):"
curl -s -X POST -H "Content-Type: application/json" -d '{"width":800,"height":600}' http://localhost:9876/api/chimerax/snapshot
echo -e "\n"

# Let the user examine the results
echo ""
echo "Tests completed. Examine the results above."
echo "The snapshot endpoint might have failed if OSMesa is unavailable."
echo "This is an expected behavior and the fallback mechanisms should handle it."
echo ""
echo "Press Enter to stop the test server and exit..."
read

# Kill the server and any ChimeraX processes
echo "Cleaning up processes..."

# Kill any Express.js server processes on port 9876
NODE_PIDS=$(lsof -i :9876 -t)
if [ ! -z "$NODE_PIDS" ]; then
  echo "Stopping Node.js server processes on port 9876: $NODE_PIDS"
  kill $NODE_PIDS 2>/dev/null
fi

# Also try to kill by stored PID
if kill -0 $SERVER_PID 2>/dev/null; then
  kill $SERVER_PID
  echo "Test server stopped."
fi

# Find and kill any ChimeraX processes launched by the test
CHIMERAX_PIDS=$(ps aux | grep "[C]himeraX.*--nogui" | awk '{print $2}')
if [ ! -z "$CHIMERAX_PIDS" ]; then
  echo "Stopping ChimeraX processes: $CHIMERAX_PIDS"
  kill $CHIMERAX_PIDS 2>/dev/null
fi

# Clean up temporary files
if [[ "$USE_OSMESA" == "true" && "$(uname)" == "Darwin" ]]; then
  echo "Cleaning up temporary files..."
  rm -f standalone-test-osmesa.js.bak
  rm -f standalone-test-osmesa.js
fi

echo "Test script completed."