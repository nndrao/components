/**
 * Data Provider Types
 * 
 * Defines interfaces and types for the data provider system.
 */

/**
 * Data provider trigger message
 * Can be either a plain string or a JSON object
 */
export type DataProviderTrigger = string | Record<string, any>;

/**
 * Data provider message format
 */
export interface DataProviderMessage {
  /**
   * Message type/action
   */
  type: string;
  
  /**
   * Message payload
   */
  payload?: any;
  
  /**
   * Message metadata
   */
  metadata?: {
    timestamp?: number;
    source?: string;
    correlationId?: string;
    [key: string]: any;
  };
}

/**
 * Data provider configuration
 */
export interface DataProviderConfig {
  /**
   * Provider ID
   */
  id: string;
  
  /**
   * Provider name
   */
  name: string;
  
  /**
   * Provider type
   */
  type: DataProviderType;
  
  /**
   * Connection settings
   */
  connection: ConnectionConfig;
  
  /**
   * Transform settings
   */
  transform?: TransformConfig;
  
  /**
   * Retry settings
   */
  retry?: RetryConfig;
  
  /**
   * Provider-specific settings
   */
  settings?: Record<string, any>;
  
  /**
   * STOMP-specific: Data type to request
   */
  dataType?: 'positions' | 'trades';
  
  /**
   * STOMP-specific: Message rate (messages per second)
   */
  messageRate?: number;
  
  /**
   * STOMP-specific: Batch size for snapshot delivery
   */
  batchSize?: number;
  
  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Data provider types
 */
export enum DataProviderType {
  WebSocket = 'websocket',
  REST = 'rest',
  GraphQL = 'graphql',
  SSE = 'sse',
  Polling = 'polling',
  Static = 'static',
}

/**
 * Connection configuration
 */
export interface ConnectionConfig {
  /**
   * Connection URL/endpoint
   */
  url: string;
  
  /**
   * Authentication settings
   */
  auth?: AuthConfig;
  
  /**
   * Request headers
   */
  headers?: Record<string, string>;
  
  /**
   * Connection timeout in ms
   */
  timeout?: number;
  
  /**
   * Enable auto-reconnect
   */
  autoReconnect?: boolean;
  
  /**
   * Reconnect interval in ms
   */
  reconnectInterval?: number;
  
  /**
   * Maximum reconnect attempts
   */
  maxReconnectAttempts?: number;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /**
   * Auth type
   */
  type: 'none' | 'basic' | 'bearer' | 'apikey' | 'custom';
  
  /**
   * Auth credentials
   */
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    [key: string]: any;
  };
}

/**
 * Transform configuration
 */
export interface TransformConfig {
  /**
   * Input transform function
   */
  input?: string | ((data: any) => any);
  
  /**
   * Output transform function
   */
  output?: string | ((data: any) => any);
  
  /**
   * Message parser
   */
  parser?: 'json' | 'text' | 'custom';
  
  /**
   * Custom parser function
   */
  customParser?: (data: string) => any;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /**
   * Enable retry
   */
  enabled: boolean;
  
  /**
   * Max retry attempts
   */
  maxAttempts?: number;
  
  /**
   * Retry delay in ms
   */
  delay?: number;
  
  /**
   * Exponential backoff
   */
  exponentialBackoff?: boolean;
  
  /**
   * Max delay in ms
   */
  maxDelay?: number;
}

/**
 * Data provider state
 */
export interface DataProviderState {
  /**
   * Connection status
   */
  status: ConnectionStatus;
  
  /**
   * Last error
   */
  error?: Error | null;
  
  /**
   * Connection metadata
   */
  metadata?: {
    connectedAt?: number;
    disconnectedAt?: number;
    reconnectAttempts?: number;
    lastMessageAt?: number;
    messageCount?: number;
  };
}

/**
 * Connection status
 */
export enum ConnectionStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Reconnecting = 'reconnecting',
  Error = 'error',
}

/**
 * Data provider events
 */
export interface DataProviderEvents {
  /**
   * Connection established
   */
  connect: () => void;
  
  /**
   * Connection closed
   */
  disconnect: (reason?: string) => void;
  
  /**
   * Data received
   */
  data: (data: any) => void;
  
  /**
   * Error occurred
   */
  error: (error: Error) => void;
  
  /**
   * Status changed
   */
  statusChange: (status: ConnectionStatus) => void;
  
  /**
   * Message sent
   */
  messageSent: (message: DataProviderTrigger) => void;
  
  /**
   * Snapshot data received
   */
  snapshot: (data: any, metadata?: { isPartial: boolean; totalReceived: number }) => void;
  
  /**
   * Snapshot complete (STOMP-specific)
   */
  snapshotComplete?: (complete: boolean) => void;
}

/**
 * Data provider interface
 */
export interface DataProvider {
  /**
   * Provider ID
   */
  id: string;
  
  /**
   * Provider configuration
   */
  config: DataProviderConfig;
  
  /**
   * Provider state
   */
  state: DataProviderState;
  
  /**
   * Connect to data source
   */
  connect(): Promise<void>;
  
  /**
   * Disconnect from data source
   */
  disconnect(): Promise<void>;
  
  /**
   * Send message/trigger
   * Supports both plain string and JSON formats
   */
  send(trigger: DataProviderTrigger): Promise<void>;
  
  /**
   * Subscribe to events
   */
  on<K extends keyof DataProviderEvents>(
    event: K,
    handler: DataProviderEvents[K]
  ): void;
  
  /**
   * Unsubscribe from events
   */
  off<K extends keyof DataProviderEvents>(
    event: K,
    handler: DataProviderEvents[K]
  ): void;
  
  /**
   * Destroy provider
   */
  destroy(): void;
}

/**
 * Data provider factory
 */
export interface DataProviderFactory {
  /**
   * Create data provider
   */
  create(config: DataProviderConfig): DataProvider;
  
  /**
   * Check if provider type is supported
   */
  supports(type: DataProviderType): boolean;
}

/**
 * Data subscription
 */
export interface DataSubscription {
  /**
   * Subscription ID
   */
  id: string;
  
  /**
   * Filter function
   */
  filter?: (data: any) => boolean;
  
  /**
   * Transform function
   */
  transform?: (data: any) => any;
  
  /**
   * Handler function
   */
  handler: (data: any) => void;
  
  /**
   * Unsubscribe function
   */
  unsubscribe: () => void;
}

/**
 * Trigger format types
 */
export enum TriggerFormat {
  PlainText = 'plain',
  JSON = 'json',
  Custom = 'custom',
}

/**
 * Trigger configuration
 */
export interface TriggerConfig {
  /**
   * Trigger format
   */
  format: TriggerFormat;
  
  /**
   * JSON schema for validation (if format is JSON)
   */
  schema?: Record<string, any>;
  
  /**
   * Custom formatter function
   */
  formatter?: (data: any) => DataProviderTrigger;
  
  /**
   * Validation function
   */
  validator?: (trigger: DataProviderTrigger) => boolean;
}