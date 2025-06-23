/**
 * Data Source Types for AGV1 React Components
 * 
 * This file contains types specific to data sources, WebSocket connections,
 * and real-time data handling.
 */

/**
 * Data source types supported by the system
 */
export type DataSourceType = 'websocket' | 'rest' | 'static' | 'custom' | 'dummy';

/**
 * Connection status
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'connecting';

/**
 * WebSocket (STOMP) configuration
 */
export interface WebSocketConfig {
  /** WebSocket URL */
  url: string;
  
  /** STOMP headers */
  headers?: Record<string, string>;
  
  /** Reconnect options */
  reconnect?: {
    enabled: boolean;
    delay: number;
    maxDelay: number;
    maxAttempts: number;
  };
  
  /** Heartbeat configuration */
  heartbeat?: {
    incoming: number;
    outgoing: number;
  };
  
  /** Debug mode */
  debug?: boolean;
}

/**
 * WebSocket data source configuration
 */
export interface WebSocketDataSourceConfig {
  /** WebSocket URL */
  url: string;
  
  /** Protocol type */
  protocol?: 'stomp' | 'raw';
  
  /** Topic to subscribe to (alias for listenerTopic) */
  topic?: string;
  
  /** Topic to subscribe to */
  listenerTopic?: string;
  
  /** Request message to send on connect */
  requestMessage?: string;
  
  /** Topic to send requests to */
  requestTopic?: string;
  
  /** End of snapshot token */
  snapshotEndToken?: string;
  
  /** Key column for updates */
  keyColumn?: string;
  
  /** Message rate in milliseconds */
  messageRate?: number;
  
  /** Message rate limit (messages per second) */
  messageRateLimit?: number;
  
  /** Snapshot timeout in milliseconds */
  snapshotTimeoutMs?: number;
  
  /** Auto-start on application load */
  autoStart?: boolean;
  
  /** Reconnect options */
  reconnect?: {
    enabled: boolean;
    delay?: number;
    maxDelay?: number;
    maxRetries?: number;
    maxAttempts?: number;
  };
  
  /** STOMP headers */
  headers?: Record<string, string>;
  
  /** Heartbeat configuration */
  heartbeat?: {
    incoming: number;
    outgoing: number;
  };
  
  /** Debug mode */
  debug?: boolean;
  
  /** Transform function for incoming messages */
  transformer?: (message: any) => any;
  
  /** Inferred fields from data */
  fields?: DataField[];
  
  /** Generated column definitions */
  columnDefs?: any[];
}

/**
 * REST API configuration
 */
export interface RestApiConfig {
  /** Base URL */
  baseUrl: string;
  
  /** Endpoints */
  endpoints: {
    getData?: string;
    subscribe?: string;
    unsubscribe?: string;
  };
  
  /** Request headers */
  headers?: Record<string, string>;
  
  /** Authentication */
  auth?: {
    type: 'bearer' | 'basic' | 'apikey' | 'custom';
    credentials?: any;
  };
  
  /** Polling configuration for real-time updates */
  polling?: {
    enabled: boolean;
    interval: number;
  };
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Retry configuration */
  retry?: {
    attempts: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };
}

/**
 * REST API data source configuration
 */
export interface RestApiDataSourceConfig extends RestApiConfig {
  /** Additional REST data source specific config */
  cacheStrategy?: 'none' | 'memory' | 'localStorage';
  cacheTTL?: number;
}

/**
 * Generic data source configuration
 */
export interface DataSourceConfig {
  id: string;
  name: string;
  type: DataSourceType;
  config: WebSocketDataSourceConfig | RestApiDataSourceConfig | StaticDataSourceConfig | any;
  autoConnect?: boolean;
  status?: 'active' | 'inactive' | 'error' | 'connecting';
  metadata?: Record<string, any>;
}

/**
 * Static data source configuration
 */
export interface StaticDataSourceConfig {
  /** Static data array */
  data: any[];
  
  /** Whether to simulate real-time updates */
  simulateUpdates?: {
    enabled: boolean;
    interval: number;
    updatePercentage: number;
  };
}

/**
 * Field definition for data mapping
 */
export interface DataField {
  /** Field name/path in the data */
  name: string;
  
  /** Display label */
  label?: string;
  
  /** Data type */
  type: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'array';
  
  /** Path to the field (for nested data) */
  path?: string;
  
  /** Whether this field is nullable */
  nullable?: boolean;
  
  /** Sample value */
  sample?: any;
  
  /** Field metadata */
  metadata?: Record<string, any>;
}

/**
 * Data transformation rule
 */
export interface TransformRule {
  /** Source field */
  source: string;
  
  /** Target field */
  target: string;
  
  /** Transformation type */
  type: 'rename' | 'convert' | 'calculate' | 'custom';
  
  /** Transformation function (for custom type) */
  transform?: (value: any, row: any) => any;
  
  /** Options for built-in transformations */
  options?: any;
}

/**
 * Data schema for validation
 */
export interface DataSchema {
  /** Schema version */
  version: string;
  
  /** Field definitions */
  fields: DataField[];
  
  /** Primary key field(s) */
  primaryKey?: string | string[];
  
  /** Required fields */
  required?: string[];
  
  /** Validation rules */
  validation?: Array<{
    field: string;
    rule: string;
    params?: any;
    message?: string;
  }>;
}

/**
 * Real-time update types
 */
export type UpdateType = 'insert' | 'update' | 'delete' | 'snapshot' | 'clear';

/**
 * Real-time data update message
 */
export interface DataUpdate {
  /** Update type */
  type: UpdateType;
  
  /** Timestamp */
  timestamp: string;
  
  /** Data payload */
  data: any;
  
  /** Row key (for updates/deletes) */
  key?: any;
  
  /** Metadata */
  metadata?: {
    source?: string;
    sequence?: number;
    [key: string]: any;
  };
}

/**
 * Data subscription options
 */
export interface SubscriptionOptions {
  /** Filter to apply to incoming data */
  filter?: (data: any) => boolean;
  
  /** Fields to include */
  fields?: string[];
  
  /** Maximum buffer size */
  bufferSize?: number;
  
  /** Throttle updates (milliseconds) */
  throttle?: number;
  
  /** Handle duplicates */
  duplicateStrategy?: 'keep-first' | 'keep-last' | 'keep-all';
}

/**
 * Data source statistics
 */
export interface DataSourceStats {
  /** Connection statistics */
  connection: {
    status: ConnectionStatus;
    connectedAt?: string;
    disconnectedAt?: string;
    reconnectCount: number;
    lastError?: string;
  };
  
  /** Data statistics */
  data: {
    totalRows: number;
    insertCount: number;
    updateCount: number;
    deleteCount: number;
    lastUpdateTime?: string;
  };
  
  /** Performance statistics */
  performance: {
    messagesPerSecond: number;
    averageLatency: number;
    peakLatency: number;
    droppedMessages: number;
  };
}

/**
 * Data source event types
 */
export type DataSourceEventType = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'data-received'
  | 'snapshot-start'
  | 'snapshot-end'
  | 'reconnecting'
  | 'subscription-added'
  | 'subscription-removed';

/**
 * Data source event
 */
export interface DataSourceEvent {
  type: DataSourceEventType;
  source: string;
  timestamp: string;
  data?: any;
  error?: Error;
}

/**
 * Column mapping for data display
 */
export interface ColumnMapping {
  /** Source field name */
  sourceField: string;
  
  /** Target column ID */
  targetColumn: string;
  
  /** Value transformer */
  transformer?: (value: any, row: any) => any;
  
  /** Default value if field is missing */
  defaultValue?: any;
}

/**
 * Data query parameters
 */
export interface DataQuery {
  /** Filters to apply */
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  
  /** Sort options */
  sort?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  
  /** Pagination */
  pagination?: {
    page: number;
    pageSize: number;
  };
  
  /** Fields to select */
  select?: string[];
  
  /** Aggregation options */
  aggregation?: {
    groupBy?: string[];
    metrics?: Array<{
      field: string;
      function: 'sum' | 'avg' | 'min' | 'max' | 'count';
      alias?: string;
    }>;
  };
}

/**
 * Data source capability flags
 */
export interface DataSourceCapabilities {
  /** Supports real-time updates */
  realtime: boolean;
  
  /** Supports filtering */
  filtering: boolean;
  
  /** Supports sorting */
  sorting: boolean;
  
  /** Supports pagination */
  pagination: boolean;
  
  /** Supports aggregation */
  aggregation: boolean;
  
  /** Supports data export */
  export: boolean;
  
  /** Supports bidirectional communication */
  bidirectional: boolean;
  
  /** Custom capabilities */
  custom?: Record<string, boolean>;
}

/**
 * Complete data source definition
 */
export interface DataSourceDefinition {
  /** Unique identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Data source type */
  type: DataSourceType;
  
  /** Type-specific configuration */
  config: WebSocketDataSourceConfig | RestApiConfig | StaticDataSourceConfig | any;
  
  /** Data schema */
  schema?: DataSchema;
  
  /** Column mappings */
  columnMappings?: ColumnMapping[];
  
  /** Capabilities */
  capabilities: DataSourceCapabilities;
  
  /** Metadata */
  metadata?: {
    description?: string;
    tags?: string[];
    owner?: string;
    created?: string;
    modified?: string;
    [key: string]: any;
  };
}