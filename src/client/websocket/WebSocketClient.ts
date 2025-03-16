import { 
  WebSocketMessage, 
  WebSocketMessageType, 
  WebSocketMessagePriority 
} from '../../server/types/websocket';

/**
 * WebSocket Client Configuration
 */
export interface WebSocketClientConfig {
  url: string;
  token: string;
  sessionId?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

/**
 * WebSocket connection states
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  AUTHENTICATING = 'authenticating',
  AUTHENTICATED = 'authenticated',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
}

/**
 * WebSocket message handler function
 */
export type MessageHandler = (message: WebSocketMessage) => void;

/**
 * WebSocket connection event handler function
 */
export type ConnectionEventHandler = (event: ConnectionEvent) => void;

/**
 * WebSocket connection event
 */
export interface ConnectionEvent {
  type: 'connected' | 'disconnected' | 'authenticated' | 'reconnecting' | 'failed';
  timestamp: Date;
  details?: any;
}

/**
 * WebSocket Client
 * 
 * Manages WebSocket connections, reconnection, authentication,
 * message handling, and fallback to REST API
 */
export class WebSocketClient {
  private socket: WebSocket | null = null;
  private config: WebSocketClientConfig;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private messageHandlers: Map<WebSocketMessageType, MessageHandler[]> = new Map();
  private connectionEventHandlers: ConnectionEventHandler[] = [];
  private lastHeartbeatResponse: number = 0;
  private authPromise: Promise<boolean> | null = null;
  private authResolve: ((value: boolean) => void) | null = null;
  private restBaseUrl: string;

  /**
   * Creates a new WebSocket client
   * @param config Client configuration
   */
  constructor(config: WebSocketClientConfig) {
    this.config = {
      autoReconnect: true,
      reconnectInterval: 1000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      debug: false,
      ...config,
    };

    // Extract base URL for REST fallback
    const wsUrl = new URL(this.config.url);
    const protocol = wsUrl.protocol === 'wss:' ? 'https:' : 'http:';
    this.restBaseUrl = `${protocol}//${wsUrl.host}/ws-api`;
  }

  /**
   * Connects to the WebSocket server
   * @returns Promise that resolves when connected and authenticated
   */
  public async connect(): Promise<boolean> {
    if (this.state === ConnectionState.CONNECTED || 
        this.state === ConnectionState.AUTHENTICATED ||
        this.state === ConnectionState.CONNECTING ||
        this.state === ConnectionState.AUTHENTICATING) {
      return true;
    }

    this.setState(ConnectionState.CONNECTING);

    try {
      return await new Promise<boolean>((resolve, reject) => {
        this.socket = new WebSocket(this.config.url);

        this.socket.onopen = () => {
          this.log('WebSocket connection established');
          this.setState(ConnectionState.CONNECTED);
          this.resetReconnectAttempts();
          this.authenticate().then(resolve).catch(reject);
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.socket.onclose = (event) => {
          this.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
          this.setState(ConnectionState.DISCONNECTED);
          this.clearTimers();
          this.handleReconnect();
          resolve(false);
        };

        this.socket.onerror = (error) => {
          this.log('WebSocket error:', error);
          this.setState(ConnectionState.FAILED);
          reject(new Error('WebSocket connection failed'));
        };
      });
    } catch (error) {
      this.log('Connection error:', error);
      this.setState(ConnectionState.FAILED);
      this.handleReconnect();
      return false;
    }
  }

  /**
   * Disconnects from the WebSocket server
   */
  public disconnect(): void {
    this.clearTimers();
    
    if (this.socket && 
        (this.state === ConnectionState.CONNECTED || 
         this.state === ConnectionState.AUTHENTICATED)) {
      this.socket.close(1000, 'Client disconnected');
    }
    
    this.socket = null;
    this.setState(ConnectionState.DISCONNECTED);
  }

  /**
   * Sends a message to the server
   * @param type Message type
   * @param payload Message payload
   * @param fallbackToRest Use REST API if WebSocket is not available
   * @returns Promise that resolves when the message is sent
   */
  public async send<T>(
    type: WebSocketMessageType, 
    payload: T, 
    fallbackToRest: boolean = true
  ): Promise<boolean> {
    // Create a message object
    const message: Partial<WebSocketMessage> = {
      id: this.generateId(),
      type,
      timestamp: new Date().toISOString(),
      priority: WebSocketMessagePriority.NORMAL,
      sessionId: this.config.sessionId,
      payload,
    };

    // Try WebSocket first
    if (this.isConnected()) {
      try {
        this.socket!.send(JSON.stringify(message));
        return true;
      } catch (error) {
        this.log('Error sending WebSocket message:', error);
        
        // If REST fallback is disabled, just fail
        if (!fallbackToRest) {
          return false;
        }
      }
    } else if (!fallbackToRest) {
      return false;
    }

    // Fall back to REST API
    try {
      const response = await fetch(`${this.restBaseUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': this.config.token,
        },
        body: JSON.stringify({
          type,
          payload,
          sessionId: this.config.sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`REST API error: ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error) {
      this.log('Error sending REST fallback message:', error);
      return false;
    }
  }

  /**
   * Registers a message handler
   * @param type Message type to handle
   * @param handler Handler function
   */
  public on(type: WebSocketMessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type) || [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  /**
   * Removes a message handler
   * @param type Message type
   * @param handler Handler function to remove
   */
  public off(type: WebSocketMessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type) || [];
    const index = handlers.indexOf(handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
      this.messageHandlers.set(type, handlers);
    }
  }

  /**
   * Registers a connection event handler
   * @param handler Event handler function
   */
  public onConnectionEvent(handler: ConnectionEventHandler): void {
    this.connectionEventHandlers.push(handler);
  }

  /**
   * Removes a connection event handler
   * @param handler Event handler function to remove
   */
  public offConnectionEvent(handler: ConnectionEventHandler): void {
    const index = this.connectionEventHandlers.indexOf(handler);
    
    if (index !== -1) {
      this.connectionEventHandlers.splice(index, 1);
    }
  }

  /**
   * Checks if the client is connected and authenticated
   * @returns True if connected and authenticated
   */
  public isConnected(): boolean {
    return this.socket !== null && 
           this.state === ConnectionState.AUTHENTICATED && 
           this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Authenticates with the WebSocket server
   * @returns Promise that resolves when authenticated
   * @private
   */
  private async authenticate(): Promise<boolean> {
    if (this.state === ConnectionState.AUTHENTICATED) {
      return true;
    }

    if (this.authPromise) {
      return this.authPromise;
    }

    this.setState(ConnectionState.AUTHENTICATING);

    this.authPromise = new Promise<boolean>((resolve) => {
      this.authResolve = resolve;

      // Register a one-time authentication handler
      const authHandler = (message: WebSocketMessage) => {
        if (message.type === WebSocketMessageType.AUTHENTICATION) {
          const success = (message.payload as any)?.authenticated === true;
          
          if (success) {
            this.setState(ConnectionState.AUTHENTICATED);
            this.startHeartbeat();
            
            // Remove the one-time handler
            this.off(WebSocketMessageType.AUTHENTICATION, authHandler);
            
            if (this.authResolve) {
              this.authResolve(true);
              this.authResolve = null;
            }
          } else {
            this.log('Authentication failed:', message.payload);
            this.setState(ConnectionState.FAILED);
            
            if (this.authResolve) {
              this.authResolve(false);
              this.authResolve = null;
            }
          }
        }
      };

      // Register temporary auth handler
      this.on(WebSocketMessageType.AUTHENTICATION, authHandler);

      // Send auth message
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          const authMessage = {
            id: this.generateId(),
            type: WebSocketMessageType.AUTHENTICATION,
            timestamp: new Date().toISOString(),
            priority: WebSocketMessagePriority.HIGH,
            payload: {
              token: this.config.token,
              sessionId: this.config.sessionId,
            },
          };

          this.socket.send(JSON.stringify(authMessage));
        } catch (error) {
          this.log('Error sending authentication message:', error);
          this.setState(ConnectionState.FAILED);
          
          if (this.authResolve) {
            this.authResolve(false);
            this.authResolve = null;
          }
        }
      } else {
        this.log('Socket not ready for authentication');
        this.setState(ConnectionState.FAILED);
        
        if (this.authResolve) {
          this.authResolve(false);
          this.authResolve = null;
        }
      }

      // Set authentication timeout
      setTimeout(() => {
        if (this.state === ConnectionState.AUTHENTICATING && this.authResolve) {
          this.log('Authentication timeout');
          this.setState(ConnectionState.FAILED);
          this.authResolve(false);
          this.authResolve = null;
        }
      }, 10000); // 10 second timeout
    });

    return this.authPromise;
  }

  /**
   * Handles incoming WebSocket messages
   * @param data Message data
   * @private
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as WebSocketMessage;
      
      // Handle heartbeat response
      if (message.type === WebSocketMessageType.HEARTBEAT_ACK) {
        this.lastHeartbeatResponse = Date.now();
        return;
      }
      
      // Find handlers for this message type
      const handlers = this.messageHandlers.get(message.type) || [];
      
      // Call all handlers
      for (const handler of handlers) {
        try {
          handler(message);
        } catch (error) {
          this.log('Error in message handler:', error);
        }
      }
    } catch (error) {
      this.log('Error parsing message:', error, data);
    }
  }

  /**
   * Handles reconnecting to the WebSocket server
   * @private
   */
  private handleReconnect(): void {
    if (!this.config.autoReconnect || 
        this.state === ConnectionState.CONNECTING || 
        this.state === ConnectionState.RECONNECTING) {
      return;
    }

    this.reconnectAttempts++;
    
    if (this.config.maxReconnectAttempts && 
        this.reconnectAttempts > this.config.maxReconnectAttempts) {
      this.log(`Maximum reconnect attempts (${this.config.maxReconnectAttempts}) reached`);
      this.setState(ConnectionState.FAILED);
      return;
    }

    this.setState(ConnectionState.RECONNECTING);
    
    // Calculate exponential backoff delay
    const delay = Math.min(
      30000, // max 30 seconds
      this.config.reconnectInterval! * Math.pow(1.5, this.reconnectAttempts - 1)
    );
    
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch(() => {
        // Error already logged in connect()
      });
    }, delay);
  }

  /**
   * Starts the heartbeat process
   * @private
   */
  private startHeartbeat(): void {
    this.clearHeartbeatTimer();
    
    this.heartbeatTimer = window.setInterval(() => {
      if (!this.isConnected()) {
        this.clearHeartbeatTimer();
        return;
      }

      // Check if we've missed too many heartbeats
      const now = Date.now();
      if (this.lastHeartbeatResponse && now - this.lastHeartbeatResponse > this.config.heartbeatInterval! * 3) {
        this.log('Heartbeat timeout, reconnecting');
        this.disconnect();
        this.handleReconnect();
        return;
      }

      // Send heartbeat
      this.send(
        WebSocketMessageType.HEARTBEAT,
        { timestamp: new Date().toISOString() },
        false
      ).catch(() => {
        // Error already logged in send()
      });
    }, this.config.heartbeatInterval);
  }

  /**
   * Clears the heartbeat timer
   * @private
   */
  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Clears all timers
   * @private
   */
  private clearTimers(): void {
    this.clearHeartbeatTimer();
    
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Resets reconnect attempts counter
   * @private
   */
  private resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  /**
   * Updates the connection state and notifies handlers
   * @param state New state
   * @private
   */
  private setState(state: ConnectionState): void {
    const oldState = this.state;
    this.state = state;
    
    // Notify connection event handlers
    if (oldState !== state) {
      this.log(`Connection state changed: ${oldState} -> ${state}`);
      
      let eventType: ConnectionEvent['type'];
      
      switch (state) {
        case ConnectionState.CONNECTED:
          eventType = 'connected';
          break;
        case ConnectionState.AUTHENTICATED:
          eventType = 'authenticated';
          break;
        case ConnectionState.DISCONNECTED:
          eventType = 'disconnected';
          break;
        case ConnectionState.RECONNECTING:
          eventType = 'reconnecting';
          break;
        case ConnectionState.FAILED:
          eventType = 'failed';
          break;
        default:
          return; // Don't notify for other states
      }
      
      const event: ConnectionEvent = {
        type: eventType,
        timestamp: new Date(),
        details: { 
          previousState: oldState, 
          reconnectAttempts: this.reconnectAttempts 
        },
      };
      
      for (const handler of this.connectionEventHandlers) {
        try {
          handler(event);
        } catch (error) {
          this.log('Error in connection event handler:', error);
        }
      }
    }
  }

  /**
   * Generates a unique message ID
   * @returns Unique ID
   * @private
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  /**
   * Logs debug messages if enabled
   * @param message Message to log
   * @param args Additional arguments
   * @private
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(`[WebSocketClient] ${message}`, ...args);
    }
  }
}

/**
 * Creates a WebSocket client factory
 * @param config Base configuration
 * @returns Factory function
 */
export function createWebSocketClient(config: Partial<WebSocketClientConfig>) {
  return (options: Partial<WebSocketClientConfig> = {}) => {
    return new WebSocketClient({
      ...config,
      ...options,
    });
  };
}

// Export singleton factory 
export default createWebSocketClient;