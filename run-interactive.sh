#!/bin/bash

# Script to run the interactive ChimeraX test environment with macOS OpenGL fixes
# This script installs required dependencies and starts the interactive server

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js to continue."
    exit 1
fi

# Check if Homebrew is installed (for OSMesa)
if ! command -v brew &> /dev/null; then
    echo "⚠️ Homebrew is not installed. OSMesa libraries may not be available."
else
    # Find OSMesa libraries
    OSMESA_PATH="$(brew --prefix)/lib"
    OSMESA_LIB="${OSMESA_PATH}/libOSMesa.dylib"
    
    if [ ! -f "$OSMESA_LIB" ]; then
        echo "⚠️ OSMesa libraries not found in Homebrew. For optimal rendering, install with: brew install mesa"
    else
        echo "✅ Found OSMesa libraries at: $OSMESA_LIB"
    fi
fi

# Check if ChimeraX is installed
CHIMERAX_PATH="/Applications/ChimeraX.app/Contents/MacOS/ChimeraX"
if [ ! -f "$CHIMERAX_PATH" ]; then
    echo "❌ ChimeraX not found at the expected path: $CHIMERAX_PATH"
    echo "Please install ChimeraX or update the path in the scripts."
    exit 1
else
    echo "✅ Found ChimeraX at: $CHIMERAX_PATH"
fi

# Install required npm packages if needed
echo "Checking for required packages..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/ws/package.json" ]; then
    echo "Installing required packages..."
    npm install express cors ws
fi

# Ensure the snapshots directory exists
mkdir -p snapshots

# Create symbolic link to test-interactive.html if needed
if [ ! -d "public" ]; then
    mkdir -p public
    echo "Creating symbolic link to test-interactive.html in public folder..."
    ln -sf ../test-interactive.html public/index.html
fi

echo "✨ Starting the interactive ChimeraX server..."
echo "The server will be available at http://localhost:9876"
echo "Press Ctrl+C to stop the server."
echo ""

# Set macOS-specific environment variables to fix OpenGL issues
echo "Setting up macOS environment variables for ChimeraX OpenGL compatibility..."
export OSMESA_LIBRARY="$OSMESA_LIB"
export DYLD_LIBRARY_PATH="$OSMESA_PATH:$DYLD_LIBRARY_PATH"
export PYOPENGL_PLATFORM="osmesa"
export DISPLAY=":0"
export LIBGL_ALWAYS_SOFTWARE="1" 
export MESA_GL_VERSION_OVERRIDE="3.3"
export LIBGL_ALWAYS_INDIRECT="0"

# Start the server with environment variables
echo "Starting server with enhanced OpenGL compatibility for macOS..."
node standalone-interactive.js

# Clean up before exiting
echo "Server stopped."