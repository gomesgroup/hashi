# WebSocket Support in Hashi

This document describes the WebSocket implementation in Hashi, including the architecture, message protocol, authentication, and client integration.

## Overview

Hashi supports bidirectional real-time communication between the client and server using WebSockets. This enables efficient updates for long-running operations, structure changes, and notifications. The implementation includes:

- WebSocket server with authentication and connection management
- Session-based connection tracking
- Structured message protocol with validation
- Real-time updates for structure changes and operations
- Reliable message delivery with confirmation and retry
- Client-side connection management with failover
- REST API fallback for environments where WebSockets are unavailable

## Server-Side Implementation

### WebSocket Server

The WebSocket server is implemented using the `ws` library and is integrated with the Express HTTP server:

```typescript
// Initialization in server/index.ts
const server = http.createServer(app);
const websocketService = await import('./services/websocketService');
await websocketService.initialize(server);
```

### Connection Management

Connections are tracked by the `WebSocketService` class, which handles:

- Connection lifecycle (open, authenticate, heartbeat, close)
- Session association and validation
- User identity and authorization
- Connection pooling and limits
- Heartbeat and health monitoring

### Message Protocol

All WebSocket messages follow a standardized format:

```typescript
interface WebSocketMessage {
  id: string;          // Unique message ID
  type: string;        // Message type (e.g., 'operation_progress')
  timestamp: string;   // ISO timestamp
  priority: string;    // Message priority (high/normal/low)
  sessionId?: string;  // Optional session ID
  payload: any;        // Message-specific data
}
```

Message types include:
- Authentication and connection management (`authentication`, `heartbeat`)
- Operation status (`operation_started`, `operation_progress`, `operation_completed`, `operation_failed`)
- Structure changes (`structure_change`, `selection_update`)
- Notifications (`notification`)

### Authentication

WebSocket connections require authentication before they can receive or send messages:

1. Client establishes WebSocket connection
2. Client sends authentication message with token and optional sessionId
3. Server validates token and session access
4. Server responds with authentication success/failure
5. If successful, connection is marked as authenticated and can send/receive messages

```typescript
// Example authentication message
{
  "id": "msg123",
  "type": "authentication",
  "timestamp": "2023-05-01T12:34:56.789Z",
  "priority": "high",
  "payload": {
    "token": "user-token",
    "sessionId": "session-123"
  }
}
```

### Message Handling

The server provides a message handler registry that allows services to register handlers for specific message types:

```typescript
// Registering a message handler
websocketService.registerMessageHandler(
  WebSocketMessageType.OPERATION_PROGRESS,
  async (message, connection) => {
    // Handle operation progress message
  }
);
```

## Client-Side Implementation

### WebSocket Client

The client-side implementation includes a WebSocket client class that provides:

- Connection management with auto-reconnect
- Authentication handling
- Message sending with REST fallback
- Message handling registry
- Exponential backoff for reconnection
- Connection state management

```typescript
// Creating a WebSocket client
const client = new WebSocketClient({
  url: 'ws://localhost:3000/ws',
  token: 'user-token',
  sessionId: 'session-123',
  autoReconnect: true
});

// Connecting to the server
await client.connect();

// Sending a message
await client.send(
  WebSocketMessageType.CUSTOM,
  { data: 'hello world' }
);

// Registering a message handler
client.on(WebSocketMessageType.NOTIFICATION, (message) => {
  console.log('Received notification:', message.payload);
});
```

### React Integration

The WebSocket client is integrated with React components using hooks:

```typescript
// Example usage in a React component
function OperationStatus({ sessionId, userId }) {
  const [client, setClient] = useState(null);
  const [operations, setOperations] = useState({});
  
  // Initialize client on component mount
  useEffect(() => {
    const wsClient = createClient({
      sessionId,
      token: userId
    });
    
    setClient(wsClient);
    wsClient.connect();
    
    return () => wsClient.disconnect();
  }, [sessionId, userId]);
  
  // Register message handlers
  useEffect(() => {
    if (!client) return;
    
    const handleProgress = (message) => {
      // Update operation status
    };
    
    client.on(WebSocketMessageType.OPERATION_PROGRESS, handleProgress);
    
    return () => {
      client.off(WebSocketMessageType.OPERATION_PROGRESS, handleProgress);
    };
  }, [client]);
  
  // Render operations status UI
}
```

## REST API Fallback

For environments where WebSockets are not available or supported, the system provides REST API fallback endpoints:

- `/ws-api/status` - Get WebSocket server status
- `/ws-api/send` - Send a message (fallback for WebSocket)
- `/ws-api/broadcast` - Broadcast a message to session connections
- `/ws-api/connections/session/:sessionId` - Get active connections for a session
- `/ws-api/notify/operation` - Send operation status notification

The WebSocket client automatically falls back to these REST endpoints when WebSocket connection fails, providing a seamless experience.

## Integration Examples

### Real-time Operation Status Updates

The Structure Service has been enhanced to send operation status updates in real-time:

```typescript
// In structureService.ts
public async performMinimization(sessionId: string, params: MinimizationParameters) {
  // Create unique operation ID
  const operationId = uuidv4();
  
  // Send operation started notification
  const startedMessage = websocketService.createMessage(
    WebSocketMessageType.OPERATION_STARTED,
    {
      operationId,
      operationType: 'minimization',
      details: { /* operation details */ }
    },
    { sessionId }
  );
  
  await websocketService.broadcastToSession(sessionId, startedMessage);
  
  // Start operation and send progress updates
  // ...
  
  // Send completion notification
  const completedMessage = websocketService.createMessage(
    WebSocketMessageType.OPERATION_COMPLETED,
    {
      operationId,
      operationType: 'minimization',
      details: { /* results */ }
    },
    { sessionId }
  );
  
  await websocketService.broadcastToSession(sessionId, completedMessage);
}
```

## Configuration

WebSocket behavior can be configured through environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `WEBSOCKET_PORT` | WebSocket server port | 3001 |
| `WEBSOCKET_PATH` | WebSocket endpoint path | `/ws` |
| `WEBSOCKET_HEARTBEAT_INTERVAL` | Heartbeat interval (ms) | 30000 |
| `WEBSOCKET_HEARTBEAT_TIMEOUT` | Heartbeat timeout (ms) | 10000 |
| `WEBSOCKET_MAX_CONNECTIONS` | Maximum concurrent connections | 100 |
| `WEBSOCKET_MESSAGE_QUEUE_SIZE` | Message queue size per connection | 50 |
| `WEBSOCKET_MESSAGE_RETRY_ATTEMPTS` | Max retry attempts for failed messages | 3 |
| `WEBSOCKET_MESSAGE_EXPIRY_TIME` | Message expiry time (ms) | 60000 |

## Performance Considerations

The WebSocket implementation includes several performance optimizations:

- Connection pooling to limit resource usage
- Message prioritization to handle critical messages first
- Message debouncing and batching for high-frequency updates
- Binary message format for efficient data transfer (future enhancement)
- Lazy reconnection with exponential backoff
- Efficient message routing based on session and user IDs

## Testing WebSocket Functionality

To test the WebSocket implementation:

1. Start the Hashi server
2. Use a WebSocket client tool (like wscat or Postman) to connect to `ws://localhost:3000/ws`
3. Send an authentication message:
   ```json
   {
     "id": "test1",
     "type": "authentication",
     "timestamp": "2023-05-01T12:34:56.789Z",
     "priority": "high",
     "payload": {
       "token": "user-123",
       "sessionId": "session-123"
     }
   }
   ```
4. You should receive an authentication success response
5. You can then test heartbeats and other message types

## Future Enhancements

- Support for binary message format to improve performance
- Subscription-based message filtering
- Message compression for large payloads
- Federation support for multi-server deployments
- End-to-end message encryption for sensitive data
- WebRTC data channel fallback for environments with restrictive proxies