# ChimeraX Integration

This document details the tasks required to implement the ChimeraX integration for the Hashi application.

## Task 1: Set Up ChimeraX Integration Backend Services

### Goal
Complete the ChimeraX integration backend by implementing core functionality to manage ChimeraX processes, handle commands, and maintain sessions.

### Subtasks

#### 1.1 Implement ChimeraXProcessManager
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/server/services/ChimeraXProcessManager.ts`
- **Description**: Create a service to spawn and manage ChimeraX instances.
- **Implementation**:
  - Use Node.js child_process to spawn ChimeraX processes
  - Implement process lifecycle management (start, monitoring, termination)
  - Add port allocation strategy for multiple instances
  - Implement process monitoring and health checks
  - Add error handling and recovery mechanisms

```typescript
import { spawn, ChildProcess } from 'child_process';
import { v4 as uuid } from 'uuid';
import logger from '../utils/logger';
import config from '../config';

export interface ChimeraXProcess {
  id: string;
  process: ChildProcess;
  port: number;
  status: 'starting' | 'ready' | 'busy' | 'error' | 'terminated';
  startTime: Date;
  lastActive: Date;
  userId?: string;
  sessionId?: string;
}

class ChimeraXProcessManager {
  private processes: Map<string, ChimeraXProcess> = new Map();
  private portPool: number[] = [];
  private maxInstances: number = config.chimerax.maxInstances || 5;
  private basePath: string = config.chimerax.path;
  private basePort: number = config.chimerax.basePort || 6100;

  constructor() {
    // Initialize port pool
    for (let i = 0; i < this.maxInstances; i++) {
      this.portPool.push(this.basePort + i);
    }
  }

  // Start a new ChimeraX process
  public async startProcess(userId?: string, sessionId?: string): Promise<ChimeraXProcess> {
    // Implementation here
  }

  // Get process by ID
  public getProcess(id: string): ChimeraXProcess | undefined {
    return this.processes.get(id);
  }

  // Terminate a process
  public async terminateProcess(id: string): Promise<boolean> {
    // Implementation here
  }

  // Cleanup inactive processes
  public cleanupInactiveProcesses(): void {
    // Implementation here
  }

  // Additional helper methods
}

// Export as singleton
export const chimeraXProcessManager = new ChimeraXProcessManager();
export default chimeraXProcessManager;
```

#### 1.2 Implement Command Service
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/server/services/command.ts`
- **Description**: Create a service to send commands to ChimeraX and parse responses.
- **Implementation**:
  - Create HTTP/RPC mechanism to communicate with ChimeraX
  - Implement command serialization and deserialization
  - Add response parsing logic
  - Create command validation
  - Implement error handling for failed commands

```typescript
import axios from 'axios';
import logger from '../utils/logger';
import chimeraXProcessManager from './ChimeraXProcessManager';

export interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

class CommandService {
  // Send a command to a ChimeraX process
  public async sendCommand(processId: string, command: string): Promise<CommandResult> {
    try {
      const process = chimeraXProcessManager.getProcess(processId);
      
      if (!process) {
        return {
          success: false,
          error: `Process ${processId} not found`,
          timestamp: new Date()
        };
      }

      // Implementation of command sending logic
      
      return {
        success: true,
        data: response,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`Error sending command to ChimeraX: ${error}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  // Parse ChimeraX response
  private parseResponse(response: any): any {
    // Implementation of response parsing
  }
}

// Export as singleton
export const commandService = new CommandService();
export default commandService;
```

#### 1.3 Implement Session Service
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/server/services/session.ts`
- **Description**: Create service to manage ChimeraX sessions.
- **Implementation**:
  - Create session creation and restoration logic
  - Implement session state persistence
  - Add session metadata management
  - Implement session cleanup and timeout handling
  - Create session recovery mechanisms

```typescript
import { v4 as uuid } from 'uuid';
import chimeraXProcessManager from './ChimeraXProcessManager';
import commandService from './command';
import logger from '../utils/logger';
import { repositories } from '../database/repositories';

export interface Session {
  id: string;
  userId: string;
  processId: string;
  status: 'initializing' | 'ready' | 'busy' | 'error' | 'terminated';
  created: Date;
  lastActive: Date;
  metadata?: any;
}

class SessionService {
  private sessions: Map<string, Session> = new Map();
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes

  // Create a new session
  public async createSession(userId: string, options?: any): Promise<Session> {
    try {
      // Implementation of session creation
    } catch (error) {
      logger.error(`Error creating session: ${error}`);
      throw error;
    }
  }

  // Get session by ID
  public getSession(id: string): Session | undefined {
    const session = this.sessions.get(id);
    
    if (session) {
      session.lastActive = new Date();
    }
    
    return session;
  }

  // Validate user access to session
  public validateSessionAccess(sessionId: string, userId: string): boolean {
    const session = this.getSession(sessionId);
    return session && session.userId === userId;
  }

  // Terminate a session
  public async terminateSession(id: string): Promise<boolean> {
    // Implementation of session termination
  }

  // Clean up timed out sessions
  public async cleanupTimedOutSessions(): Promise<void> {
    // Implementation of session cleanup
  }
}

// Export as singleton
export const sessionService = new SessionService();
export default sessionService;
```

#### 1.4 Implement WebSocket Communication
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/server/services/websocketService.ts`
- **Description**: Set up WebSocket communication for real-time updates.
- **Implementation**:
  - Configure WebSocket server
  - Implement connection authentication and management
  - Create message handling system
  - Set up ChimeraX event forwarding
  - Add reconnection and error handling

```typescript
import WebSocket, { Server as WebSocketServer } from 'ws';
import http from 'http';
import { v4 as uuid } from 'uuid';
import logger from '../utils/logger';
import config from '../config';
import { authService } from './authService';
import {
  WebSocketConnection,
  WebSocketMessage,
  WebSocketMessageType,
  WebSocketConnectionStatus,
  WebSocketMessagePriority
} from '../types/websocket';

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, WebSocketConnection> = new Map();
  private messageHandlers: Map<WebSocketMessageType, Set<(message: WebSocketMessage, connection: WebSocketConnection) => void>> = new Map();

  // Initialize WebSocket server
  public initialize(server: http.Server): void {
    // Implementation of WebSocket server initialization
  }

  // Register message handler
  public registerMessageHandler(
    type: WebSocketMessageType, 
    handler: (message: WebSocketMessage, connection: WebSocketConnection) => void
  ): void {
    // Implementation of handler registration
  }

  // Send message to connection
  public sendMessage(connectionId: string, message: WebSocketMessage): boolean {
    // Implementation of message sending
  }

  // Broadcast message to all connections
  public broadcastMessage(message: WebSocketMessage, filter?: (connection: WebSocketConnection) => boolean): void {
    // Implementation of message broadcasting
  }

  // Handle new connection
  private handleConnection(socket: WebSocket): void {
    // Implementation of connection handling
  }

  // Handle message from client
  private handleMessage(connectionId: string, data: WebSocket.Data): void {
    // Implementation of message handling
  }
}

// Export as singleton
export const websocketService = new WebSocketService();
export default websocketService;
```

#### 1.5 Create ChimeraX Controllers
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/server/controllers/chimeraxController.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/server/controllers/sessionController.ts`
- **Description**: Implement controllers to handle ChimeraX-related API requests.
- **Implementation**:
  - Create endpoints for ChimeraX process operations
  - Implement session management endpoints
  - Add command execution endpoints
  - Create structure handling endpoints
  - Implement snapshot generation endpoints

```typescript
// chimeraxController.ts example
import { Request, Response } from 'express';
import chimeraXProcessManager from '../services/ChimeraXProcessManager';
import commandService from '../services/command';
import logger from '../utils/logger';

// Check ChimeraX status
export const getStatus = async (req: Request, res: Response) => {
  try {
    // Implementation
  } catch (error) {
    logger.error(`Error getting ChimeraX status: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get ChimeraX status',
      error: error.message
    });
  }
};

// Execute command on ChimeraX process
export const executeCommand = async (req: Request, res: Response) => {
  try {
    // Implementation
  } catch (error) {
    logger.error(`Error executing ChimeraX command: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Failed to execute command',
      error: error.message
    });
  }
};

// Additional controller methods
```

## Task 2: Implement Basic Structure Visualization Functionality

### Goal
Implement the core structure visualization functionality by creating services and endpoints for rendering and interacting with molecular structures.

### Subtasks

#### 2.1 Create Snapshot Service
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/server/services/snapshot.ts`
- **Description**: Implement a service to generate snapshots of molecular structures.
- **Implementation**:
  - Create snapshot generation commands for ChimeraX
  - Implement image format selection and conversion
  - Add snapshot storage and retrieval
  - Create utilities for image processing

```typescript
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import logger from '../utils/logger';
import config from '../config';
import commandService from './command';
import sessionService from './session';

export interface SnapshotOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpg';
  quality?: number;
  camera?: {
    position?: [number, number, number];
    target?: [number, number, number];
  };
  lighting?: 'default' | 'soft' | 'bright' | 'studio';
  background?: string;
  transparent?: boolean;
}

export interface SnapshotResult {
  success: boolean;
  filePath?: string;
  url?: string;
  width?: number;
  height?: number;
  format?: string;
  error?: string;
}

class SnapshotService {
  private snapshotDir: string;

  constructor() {
    this.snapshotDir = config.rendering.snapshotDir || './snapshots';
    
    // Ensure directory exists
    if (!fs.existsSync(this.snapshotDir)) {
      fs.mkdirSync(this.snapshotDir, { recursive: true });
    }
  }

  // Generate a snapshot
  public async generateSnapshot(
    sessionId: string,
    options: SnapshotOptions = {}
  ): Promise<SnapshotResult> {
    try {
      // Implementation of snapshot generation
    } catch (error) {
      logger.error(`Error generating snapshot: ${error}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get snapshot URL
  public getSnapshotUrl(filePath: string): string {
    // Implementation
  }

  // Generate the ChimeraX command for snapshot
  private generateSnapshotCommand(options: SnapshotOptions): string {
    // Implementation
  }
}

// Export as singleton
export const snapshotService = new SnapshotService();
export default snapshotService;
```

#### 2.2 Create Structure Retrieval Service
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/server/services/structureRetrievalService.ts`
- **Description**: Implement a service to retrieve and process structural data from ChimeraX.
- **Implementation**:
  - Create methods to extract structure metadata
  - Implement atom and bond data retrieval
  - Add structure format conversion utilities
  - Create caching mechanisms for structure data

```typescript
import NodeCache from 'node-cache';
import logger from '../utils/logger';
import commandService from './command';
import sessionService from './session';
import { StructureData, StructureFormat, StructureMetadata } from '../types/chimerax';

class StructureRetrievalService {
  private structureCache: NodeCache;
  private atomCache: NodeCache;

  constructor() {
    this.structureCache = new NodeCache({
      stdTTL: 300, // 5 minutes
      checkperiod: 60 // 1 minute
    });
    
    this.atomCache = new NodeCache({
      stdTTL: 120, // 2 minutes
      checkperiod: 30 // 30 seconds
    });
  }

  // Get all structures in a session
  public async getStructures(sessionId: string): Promise<StructureMetadata[]> {
    // Implementation
  }

  // Get structure metadata
  public async getStructureMetadata(
    sessionId: string,
    structureId: string
  ): Promise<StructureMetadata> {
    // Implementation
  }

  // Get complete structure data
  public async getStructure(
    sessionId: string,
    structureId: string,
    format: StructureFormat = StructureFormat.JSON
  ): Promise<any> {
    // Implementation
  }

  // Get atom data
  public async getAtoms(
    sessionId: string,
    structureId: string,
    filter?: any
  ): Promise<any[]> {
    // Implementation
  }

  // Additional methods for structure data retrieval
}

// Export as singleton
export const structureRetrievalService = new StructureRetrievalService();
export default structureRetrievalService;
```

#### 2.3 Implement Structure Controllers
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/server/controllers/structureController.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/server/controllers/structureRetrievalController.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/server/controllers/snapshotController.ts`
- **Description**: Create controllers for structure-related operations.
- **Implementation**:
  - Implement endpoints for structure loading
  - Create endpoints for structure retrieval
  - Add snapshot generation endpoints
  - Implement structure manipulation endpoints

## Acceptance Criteria

The tasks in this document are considered complete when:

1. ChimeraX processes can be spawned and managed correctly
2. Commands can be sent to ChimeraX and responses processed
3. Sessions can be created, managed, and terminated
4. Real-time updates are sent via WebSocket
5. Snapshots can be generated from molecular structures
6. Structure data can be retrieved and processed
7. All API endpoints function correctly