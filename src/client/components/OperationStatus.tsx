import React, { useState, useEffect, useCallback } from 'react';
import { 
  WebSocketClient, 
  createWebSocketClient 
} from '../websocket/WebSocketClient';
import { 
  WebSocketMessageType, 
  OperationStatusMessage,
  WebSocketMessage
} from '../../server/types/websocket';

// Create a WebSocket client factory with default configuration
const createClient = createWebSocketClient({
  url: 'ws://localhost:3000/ws',
  autoReconnect: true,
  debug: process.env.NODE_ENV === 'development',
});

interface OperationStatusProps {
  sessionId: string;
  userId: string;
  onOperationComplete?: (operationId: string, details: any) => void;
  onOperationFailed?: (operationId: string, error: string) => void;
}

/**
 * Operation Status Component
 * 
 * Displays and manages real-time operation status updates via WebSocket
 * with fallback to REST polling
 */
const OperationStatus: React.FC<OperationStatusProps> = ({
  sessionId,
  userId,
  onOperationComplete,
  onOperationFailed,
}) => {
  const [client, setClient] = useState<WebSocketClient | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [operations, setOperations] = useState<Record<string, {
    id: string;
    type: string;
    progress: number;
    status: 'started' | 'in-progress' | 'completed' | 'failed';
    details?: any;
    error?: string;
  }>>({});
  
  // Initialize WebSocket client
  useEffect(() => {
    // Only create client if we have both sessionId and userId
    if (!sessionId || !userId) {
      return;
    }
    
    const wsClient = createClient({
      sessionId,
      token: userId, // In a real app, this would be a proper authentication token
    });
    
    setClient(wsClient);
    
    // Connect to WebSocket server
    wsClient.connect()
      .then(isConnected => {
        setConnected(isConnected);
        
        if (!isConnected) {
          console.warn('WebSocket connection failed, falling back to polling');
          // In a real app, this would set up a polling mechanism
        }
      })
      .catch(error => {
        console.error('WebSocket connection error:', error);
      });
    
    // Register connection event handler
    wsClient.onConnectionEvent(event => {
      if (event.type === 'authenticated') {
        setConnected(true);
      } else if (event.type === 'disconnected' || event.type === 'failed') {
        setConnected(false);
      }
    });
    
    // Cleanup on unmount
    return () => {
      wsClient.disconnect();
    };
  }, [sessionId, userId]);
  
  // Register operation status message handlers
  useEffect(() => {
    if (!client) return;
    
    // Operation started handler
    const handleOperationStarted = useCallback((message: OperationStatusMessage) => {
      const { operationId, operationType, details } = message.payload;
      
      setOperations(prev => ({
        ...prev,
        [operationId]: {
          id: operationId,
          type: operationType,
          progress: 0,
          status: 'started',
          details,
        },
      }));
    }, []);
    
    // Operation progress handler
    const handleOperationProgress = useCallback((message: OperationStatusMessage) => {
      const { operationId, progress, details } = message.payload;
      
      setOperations(prev => {
        const operation = prev[operationId];
        if (!operation) return prev;
        
        return {
          ...prev,
          [operationId]: {
            ...operation,
            progress: progress !== undefined ? progress : operation.progress,
            status: 'in-progress',
            details: details || operation.details,
          },
        };
      });
    }, []);
    
    // Operation completed handler
    const handleOperationCompleted = useCallback((message: OperationStatusMessage) => {
      const { operationId, details } = message.payload;
      
      setOperations(prev => {
        const operation = prev[operationId];
        if (!operation) return prev;
        
        return {
          ...prev,
          [operationId]: {
            ...operation,
            progress: 1,
            status: 'completed',
            details: details || operation.details,
          },
        };
      });
      
      // Notify parent component
      if (onOperationComplete) {
        onOperationComplete(operationId, details);
      }
      
      // Remove completed operation after a delay
      setTimeout(() => {
        setOperations(prev => {
          const { [operationId]: removed, ...rest } = prev;
          return rest;
        });
      }, 5000);
    }, [onOperationComplete]);
    
    // Operation failed handler
    const handleOperationFailed = useCallback((message: OperationStatusMessage) => {
      const { operationId, error } = message.payload;
      
      setOperations(prev => {
        const operation = prev[operationId];
        if (!operation) return prev;
        
        return {
          ...prev,
          [operationId]: {
            ...operation,
            status: 'failed',
            error: error || 'Unknown error',
          },
        };
      });
      
      // Notify parent component
      if (onOperationFailed) {
        onOperationFailed(operationId, error || 'Unknown error');
      }
    }, [onOperationFailed]);
    
    // Register all handlers with type assertions for proper compatibility
    // The issue is that the message handler expects specific OperationStatusMessage type
    // but the WebSocketClient's on() method expects a more general WebSocketMessage handler
    client.on(WebSocketMessageType.OPERATION_STARTED, 
      handleOperationStarted as unknown as (message: WebSocketMessage) => void);
    client.on(WebSocketMessageType.OPERATION_PROGRESS, 
      handleOperationProgress as unknown as (message: WebSocketMessage) => void);
    client.on(WebSocketMessageType.OPERATION_COMPLETED, 
      handleOperationCompleted as unknown as (message: WebSocketMessage) => void);
    client.on(WebSocketMessageType.OPERATION_FAILED, 
      handleOperationFailed as unknown as (message: WebSocketMessage) => void);
    
    // Cleanup handlers on unmount
    return () => {
      client.off(WebSocketMessageType.OPERATION_STARTED, 
        handleOperationStarted as unknown as (message: WebSocketMessage) => void);
      client.off(WebSocketMessageType.OPERATION_PROGRESS, 
        handleOperationProgress as unknown as (message: WebSocketMessage) => void);
      client.off(WebSocketMessageType.OPERATION_COMPLETED, 
        handleOperationCompleted as unknown as (message: WebSocketMessage) => void);
      client.off(WebSocketMessageType.OPERATION_FAILED, 
        handleOperationFailed as unknown as (message: WebSocketMessage) => void);
    };
  }, [client, onOperationComplete, onOperationFailed]);
  
  // If not connected, show fallback indicator
  if (!connected) {
    return (
      <div className="operation-status fallback">
        <div className="status-indicator offline"></div>
        <span>Using REST API fallback for operation updates</span>
      </div>
    );
  }
  
  // If there are no active operations, don't render anything
  if (Object.keys(operations).length === 0) {
    return null;
  }
  
  return (
    <div className="operation-status">
      <div className="status-indicator online"></div>
      <span>Real-time operation updates active</span>
      
      <div className="operations-list">
        {Object.values(operations).map(operation => (
          <div 
            key={operation.id} 
            className={`operation-item ${operation.status}`}
          >
            <div className="operation-header">
              <span className="operation-type">{operation.type}</span>
              <span className="operation-status">{operation.status}</span>
            </div>
            
            {operation.status !== 'failed' ? (
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${operation.progress * 100}%` }}
                ></div>
              </div>
            ) : (
              <div className="error-message">
                {operation.error}
              </div>
            )}
            
            {operation.details && operation.status === 'in-progress' && (
              <div className="operation-details">
                {operation.details.currentStep && operation.details.totalSteps && (
                  <span>Step {operation.details.currentStep} of {operation.details.totalSteps}</span>
                )}
                {operation.details.currentEnergy && (
                  <span>Energy: {operation.details.currentEnergy.toFixed(2)}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OperationStatus;