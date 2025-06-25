/**
 * Data Source Component Types
 * 
 * Type definitions for data source configuration UI components.
 */

import { DataProviderConfig, DataProviderType } from '../../providers/data/data-provider.types';

/**
 * Field information for inferred fields
 */
export interface FieldInfo {
  path: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array' | 'null';
  nullable: boolean;
  sample?: any;
  children?: FieldInfo[];
}

/**
 * Field node for tree display
 */
export interface FieldNode {
  path: string;
  name: string;
  type: FieldInfo['type'];
  nullable: boolean;
  sample?: any;
  children?: FieldNode[];
  depth: number;
  isExpanded?: boolean;
  isSelected?: boolean;
}

/**
 * Column definition
 */
export interface ColumnDefinition {
  field: string;
  headerName: string;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  formatter?: string;
  type?: string;
}

/**
 * Data source configuration extended with UI metadata
 */
export interface DataSourceConfig extends DataProviderConfig {
  /**
   * Display name
   */
  displayName: string;
  
  /**
   * Description
   */
  description?: string;
  
  /**
   * Auto-start on app load
   */
  autoStart?: boolean;
  
  /**
   * Inferred fields
   */
  inferredFields?: FieldInfo[];
  
  /**
   * Selected fields for columns
   */
  selectedFields?: string[];
  
  /**
   * Column definitions
   */
  columnDefs?: ColumnDefinition[];
  
  /**
   * Key column for updates
   */
  keyColumn?: string;
  
  /**
   * Created timestamp
   */
  createdAt?: number;
  
  /**
   * Updated timestamp
   */
  updatedAt?: number;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any[];
  fields?: FieldInfo[];
}

/**
 * Data source statistics
 */
export interface DataSourceStatistics {
  messagesReceived: number;
  messagesPerSecond: number;
  bytesReceived: number;
  lastMessageAt?: number;
  connectedAt?: number;
  disconnectedAt?: number;
  errors: number;
  lastError?: string;
}

/**
 * Field selector props
 */
export interface FieldSelectorProps {
  fields: FieldInfo[];
  selectedFields: Set<string>;
  onFieldToggle: (fieldPath: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

/**
 * Connection form values
 */
export interface ConnectionFormValues {
  type: DataProviderType;
  url: string;
  auth?: {
    type: 'none' | 'basic' | 'bearer' | 'apikey' | 'custom';
    credentials?: {
      username?: string;
      password?: string;
      token?: string;
      apiKey?: string;
    };
  };
  headers?: Record<string, string>;
  timeout?: number;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  // Provider-specific settings
  settings?: {
    // STOMP WebSocket
    dataType?: 'positions' | 'trades';
    messageRate?: number;
    batchSize?: number;
    listenerTopic?: string;
    triggerDestination?: string;
    triggerMessage?: string;
    triggerFormat?: 'text' | 'json';
    keyColumn?: string;
    // REST
    method?: string;
    pollingInterval?: number;
    bodyTemplate?: any;
    queryParams?: Record<string, string>;
    dataPath?: string;
    // Transform
    parser?: 'json' | 'text' | 'custom';
    inputTransform?: string;
    outputTransform?: string;
  };
}