# Hashi Interactive ChimeraX UI

This guide explains how to use the enhanced interactive UI for directly interacting with ChimeraX through the Hashi web interface.

## Overview

The interactive UI provides a direct bridge between the web application and ChimeraX, allowing:

1. Real-time execution of ChimeraX commands
2. Interactive visualization of molecular structures
3. Structure manipulation with live updates
4. Snapshot generation with custom settings
5. Command history and reuse
6. WebSocket-based real-time feedback

## Getting Started

To use the interactive UI:

1. Make sure ChimeraX is installed at `/Applications/ChimeraX.app`
2. Install OSMesa: `brew install mesa`
3. Run the interactive server: `./run-interactive.sh`
4. Open your browser to: http://localhost:9876

## UI Features

### ChimeraX Process Management

- **Start/Stop**: Control the ChimeraX process lifecycle
- **Status Monitoring**: See real-time status of the ChimeraX process
- **Console Output**: View ChimeraX console output directly in the UI

### Structure Loading

- **PDB ID**: Load structures directly by PDB ID
- **Quick Load**: Pre-configured structures for quick testing
- **Structure Tracking**: UI automatically tracks the currently loaded structure

### Visualization Controls

- **Representation Styles**: Switch between cartoon, sphere, stick, ball+stick, ribbon, surface
- **Color Schemes**: Apply different coloring schemes (chain, element, rainbow, etc.)
- **Background Color**: Change the rendering background color
- **View Orientations**: Set standard orientations (front, back, top, bottom)

### Command Interface

- **Direct Command Execution**: Run any ChimeraX command directly
- **Command History**: Recall and reuse previous commands
- **Command Queue**: Commands are executed in order to prevent conflicts

### Snapshot Generation

- **Resolution Control**: Select from different output resolutions
- **Image Downloading**: Ctrl+Click on images to download
- **Background Settings**: Control transparency and background color

### Real-time Updates

- **WebSocket Communication**: Real-time updates about ChimeraX state
- **Loading Indicators**: Visual feedback during operations
- **Console Log**: Command execution and process feedback in real-time

## Technical Implementation

The interactive UI implementation consists of:

1. **Frontend**:
   - `test-interactive.html`: A comprehensive UI with controls and viewers
   - WebSocket client for real-time updates
   - Command queue management for reliable execution

2. **Backend**:
   - `standalone-interactive.js`: Enhanced server with WebSocket support
   - ChimeraX process management with OSMesa integration
   - Command queueing system to prevent race conditions
   - Snapshot management with file handling

3. **WebSocket Communication**:
   - Real-time event propagation from ChimeraX to UI
   - Event types: process status, command execution, snapshots, etc.
   - Bi-directional communication for interactive responses

## Integration with Hashi

This interactive UI provides a foundation for integration with the main Hashi application:

1. The WebSocket communication pattern can be integrated with the main application
2. The command execution and queueing system can be adapted for the production server
3. The visualization controls showcase best practices for ChimeraX interaction
4. The responsive UI design patterns can be incorporated into the main interface

## Troubleshooting

Common issues and solutions:

1. **ChimeraX not found**: Ensure ChimeraX is installed at the expected path
2. **OSMesa missing**: Install with `brew install mesa` for off-screen rendering
3. **Blank images**: OSMesa may not be properly configured
4. **Command not executing**: Check the console for error messages
5. **WebSocket disconnection**: Restart the server if connection is lost

## Next Steps

Future enhancements planned for the interactive UI:

1. Structure manipulation controls (rotation, translation, zoom)
2. Selection tools for atoms, residues, and chains
3. Measurement tools for distances, angles, etc.
4. Animation and trajectory support
5. Multiple structure handling and comparison
6. Integration with computational analysis tools