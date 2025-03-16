import websocketService from '../services/websocketService';
import sessionService from '../services/session';
import { WebSocketMessageType, HeartbeatMessage, WebSocketMessage, OperationStatusMessage } from '../types/websocket';
import logger from '../utils/logger';

/**
 * WebSocket Message Handlers
 * 
 * Registers handlers for different types of WebSocket messages
 */
class WebSocketHandlers {
  /**
   * Initializes WebSocket message handlers
   */
  public async initialize(): Promise<void> {
    // Register heartbeat handler
    websocketService.registerMessageHandler(
      WebSocketMessageType.HEARTBEAT,
      this.handleHeartbeat.bind(this)
    );
    
    // Register heartbeat acknowledgement handler
    websocketService.registerMessageHandler(
      WebSocketMessageType.HEARTBEAT_ACK,
      this.handleHeartbeatAck.bind(this)
    );
    
    // Register handlers for operation status messages
    websocketService.registerMessageHandler(
      WebSocketMessageType.OPERATION_PROGRESS,
      this.handleOperationProgress.bind(this)
    );
    
    // Register handlers for custom messages
    websocketService.registerMessageHandler(
      WebSocketMessageType.CUSTOM,
      this.handleCustomMessage.bind(this)
    );
    
    logger.info('WebSocket message handlers initialized');
  }
  
  /**
   * Handles heartbeat messages
   * @param message The heartbeat message
   * @param connection The connection
   */
  private async handleHeartbeat(message: WebSocketMessage, connection: any): Promise<void> {
    // Send heartbeat acknowledgement
    const heartbeatAck = websocketService.createMessage(
      WebSocketMessageType.HEARTBEAT_ACK,
      {
        receivedTimestamp: (message as HeartbeatMessage).timestamp,
        responseTimestamp: new Date().toISOString(),
      }
    );
    
    await websocketService.sendMessage(connection.id, heartbeatAck);
    
    // If there's a session ID, update session activity
    if (connection.sessionId) {
      sessionService.updateSessionActivity(connection.sessionId);
    }
  }
  
  /**
   * Handles heartbeat acknowledgement messages
   * @param message The heartbeat acknowledgement message
   * @param connection The connection
   */
  private async handleHeartbeatAck(message: WebSocketMessage, connection: any): Promise<void> {
    // Just update connection activity timestamp
    connection.lastActiveAt = new Date();
  }
  
  /**
   * Handles operation progress messages
   * @param message The operation progress message
   * @param connection The connection
   */
  private async handleOperationProgress(message: WebSocketMessage, connection: any): Promise<void> {
    const opMessage = message as OperationStatusMessage;
    const sessionId = connection.sessionId || message.sessionId;
    
    if (!sessionId) {
      logger.warn(`Received operation progress message without session ID: ${message.id}`);
      return;
    }
    
    // Broadcast progress to all connections in the same session
    const progressMessage = websocketService.createMessage(
      WebSocketMessageType.OPERATION_PROGRESS,
      opMessage.payload,
      { sessionId }
    );
    
    await websocketService.broadcastToSession(sessionId, progressMessage);
  }
  
  /**
   * Handles custom messages
   * @param message The custom message
   * @param connection The connection
   */
  private async handleCustomMessage(message: WebSocketMessage, connection: any): Promise<void> {
    logger.debug(`Received custom message of ID ${message.id} from connection ${connection.id}`);
    // Custom message handling based on payload type
    // This is a placeholder for application-specific logic
  }
}

// Export singleton instance
export const websocketHandlers = new WebSocketHandlers();
export default websocketHandlers;