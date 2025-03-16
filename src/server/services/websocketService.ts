import WebSocket from 'ws';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import logger from '../utils/logger';
import sessionService from './session';
import { 
  WebSocketConnection, 
  WebSocketConnectionStatus, 
  WebSocketMessage, 
  WebSocketMessageType,
  WebSocketMessagePriority,
  WebSocketMessageHandler,
  WebSocketError,
  MessageDeliveryConfirmation
} from '../types/websocket';

/**
 * WebSocket Service
 * 
 * Manages WebSocket connections, authentication, and message delivery
 */
class WebSocketService {
  private server: WebSocket.Server | null = null;
  private connections: Map<string, WebSocketConnection> = new Map();
  private messageHandlers: Map<WebSocketMessageType, WebSocketMessageHandler[]> = new Map();
  private httpServer: http.Server | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageQueueProcessor: NodeJS.Timeout | null = null;

  /**
   * Initializes the WebSocket server
   * @param server Optional HTTP server to attach to
   */
  public async initialize(server?: http.Server): Promise<void> {
    try {
      // If server is provided, use it, otherwise create a new one
      if (server) {
        this.httpServer = server;
        this.server = new WebSocket.Server({
          server,
          path: config.websocket.path,
          maxPayload: 5 * 1024 * 1024, // 5MB max payload
        });
      } else {
        this.server = new WebSocket.Server({
          port: config.websocket.port,
          path: config.websocket.path,
          maxPayload: 5 * 1024 * 1024, // 5MB max payload
        });
      }

      // Setup event handlers
      this.setupServerEventHandlers();
      
      // Start heartbeat and message queue processors
      this.startHeartbeatProcessor();
      this.startMessageQueueProcessor();

      logger.info(`WebSocket server initialized on ${config.websocket.path}`);
      if (!server) {
        logger.info(`WebSocket server listening on port ${config.websocket.port}`);
      }
    } catch (error) {
      logger.error(`Failed to initialize WebSocket server: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Shuts down the WebSocket server
   */
  public async shutdown(): Promise<void> {
    try {
      // Clear intervals
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      
      if (this.messageQueueProcessor) {
        clearInterval(this.messageQueueProcessor);
      }

      // Close all connections
      for (const connection of this.connections.values()) {
        this.closeConnection(connection.id, 1000, 'Server shutting down');
      }

      // Close server
      if (this.server) {
        await new Promise<void>((resolve) => {
          if (this.server) {
            this.server.close(() => {
              resolve();
            });
          } else {
            resolve();
          }
        });
      }

      // Close HTTP server if we created it
      if (this.httpServer && !this.httpServer.listening) {
        await new Promise<void>((resolve) => {
          if (this.httpServer) {
            this.httpServer.close(() => {
              resolve();
            });
          } else {
            resolve();
          }
        });
      }

      logger.info('WebSocket server shut down');
    } catch (error) {
      logger.error(`Error shutting down WebSocket server: ${(error as Error).message}`);
    }
  }

  /**
   * Registers a message handler for a specific message type
   * @param type The message type to handle
   * @param handler The handler function
   */
  public registerMessageHandler(type: WebSocketMessageType, handler: WebSocketMessageHandler): void {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  /**
   * Gets all connections for a session
   * @param sessionId The session ID
   * @returns Array of connections
   */
  public getSessionConnections(sessionId: string): WebSocketConnection[] {
    return Array.from(this.connections.values())
      .filter(conn => conn.sessionId === sessionId && conn.status === WebSocketConnectionStatus.OPEN);
  }

  /**
   * Gets a connection by ID
   * @param connectionId The connection ID
   * @returns The connection or null if not found
   */
  public getConnection(connectionId: string): WebSocketConnection | null {
    return this.connections.get(connectionId) || null;
  }

  /**
   * Gets connections for a user
   * @param userId The user ID
   * @returns Array of connections
   */
  public getUserConnections(userId: string): WebSocketConnection[] {
    return Array.from(this.connections.values())
      .filter(conn => conn.userId === userId && conn.status === WebSocketConnectionStatus.OPEN);
  }

  /**
   * Authenticates a connection
   * @param connectionId The connection ID
   * @param userId The user ID
   * @param sessionId Optional session ID
   * @returns True if authentication succeeded
   */
  public authenticateConnection(connectionId: string, userId: string, sessionId?: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    // Validate session access if provided
    if (sessionId) {
      const hasAccess = sessionService.validateSessionAccess(sessionId, userId);
      if (!hasAccess) {
        return false;
      }
    }

    // Update connection
    connection.userId = userId;
    connection.sessionId = sessionId;
    connection.isAuthenticated = true;
    connection.lastActiveAt = new Date();

    logger.info(`WebSocket connection ${connectionId} authenticated for user ${userId}${sessionId ? ` and session ${sessionId}` : ''}`);
    return true;
  }

  /**
   * Sends a message to a specific connection
   * @param connectionId The connection ID
   * @param message The message to send
   * @returns Promise with delivery confirmation
   */
  public async sendMessage(connectionId: string, message: WebSocketMessage): Promise<MessageDeliveryConfirmation> {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.status !== WebSocketConnectionStatus.OPEN) {
      return {
        messageId: message.id,
        delivered: false,
        timestamp: new Date().toISOString(),
        error: 'Connection not available',
      };
    }

    return this.deliverMessage(connection, message);
  }

  /**
   * Sends a message to all connections for a session
   * @param sessionId The session ID
   * @param message The message to send
   * @returns Array of delivery confirmations
   */
  public async broadcastToSession(sessionId: string, message: WebSocketMessage): Promise<MessageDeliveryConfirmation[]> {
    const connections = this.getSessionConnections(sessionId);
    const results: MessageDeliveryConfirmation[] = [];

    for (const connection of connections) {
      results.push(await this.deliverMessage(connection, message));
    }

    return results;
  }

  /**
   * Sends a message to all connections for a user
   * @param userId The user ID
   * @param message The message to send
   * @returns Array of delivery confirmations
   */
  public async broadcastToUser(userId: string, message: WebSocketMessage): Promise<MessageDeliveryConfirmation[]> {
    const connections = this.getUserConnections(userId);
    const results: MessageDeliveryConfirmation[] = [];

    for (const connection of connections) {
      results.push(await this.deliverMessage(connection, message));
    }

    return results;
  }

  /**
   * Broadcasts a message to all authenticated connections
   * @param message The message to send
   * @returns Number of connections message was sent to
   */
  public async broadcastToAll(message: WebSocketMessage): Promise<number> {
    let count = 0;

    for (const connection of this.connections.values()) {
      if (connection.status === WebSocketConnectionStatus.OPEN && connection.isAuthenticated) {
        await this.deliverMessage(connection, message);
        count++;
      }
    }

    return count;
  }

  /**
   * Creates a structured message
   * @param type Message type
   * @param payload Message payload
   * @param options Additional options
   * @returns Formatted message
   */
  public createMessage<T>(
    type: WebSocketMessageType,
    payload: T,
    options: {
      sessionId?: string;
      priority?: WebSocketMessagePriority;
    } = {}
  ): WebSocketMessage {
    return {
      id: uuidv4(),
      type,
      timestamp: new Date().toISOString(),
      priority: options.priority || WebSocketMessagePriority.NORMAL,
      sessionId: options.sessionId,
      payload
    } as WebSocketMessage;
  }

  /**
   * Closes a connection
   * @param connectionId The connection ID
   * @param code The close code
   * @param reason The close reason
   */
  public closeConnection(connectionId: string, code: number = 1000, reason: string = 'Normal closure'): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    try {
      // Update status
      connection.status = WebSocketConnectionStatus.CLOSING;
      
      // Close socket
      connection.socket.close(code, reason);
      
      // Remove from connections map
      this.connections.delete(connectionId);
      
      logger.info(`Closed WebSocket connection ${connectionId}: ${reason}`);
    } catch (error) {
      logger.error(`Error closing WebSocket connection ${connectionId}: ${(error as Error).message}`);
      // Force delete
      this.connections.delete(connectionId);
    }
  }

  /**
   * Returns current connection stats
   */
  public getStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    openConnections: number;
    sessionConnections: Map<string, number>;
  } {
    const stats = {
      totalConnections: this.connections.size,
      authenticatedConnections: 0,
      openConnections: 0,
      sessionConnections: new Map<string, number>(),
    };

    for (const connection of this.connections.values()) {
      if (connection.isAuthenticated) {
        stats.authenticatedConnections++;
      }
      
      if (connection.status === WebSocketConnectionStatus.OPEN) {
        stats.openConnections++;
      }
      
      if (connection.sessionId) {
        const count = stats.sessionConnections.get(connection.sessionId) || 0;
        stats.sessionConnections.set(connection.sessionId, count + 1);
      }
    }

    return stats;
  }

  /**
   * Delivers a message to a connection, handling queueing if needed
   * @param connection The connection
   * @param message The message
   * @returns Delivery confirmation
   * @private
   */
  private async deliverMessage(
    connection: WebSocketConnection,
    message: WebSocketMessage
  ): Promise<MessageDeliveryConfirmation> {
    try {
      if (connection.status !== WebSocketConnectionStatus.OPEN) {
        return {
          messageId: message.id,
          delivered: false,
          timestamp: new Date().toISOString(),
          error: `Connection is ${connection.status}`,
        };
      }

      // Try to send the message
      const messageStr = JSON.stringify(message);
      
      return new Promise((resolve) => {
        connection.socket.send(messageStr, (error) => {
          if (error) {
            // Queue message for retry if it's important
            if (message.priority !== WebSocketMessagePriority.LOW) {
              if (connection.pendingMessages.length < config.websocket.messageQueueSize) {
                connection.pendingMessages.push({
                  message,
                  attempts: 1,
                  maxAttempts: config.websocket.messageRetryAttempts,
                });
              }
            }
            
            resolve({
              messageId: message.id,
              delivered: false,
              timestamp: new Date().toISOString(),
              error: error.message,
            });
          } else {
            connection.lastActiveAt = new Date();
            resolve({
              messageId: message.id,
              delivered: true,
              timestamp: new Date().toISOString(),
            });
          }
        });
      });
    } catch (error) {
      return {
        messageId: message.id,
        delivered: false,
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      };
    }
  }

  /**
   * Sets up event handlers for the WebSocket server
   * @private
   */
  private setupServerEventHandlers(): void {
    if (!this.server) {
      return;
    }

    this.server.on('connection', (socket, request) => {
      this.handleNewConnection(socket, request);
    });

    this.server.on('error', (error) => {
      logger.error(`WebSocket server error: ${error.message}`);
    });

    this.server.on('close', () => {
      logger.info('WebSocket server closed');
    });
  }

  /**
   * Handles a new WebSocket connection
   * @param socket The WebSocket connection
   * @param request The HTTP request
   * @private
   */
  private handleNewConnection(socket: WebSocket, request: http.IncomingMessage): void {
    // Check if we're at max connections
    if (this.connections.size >= config.websocket.maxConnections) {
      socket.close(1013, 'Maximum number of connections reached');
      return;
    }

    // Create a new connection object
    const connectionId = uuidv4();
    const connection: WebSocketConnection = {
      id: connectionId,
      socket,
      status: WebSocketConnectionStatus.OPEN,
      connectedAt: new Date(),
      lastActiveAt: new Date(),
      isAuthenticated: false,
      pendingMessages: [],
    };

    // Store connection
    this.connections.set(connectionId, connection);

    // Set up socket event handlers
    this.setupSocketEventHandlers(connection);

    logger.info(`New WebSocket connection ${connectionId} from ${request.socket.remoteAddress}`);

    // Set authentication timeout - client must authenticate within 30 seconds
    setTimeout(() => {
      const conn = this.connections.get(connectionId);
      if (conn && !conn.isAuthenticated) {
        this.closeConnection(connectionId, 1008, 'Authentication timeout');
      }
    }, 30000); // 30 seconds
  }

  /**
   * Sets up event handlers for a WebSocket connection
   * @param connection The connection
   * @private
   */
  private setupSocketEventHandlers(connection: WebSocketConnection): void {
    connection.socket.on('message', (data) => {
      this.handleIncomingMessage(connection, data);
    });

    connection.socket.on('close', (code, reason) => {
      logger.info(`WebSocket connection ${connection.id} closed: ${code} ${reason}`);
      connection.status = WebSocketConnectionStatus.CLOSED;
      this.connections.delete(connection.id);
    });

    connection.socket.on('error', (error) => {
      logger.error(`WebSocket connection ${connection.id} error: ${error.message}`);
      this.closeConnection(connection.id, 1011, 'Internal server error');
    });

    connection.socket.on('pong', () => {
      connection.lastActiveAt = new Date();
    });
  }

  /**
   * Handles an incoming message from a client
   * @param connection The connection
   * @param data The message data
   * @private
   */
  private async handleIncomingMessage(connection: WebSocketConnection, data: WebSocket.Data): Promise<void> {
    try {
      // Parse message
      const messageStr = data.toString();
      const message = JSON.parse(messageStr) as WebSocketMessage;

      // Update activity
      connection.lastActiveAt = new Date();

      // Authentication handling
      if (message.type === WebSocketMessageType.AUTHENTICATION) {
        // Handle authentication in a special way
        await this.handleAuthenticationMessage(connection, message);
        return;
      }

      // For all other message types, connection must be authenticated
      if (!connection.isAuthenticated) {
        this.sendErrorMessage(connection, 'UNAUTHORIZED', 'Not authenticated');
        return;
      }

      // Find handlers for this message type
      const handlers = this.messageHandlers.get(message.type) || [];
      if (handlers.length === 0) {
        logger.warn(`No handlers registered for message type: ${message.type}`);
        return;
      }

      // Process message with all registered handlers
      for (const handler of handlers) {
        try {
          await handler(message, connection);
        } catch (error) {
          logger.error(`Error in message handler for ${message.type}: ${(error as Error).message}`);
        }
      }
    } catch (error) {
      logger.error(`Error handling WebSocket message: ${(error as Error).message}`);
      this.sendErrorMessage(connection, 'BAD_REQUEST', 'Invalid message format');
    }
  }

  /**
   * Handles an authentication message
   * @param connection The connection
   * @param message The message
   * @private
   */
  private async handleAuthenticationMessage(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    try {
      const payload = message.payload as { token: string; sessionId?: string };
      
      // In a real app, this would verify the token
      // For now, we'll assume the token is a user ID for simplicity
      const userId = payload.token;
      
      // Authenticate the connection
      const success = this.authenticateConnection(connection.id, userId, payload.sessionId);
      
      if (!success) {
        this.sendErrorMessage(connection, 'AUTHENTICATION_FAILED', 'Invalid credentials or session access denied');
        this.closeConnection(connection.id, 1008, 'Authentication failed');
      } else {
        // Send authentication success response
        const authSuccessMessage = this.createMessage(
          WebSocketMessageType.AUTHENTICATION,
          { authenticated: true },
          { priority: WebSocketMessagePriority.HIGH }
        );
        
        await this.deliverMessage(connection, authSuccessMessage);
      }
    } catch (error) {
      logger.error(`Authentication error: ${(error as Error).message}`);
      this.sendErrorMessage(connection, 'AUTHENTICATION_ERROR', 'Authentication process failed');
      this.closeConnection(connection.id, 1011, 'Authentication error');
    }
  }

  /**
   * Sends an error message to a connection
   * @param connection The connection
   * @param code The error code
   * @param message The error message
   * @private
   */
  private sendErrorMessage(connection: WebSocketConnection, code: string, message: string): void {
    const errorMessage = this.createMessage(
      WebSocketMessageType.CONNECTION_ERROR,
      { code, message },
      { priority: WebSocketMessagePriority.HIGH }
    );
    
    this.deliverMessage(connection, errorMessage).catch(err => {
      logger.error(`Failed to send error message: ${err.message}`);
    });
  }

  /**
   * Starts the heartbeat processor
   * @private
   */
  private startHeartbeatProcessor(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      
      for (const connection of this.connections.values()) {
        if (connection.status !== WebSocketConnectionStatus.OPEN) {
          continue;
        }
        
        // Check if connection is stale
        const idleTime = now.getTime() - connection.lastActiveAt.getTime();
        if (idleTime > config.websocket.heartbeatTimeout) {
          logger.warn(`WebSocket connection ${connection.id} timed out after ${idleTime}ms`);
          this.closeConnection(connection.id, 1001, 'Connection timed out');
          continue;
        }
        
        // Send heartbeat ping
        try {
          connection.socket.ping();
          
          // Also send a heartbeat message that clients can respond to
          const heartbeatMessage = this.createMessage(
            WebSocketMessageType.HEARTBEAT,
            { timestamp: now.toISOString() },
            { priority: WebSocketMessagePriority.LOW }
          );
          
          this.deliverMessage(connection, heartbeatMessage).catch(() => {
            // Ignore delivery errors for heartbeats
          });
        } catch (error) {
          // If ping fails, close the connection
          this.closeConnection(connection.id, 1011, 'Heartbeat failed');
        }
      }
    }, config.websocket.heartbeatInterval);
    
    // Prevent keeping the process alive
    this.heartbeatInterval.unref();
  }

  /**
   * Starts the message queue processor
   * @private
   */
  private startMessageQueueProcessor(): void {
    this.messageQueueProcessor = setInterval(() => {
      for (const connection of this.connections.values()) {
        if (connection.status !== WebSocketConnectionStatus.OPEN || connection.pendingMessages.length === 0) {
          continue;
        }

        // Process pending messages
        const now = new Date().getTime();
        const pendingMessages = [...connection.pendingMessages];
        connection.pendingMessages = [];
        
        for (const item of pendingMessages) {
          // Check if message has expired
          const messageTime = new Date(item.message.timestamp).getTime();
          if (now - messageTime > config.websocket.messageExpiryTime) {
            logger.debug(`Message ${item.message.id} expired, dropping`);
            continue;
          }
          
          // Check if we've exceeded retry attempts
          if (item.attempts >= item.maxAttempts) {
            logger.warn(`Message ${item.message.id} exceeded retry attempts, dropping`);
            continue;
          }
          
          // Try to deliver the message again
          this.deliverMessage(connection, item.message)
            .then(result => {
              if (!result.delivered) {
                // If delivery failed, increment attempts and requeue
                connection.pendingMessages.push({
                  message: item.message,
                  attempts: item.attempts + 1,
                  maxAttempts: item.maxAttempts,
                });
              }
            })
            .catch(() => {
              // If delivery throws, increment attempts and requeue
              connection.pendingMessages.push({
                message: item.message,
                attempts: item.attempts + 1,
                maxAttempts: item.maxAttempts,
              });
            });
        }
      }
    }, 5000); // Process every 5 seconds
    
    // Prevent keeping the process alive
    this.messageQueueProcessor.unref();
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;