import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import websocketService from '../services/websocketService';
import sessionService from '../services/session';
import { WebSocketMessageType, WebSocketMessagePriority } from '../types/websocket';
import logger from '../utils/logger';

/**
 * WebSocket Controller
 * 
 * Provides HTTP fallback endpoints for WebSocket functionality
 */
class WebSocketController {
  /**
   * Gets WebSocket server status
   * @param req Request
   * @param res Response
   */
  public getStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = websocketService.getStats();
      
      // Convert the Map to an object for JSON serialization
      const sessionConnections: Record<string, number> = {};
      for (const [sessionId, count] of stats.sessionConnections.entries()) {
        sessionConnections[sessionId] = count;
      }
      
      res.status(200).json({
        status: 'success',
        data: {
          totalConnections: stats.totalConnections,
          authenticatedConnections: stats.authenticatedConnections,
          openConnections: stats.openConnections,
          sessionConnections,
        },
      });
    } catch (error) {
      logger.error(`Error getting WebSocket status: ${(error as Error).message}`);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get WebSocket server status',
      });
    }
  };

  /**
   * Sends a message using REST (WebSocket fallback)
   * @param req Request
   * @param res Response
   */
  public sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, type, payload, priority } = req.body;
      
      if (!type || !payload) {
        res.status(400).json({
          status: 'error',
          message: 'Message type and payload are required',
        });
        return;
      }
      
      // Validate message type
      if (!Object.values(WebSocketMessageType).includes(type)) {
        res.status(400).json({
          status: 'error',
          message: `Invalid message type: ${type}`,
        });
        return;
      }
      
      // If sessionId is provided, check if session exists
      if (sessionId) {
        const session = sessionService.getSession(sessionId);
        if (!session) {
          res.status(404).json({
            status: 'error',
            message: `Session ${sessionId} not found`,
          });
          return;
        }
        
        // Check if user has access to this session
        const hasAccess = sessionService.validateSessionAccess(sessionId, req.userId);
        if (!hasAccess) {
          res.status(403).json({
            status: 'error',
            message: 'You do not have access to this session',
          });
          return;
        }
      }
      
      // Create the message
      const message = websocketService.createMessage(
        type as WebSocketMessageType,
        payload,
        {
          sessionId,
          priority: priority as WebSocketMessagePriority || WebSocketMessagePriority.NORMAL,
        }
      );
      
      let result;
      
      // Send to all session connections if sessionId is provided
      if (sessionId) {
        const results = await websocketService.broadcastToSession(sessionId, message);
        
        result = {
          messageId: message.id,
          deliveredCount: results.filter(r => r.delivered).length,
          timestamp: new Date().toISOString(),
        };
      } else {
        // Send to all user connections
        const results = await websocketService.broadcastToUser(req.userId, message);
        
        result = {
          messageId: message.id,
          deliveredCount: results.filter(r => r.delivered).length,
          timestamp: new Date().toISOString(),
        };
      }
      
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error(`Error sending message: ${(error as Error).message}`);
      res.status(500).json({
        status: 'error',
        message: 'Failed to send message',
      });
    }
  };

  /**
   * Broadcasts a message to all session connections
   * @param req Request
   * @param res Response
   */
  public broadcastToSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, type, payload, priority } = req.body;
      
      if (!sessionId || !type || !payload) {
        res.status(400).json({
          status: 'error',
          message: 'Session ID, message type, and payload are required',
        });
        return;
      }
      
      // Validate message type
      if (!Object.values(WebSocketMessageType).includes(type)) {
        res.status(400).json({
          status: 'error',
          message: `Invalid message type: ${type}`,
        });
        return;
      }
      
      // Check if session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        res.status(404).json({
          status: 'error',
          message: `Session ${sessionId} not found`,
        });
        return;
      }
      
      // Check if user has access to this session
      const hasAccess = sessionService.validateSessionAccess(sessionId, req.userId);
      if (!hasAccess) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have access to this session',
        });
        return;
      }
      
      // Create the message
      const message = websocketService.createMessage(
        type as WebSocketMessageType,
        payload,
        {
          sessionId,
          priority: priority as WebSocketMessagePriority || WebSocketMessagePriority.NORMAL,
        }
      );
      
      // Broadcast to all session connections
      const results = await websocketService.broadcastToSession(sessionId, message);
      
      res.status(200).json({
        status: 'success',
        data: {
          messageId: message.id,
          deliveredCount: results.filter(r => r.delivered).length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error(`Error broadcasting message: ${(error as Error).message}`);
      res.status(500).json({
        status: 'error',
        message: 'Failed to broadcast message',
      });
    }
  };

  /**
   * Gets active WebSocket connections for a session
   * @param req Request
   * @param res Response
   */
  public getSessionConnections = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      
      // Check if session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        res.status(404).json({
          status: 'error',
          message: `Session ${sessionId} not found`,
        });
        return;
      }
      
      // Check if user has access to this session
      const hasAccess = sessionService.validateSessionAccess(sessionId, req.userId);
      if (!hasAccess) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have access to this session',
        });
        return;
      }
      
      // Get connections for this session
      const connections = websocketService.getSessionConnections(sessionId);
      
      // Return connection info without sensitive internal details
      const connectionInfo = connections.map(conn => ({
        id: conn.id,
        userId: conn.userId,
        connectedAt: conn.connectedAt,
        lastActiveAt: conn.lastActiveAt,
      }));
      
      res.status(200).json({
        status: 'success',
        data: connectionInfo,
      });
    } catch (error) {
      logger.error(`Error getting session connections: ${(error as Error).message}`);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get session connections',
      });
    }
  };

  /**
   * Sends an operation status notification
   * @param req Request
   * @param res Response
   */
  public notifyOperationStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        sessionId, 
        operationId, 
        operationType, 
        status,
        progress,
        details,
        error
      } = req.body;
      
      if (!sessionId || !operationId || !operationType || !status) {
        res.status(400).json({
          status: 'error',
          message: 'Session ID, operation ID, operation type, and status are required',
        });
        return;
      }
      
      // Check if session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        res.status(404).json({
          status: 'error',
          message: `Session ${sessionId} not found`,
        });
        return;
      }
      
      // Check if user has access to this session
      const hasAccess = sessionService.validateSessionAccess(sessionId, req.userId);
      if (!hasAccess) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have access to this session',
        });
        return;
      }
      
      // Determine message type based on status
      let messageType: WebSocketMessageType;
      switch (status) {
        case 'started':
          messageType = WebSocketMessageType.OPERATION_STARTED;
          break;
        case 'progress':
          messageType = WebSocketMessageType.OPERATION_PROGRESS;
          break;
        case 'completed':
          messageType = WebSocketMessageType.OPERATION_COMPLETED;
          break;
        case 'failed':
          messageType = WebSocketMessageType.OPERATION_FAILED;
          break;
        default:
          res.status(400).json({
            status: 'error',
            message: `Invalid operation status: ${status}`,
          });
          return;
      }
      
      // Create message payload
      const payload = {
        operationId,
        operationType,
        ...(progress !== undefined && { progress }),
        ...(details && { details }),
        ...(error && { error }),
      };
      
      // Create the message
      const message = websocketService.createMessage(
        messageType,
        payload,
        {
          sessionId,
          priority: WebSocketMessagePriority.HIGH,
        }
      );
      
      // Broadcast to all session connections
      const results = await websocketService.broadcastToSession(sessionId, message);
      
      res.status(200).json({
        status: 'success',
        data: {
          messageId: message.id,
          deliveredCount: results.filter(r => r.delivered).length,
        },
      });
    } catch (error) {
      logger.error(`Error sending operation status notification: ${(error as Error).message}`);
      res.status(500).json({
        status: 'error',
        message: 'Failed to send operation status notification',
      });
    }
  };
}

export default new WebSocketController();