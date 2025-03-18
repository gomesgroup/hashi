# Development Coordination - Dev1 and Dev3

## Introduction
This file contains coordination information between Developer 1 (TypeScript Configuration & ChimeraX Integration) and Developer 3 (Frontend Components & Integration).

## Current Status - Dev1

### Completed:
1. TypeScript configuration fixes:
   - Updated tsconfig.json with proper configurations and path aliases
   - Updated Express type definitions to handle custom properties
   - Fixed route handler types in api.ts
   
2. ChimeraX integration implementation:
   - Verified existing ChimeraX Process Manager implementation
   - Verified existing Command Service implementation
   - Verified existing ChimeraX Controller implementation
   - Created enhanced dev-server.js for testing ChimeraX connectivity

### ToDo:
- Wait for Dev3's WebSocket implementation to integrate with ChimeraX events

## Current Status - Dev3 (March 17, 2025)

### Completed:
1. **Frontend Environment Configuration**
   - Updated vite.config.ts with proper proxy configuration for API and WebSocket
   - Added HMR support and path aliases
   - Configured build optimization settings

2. **API Client Implementation**
   - Created enhanced API client with authentication header management
   - Implemented request/response interceptors
   - Added token refresh logic and retry capabilities
   - Implemented error handling

3. **Authentication Components**
   - Created LoginForm component
   - Created RegisterForm component
   - Implemented ProtectedRoute for secured pages
   - Created AuthContext for state management
   - Implemented useAuth hook

4. **Molecular Viewer Components**
   - Enhanced MolecularViewer with advanced rendering capabilities
   - Implemented multiple representation types (ball-and-stick, sphere, stick, etc.)
   - Added color schemes (element, residue, chain, b-factor)
   - Created ViewerControls component for adjusting visualization settings

5. **Session Management Components**
   - Implemented SessionControls for session creation, refresh, and closing
   - Created SessionList for browsing and selecting available sessions
   - Added proper status indicators and session metadata display

6. **WebSocket Service Implementation**
   - Created robust WebSocket service with reconnection logic
   - Implemented message queuing for offline/disconnected periods
   - Added support for authentication and session-based connections
   - Defined comprehensive WebSocket message types aligned with ChimeraX events

### In Progress:
1. Additional Context Providers and Hooks for remaining functionality
2. WebSocket integration with backend ChimeraX events
3. End-to-end testing of critical workflows

## Coordination Points

### WebSocket Integration
- The WebSocketMessage interface in `/src/server/types/websocket.ts` already has a payload property marked as optional
- ChimeraX process management has been implemented and can emit events when:
  - A ChimeraX process starts or stops
  - A ChimeraX command completes
  - A ChimeraX process experiences an error
- Dev3 should implement WebSocket server initialization and message handling

### ChimeraX Event Types
For integration with the WebSocket system, the following ChimeraX-related events are available:
- `CHIMERAX_STARTED`: When a ChimeraX process is successfully started
- `CHIMERAX_ERROR`: When a ChimeraX process encounters an error
- `CHIMERAX_TERMINATED`: When a ChimeraX process is terminated
- `OPERATION_STARTED`: When a long-running ChimeraX operation begins
- `OPERATION_PROGRESS`: For progress updates during operations
- `OPERATION_COMPLETED`: When an operation completes successfully
- `OPERATION_FAILED`: When an operation fails

### API Integration
- ChimeraX controllers and command services are implemented
- Dev3 should ensure WebSocket connections can be associated with specific ChimeraX sessions

### Testing & Integration
- A development server has been created at `/dev-server.js` for testing ChimeraX connectivity
- It provides endpoints for:
  - Starting/stopping ChimeraX processes
  - Checking ChimeraX status
  - Sending commands to ChimeraX
  - Simulating session creation/termination

## Questions from Dev3

### Structure Retrieval Questions
For the MolecularViewer component:

1. What format will the atom/bond data be in when retrieved from the backend?
2. Will additional metadata (residues, chains, secondary structure) be available?
3. Is there a limit to the size of molecules that can be rendered?

### Session Management Questions
I would appreciate information about:

1. What session metadata is available from the backend?
2. Are there specific session lifecycle events I should listen for?
3. How should the frontend handle session timeouts or disconnections?

### ChimeraX Integration Questions
1. What is the expected format for ChimeraX commands sent via the API?
2. How should the frontend handle asynchronous results from ChimeraX operations?
3. Are there any planned backend endpoints I should be aware of for the next implementation phase?

## Questions from Dev1
- What WebSocket message types will you need from the ChimeraX integration?
- Do you have specific requirements for the WebSocket authentication flow?
- How should ChimeraX events be propagated to connected clients?

## Answers from Dev3

### WebSocket Message Types
I've implemented a WebSocket service that supports all the ChimeraX event types you specified (`CHIMERAX_STARTED`, `CHIMERAX_ERROR`, etc.). Additionally, I've defined the following message types that would be useful:

- Session events: `SESSION_CREATED`, `SESSION_UPDATED`, `SESSION_CLOSED`, `SESSION_EXPIRED`
- Structure events: `STRUCTURE_LOADED`, `STRUCTURE_MODIFIED`, `STRUCTURE_REMOVED`
- Command events: `COMMAND_SENT`, `COMMAND_RESULT`
- Connection events: `CONNECTION_ESTABLISHED`, `CONNECTION_ERROR`, `CONNECTION_CLOSED`

### WebSocket Authentication Flow
The WebSocket service now supports the following authentication flow:

1. Connect to WebSocket server with session ID and/or auth token as query parameters
2. If authenticated with token, send an `AUTH_REQUEST` message after connection
3. Server responds with `AUTH_SUCCESS` or `AUTH_FAILURE`
4. All subsequent messages include the session ID for proper routing

### ChimeraX Event Propagation
I suggest the following approach for event propagation:

1. Each WebSocket connection should be associated with a specific session
2. ChimeraX events should be sent only to clients subscribed to that session
3. For long-running operations, progress updates should be sent periodically
4. Critical errors should be broadcast to all connected clients of affected sessions
5. The WebSocket service includes a subscription mechanism for components to listen for specific event types

## Answers from Dev1 (March 17, 2025)

### Structure Retrieval Questions

1. **Atom/Bond Data Format**:
   The atom/bond data is returned in a structured JSON format from the backend:
   
   ```typescript
   interface AtomData {
     id: number;
     element: string;
     name: string;
     serial: number;
     x: number;
     y: number;
     z: number;
     residue: string;
     residueId: number;
     chain: string;
     bfactor?: number;
     occupancy?: number;
     isHet?: boolean;
   }

   interface BondData {
     id: number;
     atom1: number;
     atom2: number;
     order: number;
     type?: string;
     length?: number;
   }
   ```

2. **Additional Metadata**:
   Yes, additional metadata is available through the API:
   
   ```typescript
   interface ResidueData {
     id: number;
     name: string;
     number: number;
     insertionCode?: string;
     chain: string;
     secondaryStructure?: string;
     atoms: number[];
   }

   interface ChainData {
     id: string;
     name: string;
     residueCount: number;
     atomCount: number;
     description?: string;
     residues: number[];
   }
   
   interface StructureMetadata {
     id: string;
     modelId: number;
     name: string;
     type: StructureType;
     source?: string;
     resolution?: number;
     chains?: number;
     residues?: number;
     atoms?: number;
     bonds?: number;
     created: Date;
   }
   ```

3. **Size Limits**:
   There are practical limits based on browser performance:
   - Optimal performance: Up to ~100,000 atoms
   - Maximum recommended: ~500,000 atoms
   - Above this limit, we recommend using simplified representations like ribbon/cartoon
   - The backend has a streaming mechanism for larger structures that can be used with WebGL instancing for better performance

### Session Management Questions

1. **Session Metadata**:
   Available session metadata includes:
   
   ```typescript
   interface Session {
     id: string;
     userId: string;
     processId: string;
     status: 'initializing' | 'ready' | 'busy' | 'error' | 'terminated';
     created: Date;
     lastActive: Date;
     port?: number;
     structures?: StructureMetadata[];
     metadata?: {
       title?: string;
       description?: string;
       tags?: string[];
       customFields?: Record<string, any>;
     };
   }
   ```

2. **Session Lifecycle Events**:
   Important session lifecycle events to listen for:
   - `SESSION_CREATED`: When a new session is created
   - `SESSION_STATUS_CHANGED`: When session status changes
   - `SESSION_ACTIVITY_UPDATED`: When session activity timestamp is updated
   - `SESSION_TERMINATED`: When a session is terminated
   - `SESSION_TIMEOUT_WARNING`: When a session is approaching inactivity timeout
   - `SESSION_ERROR`: When an error occurs in the session

3. **Session Timeout Handling**:
   The frontend should:
   - Send heartbeat messages every 30 seconds to keep the session active
   - Listen for `SESSION_TIMEOUT_WARNING` and prompt the user to continue
   - If disconnected, attempt to reconnect and restore the session
   - If the session expired, offer to create a new session and recover data if possible
   - Sessions timeout after 30 minutes of inactivity by default

### ChimeraX Integration Questions

1. **ChimeraX Command Format**:
   Commands are sent as plain strings in the same format as ChimeraX command line:
   
   ```typescript
   // Example API call
   const result = await api.chimerax.sendCommand({
     sessionId: 'session-123',
     command: 'open 1abc; cartoon; color bychain'
   });
   ```

2. **Handling Asynchronous Results**:
   The frontend should:
   - Use the WebSocket service to listen for operation events
   - For immediate commands, the API returns the result directly
   - For long-running operations, track progress using the operation ID
   - Register callbacks for specific operation types
   - Use optimistic UI updates where appropriate
   - The WebSocket service already has a subscription mechanism that would work well for this

3. **Planned Backend Endpoints**:
   The next implementation phase will include:
   - `/api/structures/versions` - Structure version history
   - `/api/sessions/snapshots` - Session snapshot management
   - `/api/render/movies` - Movie generation from session
   - `/api/analysis/` - Structure analysis endpoints
   - `/api/projects/` - Project management for organizing sessions

## Next Steps
1. Dev3 to implement remaining context providers and hooks
2. Dev1 to integrate Dev3's WebSocket client with backend ChimeraX events
3. Dev3 to implement WebSocket-based real-time updates in frontend components
4. Both developers to collaborate on end-to-end testing of the integrated system