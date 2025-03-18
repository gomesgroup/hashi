# ChimeraX Process Manager

The ChimeraX Process Manager is responsible for managing the lifecycle of ChimeraX processes in the Hashi application. It provides functionality for spawning, monitoring, and terminating ChimeraX processes, as well as sending commands to them via their REST API. This module is a core component of the backend that enables the web application to interact with UCSF ChimeraX in headless mode.

## Features

- Spawn ChimeraX processes with the necessary flags for headless operation
- Configure each process with a REST API on a unique port
- Track processes by session ID and map them to ports/PIDs
- Handle process initialization, monitoring, and termination
- Implement timeout detection for idle processes
- Provide robust error handling and recovery mechanisms
- Ensure proper resource management and logging
- Support cross-platform compatibility (macOS and Linux)
- Multi-layered rendering fallback system:
  - **Primary**: OSMesa offscreen rendering for best performance
  - **Fallback 1**: Xvfb virtual display when OSMesa is unavailable
  - **Fallback 2**: Placeholder images when both rendering methods fail

## API Reference

### `spawnChimeraXProcess(sessionId?: string): Promise<ChimeraXProcess>`

Spawns a new ChimeraX process and configures it with a REST API.

- **Parameters:**
  - `sessionId` (optional): A unique identifier for the session. If not provided, a random UUID will be generated.
- **Returns:** A Promise that resolves to a `ChimeraXProcess` object containing information about the spawned process.
- **Throws:** Error if maximum number of ChimeraX instances is reached or if no available ports are found.

### `getChimeraXProcess(sessionId: string): ChimeraXProcess | null`

Gets information about a ChimeraX process.

- **Parameters:**
  - `sessionId`: The session ID of the process to retrieve.
- **Returns:** A `ChimeraXProcess` object if found, `null` otherwise.

### `terminateChimeraXProcess(sessionId: string): Promise<boolean>`

Terminates a ChimeraX process.

- **Parameters:**
  - `sessionId`: The session ID of the process to terminate.
- **Returns:** A Promise that resolves to `true` if the process was terminated successfully, `false` if the process was not found.

### `sendCommand(sessionId: string, command: string): Promise<ChimeraXCommandResult>`

Sends a command to a ChimeraX process via its REST API.

- **Parameters:**
  - `sessionId`: The session ID of the process to send the command to.
  - `command`: The ChimeraX command to execute.
- **Returns:** A Promise that resolves to a `ChimeraXCommandResult` object containing the result of the command execution.

### `cleanupIdleSessions(timeoutMs?: number): Promise<number>`

Terminates ChimeraX processes that have been idle for longer than the specified timeout.

- **Parameters:**
  - `timeoutMs` (optional): The idle timeout in milliseconds. Defaults to 30 minutes.
- **Returns:** A Promise that resolves to the number of terminated processes.

### `getAllProcesses(): ChimeraXProcess[]`

Gets information about all active ChimeraX processes.

- **Returns:** An array of `ChimeraXProcess` objects representing all active processes.

## Types

### `ChimeraXProcess`

Information about a ChimeraX process.

```typescript
interface ChimeraXProcess {
  /** Unique session ID */
  id: string;
  
  /** Port number for the REST API */
  port: number;
  
  /** Process reference */
  process: ChildProcess;
  
  /** Process ID */
  pid: number;
  
  /** Current status */
  status: ChimeraXProcessStatus;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last activity timestamp */
  lastActive: Date;
  
  /** Error information (if status is 'error') */
  error?: string;
}
```

### `ChimeraXProcessStatus`

Status of a ChimeraX process.

```typescript
type ChimeraXProcessStatus = 'starting' | 'running' | 'error' | 'terminated';
```

### `ChimeraXCommandResult`

Result of a ChimeraX command execution.

```typescript
interface ChimeraXCommandResult {
  /** Whether the command was executed successfully */
  success: boolean;
  
  /** Response data (if success is true) */
  data?: any;
  
  /** Error message (if success is false) */
  error?: string;
}
```

## Example Usage

```typescript
import chimeraXProcessManager from '../services/ChimeraXProcessManager';

async function example() {
  try {
    // Spawn a ChimeraX process
    const process = await chimeraXProcessManager.spawnChimeraXProcess();
    console.log(`Process created with ID: ${process.id}`);
    
    // Send a command to open a molecule
    const result = await chimeraXProcessManager.sendCommand(process.id, 'open 1zik');
    if (result.success) {
      console.log('Successfully opened molecule');
    }
    
    // Terminate the process when done
    await chimeraXProcessManager.terminateChimeraXProcess(process.id);
    console.log('Process terminated');
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

## REST API Endpoints

The ChimeraX Process Manager exposes the following REST API endpoints:

### Process Management

- `POST /api/chimerax/processes`: Create a new ChimeraX process
- `GET /api/chimerax/processes`: Get all ChimeraX processes
- `GET /api/chimerax/processes/:id`: Get a specific ChimeraX process
- `DELETE /api/chimerax/processes/:id`: Terminate a ChimeraX process

### Command Execution

- `POST /api/chimerax/processes/:id/command`: Send a command to a ChimeraX process

### Maintenance

- `POST /api/chimerax/cleanup`: Clean up idle ChimeraX processes

## Implementation Details

### Process Spawning

ChimeraX processes are spawned using Node.js's `child_process.spawn` method. The command is configured based on the available rendering capabilities of the system:

```
chimerax --nogui --offscreen --noexit [--osmesa] [--silent|--nosilent] --cmd "remotecontrol rest start port <PORT> json true"
```

- `--osmesa` flag is added when OSMesa libraries are available
- `--silent` is used in production, while `--nosilent` is used in debug mode
- Additional environment variables are set based on platform and rendering capabilities

The process manager automatically detects the platform (macOS/Linux) and adjusts the configuration accordingly. It tests for OSMesa availability and falls back to Xvfb if necessary.

### Port Management

Each ChimeraX process is assigned a unique port number for its REST API. The port numbers are assigned sequentially starting from a base port (default: 6100).

### Process Monitoring

The ChimeraX Process Manager periodically checks the health of all running processes. If a process becomes unresponsive, it is terminated and removed from the manager.

### Idle Session Cleanup

The ChimeraX Process Manager can automatically terminate processes that have been idle for a specified period (default: 30 minutes). This helps free up resources when processes are no longer needed.

## Configuration

The ChimeraX Process Manager is configured using environment variables:

- `CHIMERAX_PATH`: Path to the ChimeraX executable (auto-detected if not specified)
- `CHIMERAX_BASE_PORT`: Base port number for ChimeraX REST APIs (default: 6100)
- `MAX_CHIMERAX_INSTANCES`: Maximum number of concurrent ChimeraX instances (default: 10)
- `OSMESA_AVAILABLE`: Set to 'true' if OSMesa libraries are available
- `DISPLAY`: X11 display for Xvfb fallback rendering (e.g., ':99')
- `DEBUG_CHIMERAX`: Set to 'true' to enable detailed logging of ChimeraX operations

These settings can be adjusted in the `.env` file to match your system's capabilities and ChimeraX installation.

## Troubleshooting

### Process Cannot Start

If a ChimeraX process cannot start, check the following:

1. Ensure ChimeraX is installed and can be executed from the command line
2. If `CHIMERAX_PATH` is not set, verify that the auto-detection is finding the correct path
3. Check for detailed error messages in the server logs and ChimeraX process logs
4. Verify that required libraries (OpenGL/OSMesa) are properly installed

### Rendering Issues

If ChimeraX rendering is not working properly:

1. Verify OSMesa libraries are installed and available if using offscreen rendering
2. Check if Xvfb is properly configured when using it as a fallback
3. Inspect the log files for specific rendering errors
4. Run the diagnostic test in `docker-entrypoint.sh` to check rendering capabilities

### Process Becomes Unresponsive

If a ChimeraX process becomes unresponsive, it will be automatically detected and terminated by the process monitoring system. You can also manually terminate a process using the `terminateChimeraXProcess` method.

### Maximum Instances Reached

If you receive an error saying the maximum number of ChimeraX instances has been reached, either:

1. Terminate some existing processes using `terminateChimeraXProcess`
2. Increase the `MAX_CHIMERAX_INSTANCES` environment variable (but be aware of system resource limitations)

## Security Considerations

The ChimeraX Process Manager does not implement authentication or authorization directly. These concerns should be handled by the application using the manager.

When exposing the REST API endpoints, ensure that:

1. Only authenticated users can access the endpoints
2. Users can only access their own processes (based on session IDs)
3. Command input is validated to prevent potential security issues

## Integration with Other Components

The ChimeraX Process Manager integrates with:

1. **Session Management System**: Maps user sessions to ChimeraX processes
2. **Command API**: Translates high-level operations into ChimeraX commands
3. **File Handling System**: Manages molecular structure files used by ChimeraX

This module is designed to be a foundation for higher-level services while abstracting the complexity of process management from the rest of the application.

## Performance Considerations

When running multiple ChimeraX instances, be aware of:

1. **Memory Usage**: Each ChimeraX process requires significant memory, especially when loading large molecular structures
2. **CPU Utilization**: Operations like surface calculation or rendering can be CPU-intensive
3. **Port Range**: Ensure sufficient ports are available in the configured range

The process monitoring and idle cleanup features help manage these resources efficiently in production environments.