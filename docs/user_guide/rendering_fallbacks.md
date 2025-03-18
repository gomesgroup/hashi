# Molecular Visualization Rendering Systems

Hashi provides multiple rendering methods to ensure users can always visualize molecular structures, even when primary rendering capabilities are unavailable.

## Rendering Methods

### 1. ChimeraX Server-side Rendering (Primary)

The primary and most powerful rendering method uses ChimeraX's professional rendering capabilities through a headless server process:

- **Requirements**: 
  - ChimeraX installed on the server
  - OSMesa libraries for offscreen rendering
  - Node.js backend running and connected to ChimeraX

- **Capabilities**:
  - Highest visual quality
  - Professional molecular visualization
  - Access to all ChimeraX commands and rendering styles
  - Publication-ready images and visualizations

- **Limitations**:
  - Requires server-side resources
  - Depends on proper ChimeraX installation with OSMesa
  - Network latency can affect interactivity

When operating in this mode, Hashi sends commands to ChimeraX running as a headless process, which renders images of the molecular structure and returns them to the browser.

### 2. Three.js WebGL Rendering (First Fallback)

When ChimeraX rendering is unavailable, Hashi automatically falls back to client-side 3D rendering using Three.js:

- **Requirements**:
  - Modern browser with WebGL support
  - Structure data (atom coordinates, bonds, etc.) available

- **Capabilities**:
  - Full 3D interactivity in the browser
  - Real-time rotation, zooming, and manipulation
  - Multiple representation styles (ball-and-stick, cartoon, etc.)
  - Different coloring schemes
  - No server-side rendering required

- **Limitations**:
  - Lower quality than ChimeraX rendering
  - Limited styling options compared to ChimeraX
  - Performance issues with very large structures
  - Uses more client-side resources

This mode loads the molecular structure data to the client and renders it entirely in the browser using WebGL, providing a fully interactive experience without relying on the server for rendering.

### 3. Static Image Fallback (Second Fallback)

As a final fallback, Hashi can display pre-rendered static images of molecular structures:

- **Requirements**:
  - Internet connection to access external resources
  - Valid PDB ID for the structure

- **Capabilities**:
  - Works on virtually any device and browser
  - Minimal resource requirements
  - Fast loading
  - Available when all other methods fail

- **Limitations**:
  - No interactivity
  - Fixed viewpoint
  - Limited to structures with known PDB IDs
  - Dependent on external services

In this mode, Hashi retrieves pre-rendered images from resources like RCSB PDB (Protein Data Bank) or PDBe (Protein Data Bank in Europe). If no external images are available, a placeholder image is shown.

## Automatic Fallback System

Hashi automatically detects which rendering methods are available and selects the best option in this order:

1. Try ChimeraX rendering
2. If ChimeraX is unavailable, try Three.js rendering
3. If WebGL is unsupported or fails, use static image fallback

This happens transparently to ensure users always have visualization capabilities.

## Manual Switching Between Rendering Modes

Users can manually switch between rendering modes using the "Rendering Mode" dropdown in the viewer controls panel:

- **ChimeraX (Server-side)**: Uses the ChimeraX rendering engine on the server
- **Three.js (Browser-side)**: Uses the Three.js WebGL rendering in the browser
- **Static Image**: Uses static images from external sources

Some options may be disabled if that rendering method is unavailable.

## Troubleshooting Rendering Issues

If you experience rendering problems:

1. **ChimeraX Rendering Unavailable**:
   - Ensure ChimeraX is properly installed on the server
   - Verify OSMesa libraries are installed
   - Check that the ChimeraX server process is running

2. **Three.js Rendering Issues**:
   - Update your browser to the latest version
   - Enable hardware acceleration in your browser
   - Check WebGL support at [WebGL Report](https://webglreport.com/)

3. **Static Image Fallback Problems**:
   - Ensure your internet connection is working
   - Verify the PDB ID is correct
   - Try accessing RCSB PDB directly to confirm structure availability

## Status Indicators

Hashi provides visual feedback about the current rendering mode:

- A status message appears in the viewer when using fallback methods
- The viewer controls panel shows the current rendering mode
- ChimeraX connection status is displayed with a colored indicator
- Error messages provide specific information when rendering fails

This comprehensive approach ensures reliable visualization capabilities across diverse environments and configurations.