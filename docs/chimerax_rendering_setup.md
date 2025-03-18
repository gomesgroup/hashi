# ChimeraX Rendering Setup Guide

This document provides detailed instructions for setting up ChimeraX with proper rendering capabilities for the Hashi application. It covers the installation and configuration of ChimeraX, OSMesa libraries, and fallback rendering options.

## Overview

Hashi uses a multi-layered approach to rendering molecular visualizations:

1. **Primary Method**: ChimeraX with OSMesa libraries for offscreen rendering
2. **Fallback 1**: ChimeraX with Xvfb virtual framebuffer
3. **Fallback 2**: Placeholder images when rendering is unavailable

This guide will help you set up each of these layers for optimal performance.

## ChimeraX Installation

### Linux

1. Download the appropriate ChimeraX installer from the [UCSF ChimeraX website](https://www.rbvi.ucsf.edu/chimerax/download.html)

2. Install ChimeraX using the downloaded package:
   ```bash
   sudo apt-get update
   sudo apt-get install -y ./ucsf-chimerax_*.deb
   ```

3. Verify the installation:
   ```bash
   which chimerax
   chimerax --version
   ```

### macOS

1. Download the ChimeraX installer from the [UCSF ChimeraX website](https://www.rbvi.ucsf.edu/chimerax/download.html)

2. Open the installer package and follow the installation instructions

3. Verify the installation:
   ```bash
   /Applications/ChimeraX.app/Contents/MacOS/ChimeraX --version
   ```

## OSMesa Installation

OSMesa is required for high-quality offscreen rendering without a display server.

### Linux

1. Install the required packages:
   ```bash
   sudo apt-get update
   sudo apt-get install -y \
     libosmesa6 \
     libosmesa6-dev \
     libgl1-mesa-dev \
     libglu1-mesa-dev
   ```

2. Verify the installation:
   ```bash
   ldconfig -p | grep -i osmesa
   ```

3. Configure environment variables:
   ```bash
   export OSMESA_AVAILABLE=true
   ```

### macOS

OSMesa is more challenging to set up on macOS. The recommended approach is to use the Docker container for development and rendering.

## Xvfb Setup (Fallback 1)

Xvfb provides a virtual framebuffer for rendering when OSMesa is not available.

### Linux

1. Install Xvfb:
   ```bash
   sudo apt-get update
   sudo apt-get install -y xvfb
   ```

2. Start Xvfb:
   ```bash
   Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
   export DISPLAY=:99
   ```

3. Verify Xvfb is working:
   ```bash
   xdpyinfo -display :99 >/dev/null 2>&1 && echo "Xvfb is running" || echo "Xvfb failed to start"
   ```

### macOS

Xvfb is not available on macOS. The recommended approach is to use XQuartz for local development or the Docker container for proper rendering.

## Placeholder Image Generation (Fallback 2)

When both OSMesa and Xvfb are unavailable, Hashi generates placeholder images using the Node.js canvas library.

1. Install required dependencies:
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

   # macOS
   brew install pkg-config cairo pango libpng jpeg giflib librsvg
   ```

2. Install the Node.js canvas library:
   ```bash
   npm install canvas
   ```

3. Generate placeholder images:
   ```bash
   npm run generate-placeholder
   ```

## Docker Setup (Recommended)

For the most consistent rendering experience across platforms, we recommend using the Docker container, which includes all necessary components.

1. Build the Docker image:
   ```bash
   docker build -t hashi .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 -e CHIMERAX_PATH=/usr/bin/chimerax hashi
   ```

The Docker container will automatically detect rendering capabilities and configure the appropriate fallback options.

## Verifying the Rendering Setup

The Hashi application includes a diagnostic script to verify your rendering setup:

```bash
# Run the diagnostic script
./scripts/check-rendering.sh
```

This script will:
1. Verify ChimeraX installation
2. Check for OSMesa libraries
3. Test Xvfb if OSMesa is not available
4. Attempt to render a test image
5. Report the rendering capabilities

## Environment Configuration

Configure your environment with the following variables:

```bash
# ChimeraX configuration
CHIMERAX_PATH=/path/to/chimerax   # Auto-detected if not specified
CHIMERAX_BASE_PORT=6100           # Base port for ChimeraX REST API
MAX_CHIMERAX_INSTANCES=10         # Maximum concurrent instances

# Rendering configuration
OSMESA_AVAILABLE=true             # Set to 'true' if OSMesa is available
DISPLAY=:99                       # X11 display for Xvfb (Linux only)
DEBUG_CHIMERAX=false              # Enable detailed ChimeraX logging
```

## Troubleshooting

### OSMesa Not Available

If you see the error "ChimeraX rendering is unavailable. Using placeholder image instead.":

1. Check OSMesa installation:
   ```bash
   ldconfig -p | grep -i osmesa
   ```

2. Verify ChimeraX can find the OSMesa libraries:
   ```bash
   ldd $(which chimerax) | grep -i osmesa
   ```

3. Try the manual rendering test:
   ```bash
   DISPLAY='' chimerax --nogui --silent --script scripts/test-osmesa.py
   ```

### Xvfb Issues

If Xvfb is failing:

1. Check if Xvfb is running:
   ```bash
   ps aux | grep Xvfb
   ```

2. Verify the display is accessible:
   ```bash
   DISPLAY=:99 glxinfo | grep "OpenGL"
   ```

3. Make sure no other process is using the same display number:
   ```bash
   netstat -tulpn | grep 6000
   ```

### Placeholder Image Generation

If placeholder images are not generating:

1. Verify the canvas library is installed:
   ```bash
   npm list canvas
   ```

2. Check for compilation errors:
   ```bash
   npm install canvas --loglevel verbose
   ```

3. Manually run the placeholder generation script:
   ```bash
   node_modules/.bin/ts-node scripts/generate-placeholder.ts
   ```

## Performance Considerations

- OSMesa provides the best performance for headless rendering
- Xvfb has slightly higher overhead but good compatibility
- Placeholder images should only be used as a last resort
- Each ChimeraX instance consumes significant memory (500MB-1GB)
- Limit concurrent render jobs based on your server's resources