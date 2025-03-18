#!/bin/bash

# Script to run ChimeraX with OSMesa libraries from Homebrew
# This creates a modified version of the standalone test server with
# environment variables configured to find the OSMesa libraries

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is not installed. Cannot locate OSMesa libraries."
    exit 1
fi

# Find OSMesa libraries
OSMESA_PATH="$(brew --prefix)/lib"
OSMESA_LIB="${OSMESA_PATH}/libOSMesa.dylib"

if [ ! -f "$OSMESA_LIB" ]; then
    echo "❌ OSMesa libraries not found in Homebrew. Try installing with: brew install mesa"
    exit 1
fi

echo "✅ Found OSMesa libraries at: $OSMESA_LIB"
echo "Creating a modified version of standalone-test.js with OSMesa support..."

# Create a copy of the standalone-test.js file
cp -f standalone-test.js standalone-test-osmesa.js

# Patch the file to include the environment variables
sed -i.bak -e 's/chimeraxProcess = spawn(CHIMERAX_PATH, \["--nogui", "--offscreen"\], {/chimeraxProcess = spawn(CHIMERAX_PATH, ["--nogui", "--offscreen"], {\n      env: {\n        ...process.env,\n        OSMESA_LIBRARY: "'"$OSMESA_LIB"'",\n        DYLD_LIBRARY_PATH: "'"$OSMESA_PATH"':" + (process.env.DYLD_LIBRARY_PATH || "")\n      },/g' standalone-test-osmesa.js

echo "Starting standalone test server with OSMesa support..."

# Start the modified standalone test server
node standalone-test-osmesa.js

# Clean up temporary files
rm -f standalone-test-osmesa.js.bak