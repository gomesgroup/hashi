import WebSocket from 'ws';

/**
 * WebSocket connection status
 */
export enum WebSocketConnectionStatus {
  CONNECTING = 'connecting',
  OPEN = 'open',
  CLOSING = 'closing',
  CLOSED = 'closed',
}

/**
 * WebSocket message types
 */
export enum WebSocketMessageType {
  // Connection management
  AUTHENTICATION = 'authentication',
  HEARTBEAT = 'heartbeat',
  HEARTBEAT_ACK = 'heartbeat_ack',
  CONNECTION_ERROR = 'connection_error',
  
  // Structure events
  STRUCTURE_CHANGE = 'structure_change',
  SELECTION_UPDATE = 'selection_update',
  ATOM_MODIFICATION = 'atom_modification',
  BOND_MODIFICATION = 'bond_modification',
  
  // Operation status events
  OPERATION_STARTED = 'operation_started',
  OPERATION_PROGRESS = 'operation_progress',
  OPERATION_COMPLETED = 'operation_completed',
  OPERATION_FAILED = 'operation_failed',
  
  // ChimeraX process events
  CHIMERAX_STARTED = 'chimerax_started',
  CHIMERAX_ERROR = 'chimerax_error',
  CHIMERAX_TERMINATED = 'chimerax_terminated',
  
  // Notification events
  NOTIFICATION = 'notification',
  
  // Other
  CUSTOM = 'custom',
}

/**
 * WebSocket message priority levels
 */
export enum WebSocketMessagePriority {
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low',
}

/**
 * Base interface for WebSocket messages
 */
export interface WebSocketMessage {
  id: string;
  type: WebSocketMessageType;
  timestamp: string;
  priority: WebSocketMessagePriority;
  sessionId?: string;
}

/**
 * Authentication message
 */
export interface AuthenticationMessage extends WebSocketMessage {
  type: WebSocketMessageType.AUTHENTICATION;
  payload: {
    token: string;
    sessionId?: string;
  };
}

/**
 * Heartbeat message
 */
export interface HeartbeatMessage extends WebSocketMessage {
  type: WebSocketMessageType.HEARTBEAT | WebSocketMessageType.HEARTBEAT_ACK;
}

/**
 * Structure change message
 */
export interface StructureChangeMessage extends WebSocketMessage {
  type: WebSocketMessageType.STRUCTURE_CHANGE;
  payload: {
    modelId: string;
    operation: 'load' | 'modify' | 'close';
    details?: any;
  };
}

/**
 * Selection update message
 */
export interface SelectionUpdateMessage extends WebSocketMessage {
  type: WebSocketMessageType.SELECTION_UPDATE;
  payload: {
    selectionName: string;
    selectionType: string;
    count: number;
    operation: 'create' | 'update' | 'delete';
  };
}

/**
 * Operation status message
 */
export interface OperationStatusMessage extends WebSocketMessage {
  type: WebSocketMessageType.OPERATION_STARTED | 
        WebSocketMessageType.OPERATION_PROGRESS |
        WebSocketMessageType.OPERATION_COMPLETED |
        WebSocketMessageType.OPERATION_FAILED;
  payload: {
    operationId: string;
    operationType: string;
    progress?: number;
    details?: any;
    error?: string;
  };
}

/**
 * Notification message
 */
export interface NotificationMessage extends WebSocketMessage {
  type: WebSocketMessageType.NOTIFICATION;
  payload: {
    level: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    autoClose?: boolean;
    duration?: number;
  };
}

/**
 * Connection error message
 */
export interface ConnectionErrorMessage extends WebSocketMessage {
  type: WebSocketMessageType.CONNECTION_ERROR;
  payload: {
    code: string;
    message: string;
  };
}

/**
 * Custom message
 */
export interface CustomMessage extends WebSocketMessage {
  type: WebSocketMessageType.CUSTOM;
  payload: any;
}

/**
 * WebSocket connection with metadata
 */
export interface WebSocketConnection {
  id: string;
  socket: WebSocket;
  userId?: string;
  sessionId?: string;
  status: WebSocketConnectionStatus;
  connectedAt: Date;
  lastActiveAt: Date;
  isAuthenticated: boolean;
  pendingMessages: Array<{
    message: WebSocketMessage;
    attempts: number;
    maxAttempts: number;
  }>;
}

/**
 * Delivery confirmation for messages
 */
export interface MessageDeliveryConfirmation {
  messageId: string;
  delivered: boolean;
  timestamp: string;
  error?: string;
}

/**
 * WebSocket error with code and details
 */
export interface WebSocketError extends Error {
  code: string;
  details?: any;
}

/**
 * Type for message handlers
 */
export type WebSocketMessageHandler = (
  message: WebSocketMessage,
  connection: WebSocketConnection
) => Promise<void>;