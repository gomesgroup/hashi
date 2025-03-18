import { EventEmitter } from 'events';

export enum WebSocketMessageType {
  // Connection Management
  CONNECTION_ESTABLISHED = 'CONNECTION_ESTABLISHED',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  CONNECTION_CLOSED = 'CONNECTION_CLOSED',
  
  // Authentication
  AUTH_REQUEST = 'AUTH_REQUEST',
  AUTH_SUCCESS = 'AUTH_SUCCESS',
  AUTH_FAILURE = 'AUTH_FAILURE',
  
  // Session Management
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_UPDATED = 'SESSION_UPDATED',
  SESSION_CLOSED = 'SESSION_CLOSED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // ChimeraX Events
  CHIMERAX_STARTED = 'CHIMERAX_STARTED',
  CHIMERAX_ERROR = 'CHIMERAX_ERROR',
  CHIMERAX_TERMINATED = 'CHIMERAX_TERMINATED',
  
  // Commands/Operations
  COMMAND_SENT = 'COMMAND_SENT',
  COMMAND_RESULT = 'COMMAND_RESULT',
  OPERATION_STARTED = 'OPERATION_STARTED',
  OPERATION_PROGRESS = 'OPERATION_PROGRESS',
  OPERATION_COMPLETED = 'OPERATION_COMPLETED',
  OPERATION_FAILED = 'OPERATION_FAILED',
  
  // Structure Events
  STRUCTURE_LOADED = 'STRUCTURE_LOADED',
  STRUCTURE_MODIFIED = 'STRUCTURE_MODIFIED',
  STRUCTURE_REMOVED = 'STRUCTURE_REMOVED',
  
  // Notification Events
  NOTIFICATION = 'NOTIFICATION',
  ERROR = 'ERROR',
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  sessionId?: string;
  timestamp: number;
  payload?: any;
}

export interface WebSocketServiceOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  debug?: boolean;
}

export class WebSocketService extends EventEmitter {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts: number = 0;
  private isConnecting: boolean = false;
  private messageQueue: WebSocketMessage[] = [];
  private debug: boolean;
  private sessionId: string | null = null;
  private authToken: string | null = null;

  constructor(options: WebSocketServiceOptions = {}) {
    super();
    
    this.url = options.url || 
      `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    this.reconnectInterval = options.reconnectInterval || 2000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.debug = options.debug || false;
    
    // Bind methods
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.send = this.send.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.processQueue = this.processQueue.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.setSessionId = this.setSessionId.bind(this);
    this.setAuthToken = this.setAuthToken.bind(this);
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): Promise<void> {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      this.log('WebSocket already connected or connecting');
      return Promise.resolve();
    }
    
    this.isConnecting = true;
    
    return new Promise((resolve, reject) => {
      try {
        this.log(`Connecting to WebSocket server at ${this.url}`);
        
        // Build URL with query parameters if sessionId or authToken is available
        let wsUrl = this.url;
        const queryParams = [];
        
        if (this.sessionId) {
          queryParams.push(`sessionId=${encodeURIComponent(this.sessionId)}`);
        }
        
        if (this.authToken) {
          queryParams.push(`token=${encodeURIComponent(this.authToken)}`);
        }
        
        if (queryParams.length > 0) {
          wsUrl += `?${queryParams.join('&')}`;
        }
        
        this.socket = new WebSocket(wsUrl);
        
        // Setup event handlers
        this.socket.onopen = (event) => {
          this.handleOpen(event);
          resolve();
        };
        
        this.socket.onmessage = this.handleMessage;
        this.socket.onerror = (event) => {
          this.handleError(event);
          reject(new Error('WebSocket connection error'));
        };
        
        this.socket.onclose = this.handleClose;
      } catch (error) {
        this.isConnecting = false;
        this.log('Error creating WebSocket connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(code: number = 1000, reason: string = 'Client disconnected'): void {
    if (!this.socket) {
      return;
    }
    
    this.log(`Disconnecting from WebSocket server: ${reason}`);
    
    try {
      this.socket.close(code, reason);
    } catch (error) {
      this.log('Error closing WebSocket connection:', error);
    }
    
    this.socket = null;
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    
    // Clear the message queue
    this.messageQueue = [];
    
    // Emit disconnected event
    this.emit(WebSocketMessageType.CONNECTION_CLOSED, { reason });
  }

  /**
   * Send a message to the WebSocket server
   */
  public send(type: WebSocketMessageType, payload?: any): void {
    const message: WebSocketMessage = {
      type,
      sessionId: this.sessionId || undefined,
      timestamp: Date.now(),
      payload,
    };
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      this.log('Message sent:', message);
      
      // Emit event for sent message
      this.emit('messageSent', message);
    } else {
      this.log('WebSocket not connected, queueing message:', message);
      this.messageQueue.push(message);
      
      // Try to connect if not already connecting
      if (!this.isConnecting && (!this.socket || this.socket.readyState === WebSocket.CLOSED)) {
        this.connect().catch(error => {
          this.log('Failed to connect for queued message:', error);
        });
      }
    }
  }

  /**
   * Set the session ID for the WebSocket connection
   */
  public setSessionId(sessionId: string | null): void {
    this.sessionId = sessionId;
    
    // If already connected, reconnect to update the session ID
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.log('Session ID changed, reconnecting to update');
      this.disconnect(1000, 'Session ID changed');
      this.connect().catch(error => {
        this.log('Failed to reconnect after session change:', error);
      });
    }
  }

  /**
   * Set the authentication token for the WebSocket connection
   */
  public setAuthToken(token: string | null): void {
    this.authToken = token;
    
    // If already connected, reconnect to update the auth token
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.log('Auth token changed, reconnecting to update');
      this.disconnect(1000, 'Auth token changed');
      this.connect().catch(error => {
        this.log('Failed to reconnect after auth token change:', error);
      });
    }
  }

  /**
   * Subscribe to a specific message type
   */
  public subscribe(type: WebSocketMessageType, callback: (data: any) => void): () => void {
    this.on(type, callback);
    
    // Return an unsubscribe function
    return () => {
      this.off(type, callback);
    };
  }

  /**
   * Subscribe to all messages
   */
  public subscribeAll(callback: (message: WebSocketMessage) => void): () => void {
    this.on('message', callback);
    
    // Return an unsubscribe function
    return () => {
      this.off('message', callback);
    };
  }

  /**
   * Get the current connection state
   */
  public get state(): string {
    if (!this.socket) {
      return 'CLOSED';
    }
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'OPEN';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Check if the WebSocket is connected
   */
  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  // Private methods

  /**
   * Handle WebSocket connection open
   */
  private handleOpen(event: Event): void {
    this.log('WebSocket connection established');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Process any queued messages
    this.processQueue();
    
    // Emit connected event
    this.emit(WebSocketMessageType.CONNECTION_ESTABLISHED, {
      timestamp: Date.now(),
    });
    
    // If we have a session ID, send an auth request
    if (this.authToken) {
      this.send(WebSocketMessageType.AUTH_REQUEST, { token: this.authToken });
    }
  }

  /**
   * Handle WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      this.log('Message received:', message);
      
      // Emit general message event
      this.emit('message', message);
      
      // Emit specific event for the message type
      this.emit(message.type, message.payload);
      
    } catch (error) {
      this.log('Error parsing WebSocket message:', error);
      this.emit('error', { error: 'Failed to parse WebSocket message', originalMessage: event.data });
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(event: Event): void {
    this.log('WebSocket error:', event);
    this.isConnecting = false;
    
    // Emit error event
    this.emit(WebSocketMessageType.CONNECTION_ERROR, {
      timestamp: Date.now(),
      error: 'WebSocket connection error',
    });
  }

  /**
   * Handle WebSocket connection close
   */
  private handleClose(event: CloseEvent): void {
    this.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    this.isConnecting = false;
    
    // Emit closed event
    this.emit(WebSocketMessageType.CONNECTION_CLOSED, {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      timestamp: Date.now(),
    });
    
    // Attempt to reconnect if the close wasn't intentional
    if (event.code !== 1000 && event.code !== 1001) {
      this.reconnect();
    }
  }

  /**
   * Attempt to reconnect to the WebSocket server
   */
  private reconnect(): void {
    if (this.isConnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.log(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached`);
      }
      return;
    }
    
    this.reconnectAttempts += 1;
    const delay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
    
    this.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        this.log(`Reconnect attempt ${this.reconnectAttempts} failed:`, error);
      });
    }, delay);
  }

  /**
   * Process the message queue
   */
  private processQueue(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || this.messageQueue.length === 0) {
      return;
    }
    
    this.log(`Processing ${this.messageQueue.length} queued messages`);
    
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    
    queue.forEach(message => {
      this.send(message.type, message.payload);
    });
  }

  /**
   * Log messages in debug mode
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[WebSocketService]', ...args);
    }
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService({
  debug: process.env.NODE_ENV !== 'production',
});

export default webSocketService;