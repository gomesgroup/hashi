# ChimeraX Integration Documentation

## Overview

This document provides detailed information about the ChimeraX integration implemented in the Hashi application. It includes explanations of the core components, their interactions, and how to use them effectively.

## Core Components

### ChimeraXProcessManager

The `ChimeraXProcessManager` is responsible for managing the lifecycle of ChimeraX processes, including spawning, monitoring, and terminating them.

**Location**: `/src/server/services/ChimeraXProcessManager.ts`

**Key Features**:
- Process creation and termination
- Port allocation for multiple instances
- Process health monitoring
- Command execution via REST API
- Automatic cleanup of idle sessions

**Usage Example**:
```typescript
import chimeraXProcessManager from '../services/ChimeraXProcessManager';

// Spawn a ChimeraX process
const process = await chimeraXProcessManager.spawnChimeraXProcess('session-123');

// Send a command to ChimeraX
const result = await chimeraXProcessManager.sendCommand('session-123', 'open 1abc');

// Terminate a process
await chimeraXProcessManager.terminateChimeraXProcess('session-123');
```

### Command Service

The `CommandService` provides a higher-level interface for sending commands to ChimeraX and managing command history.

**Location**: `/src/server/services/command.ts`

**Key Features**:
- Command execution and error handling
- Command history tracking
- Command sequence execution
- Command documentation and help

**Usage Example**:
```typescript
import commandService from '../services/command';

// Execute a command
const result = await commandService.executeCommand('session-123', 'cartoon');

// Execute a sequence of commands
const results = await commandService.executeCommandSequence('session-123', [
  'open 1abc',
  'cartoon',
  'color bychain'
]);

// Get command history
const history = commandService.getCommandHistory('session-123');
```

### ChimeraX Controller

The `chimeraxController` provides HTTP API endpoints for ChimeraX process management.

**Location**: `/src/server/controllers/chimeraxController.ts`

**Endpoints**:
- `POST /api/chimerax/processes` - Create a new ChimeraX process
- `GET /api/chimerax/processes` - Get all ChimeraX processes
- `GET /api/chimerax/processes/:id` - Get a specific ChimeraX process
- `DELETE /api/chimerax/processes/:id` - Terminate a ChimeraX process
- `POST /api/chimerax/processes/:id/command` - Send a command to a ChimeraX process
- `POST /api/chimerax/cleanup` - Clean up idle ChimeraX processes

## ChimeraX REST API Communication

Hashi communicates with ChimeraX using its REST API interface, which is enabled when ChimeraX is started with the appropriate command line arguments.

### How It Works

1. ChimeraX is started with the `--nogui --offscreen` arguments to run without a graphical interface
2. The REST API is enabled with `remotecontrol rest start port <port> json true`
3. Commands are sent via HTTP requests to `http://localhost:<port>/run?command=<command>`
4. Responses are returned as JSON data

### Command Format

Commands follow the same syntax as the ChimeraX command line interface. For example:

- `open 1abc` - Open a PDB structure
- `cartoon` - Show cartoon representation
- `color red` - Color the structure red
- `save image.png` - Save a screenshot

## Development Server

A simplified development server is provided for testing ChimeraX connectivity without the full application stack.

**Location**: `/dev-server.js`

**Features**:
- Start/stop ChimeraX processes
- Send commands to ChimeraX
- Check ChimeraX status
- Simulate session creation/termination

**How to Run**:
```bash
node dev-server.js
```

**Endpoints**:
- `GET /api/health` - Health check
- `GET /api/chimerax/status` - Get ChimeraX status
- `POST /api/chimerax/start` - Start ChimeraX process
- `POST /api/chimerax/stop` - Stop ChimeraX process
- `POST /api/chimerax/command` - Send command to ChimeraX
- `POST /api/sessions` - Simulate session creation
- `DELETE /api/sessions/:id` - Simulate session termination

## WebSocket Events Integration

The ChimeraX integration produces events that can be sent to clients via WebSocket.

### Available Event Types

- `CHIMERAX_STARTED` - When a ChimeraX process is successfully started
- `CHIMERAX_ERROR` - When a ChimeraX process encounters an error
- `CHIMERAX_TERMINATED` - When a ChimeraX process is terminated
- `OPERATION_STARTED` - When a long-running ChimeraX operation begins
- `OPERATION_PROGRESS` - For progress updates during operations
- `OPERATION_COMPLETED` - When an operation completes successfully
- `OPERATION_FAILED` - When an operation fails

### Integration with WebSocket Service

The WebSocket service should be implemented to:
1. Initialize a WebSocket server
2. Manage client connections
3. Handle authentication
4. Route messages to appropriate handlers
5. Broadcast ChimeraX events to connected clients

## Troubleshooting

### Common Issues

1. **ChimeraX Process Fails to Start**
   - Check that the ChimeraX path is correct in the `.env` file
   - Ensure ChimeraX has the required permissions
   - Verify the port is not already in use

2. **Command Execution Fails**
   - Ensure the ChimeraX process is running
   - Check that the command syntax is correct
   - Verify the session ID exists

3. **Performance Issues**
   - Monitor the number of concurrent ChimeraX processes
   - Implement proper session timeout and cleanup
   - Consider resource limits for ChimeraX processes

## Next Steps for Implementation

1. Complete WebSocket integration for real-time updates
2. Implement session persistence and restoration
3. Add structure management capabilities
4. Develop frontend components for visualization
5. Implement user authentication and session isolation