# Data Provider Implementation Guide

## Overview

The Data Provider system enables components to consume data from various sources (WebSocket/STOMP, REST APIs, in-memory) through a unified interface. Multiple components can share the same data provider, reducing connections and ensuring data consistency.

### Key Features

- **Multiple Provider Types**: STOMP, REST, WebSocket, In-Memory
- **Shared Data Sources**: Multiple components can use the same provider
- **Automatic Field Inference**: Detect column types from data
- **Visual Configuration**: UI for managing providers and columns
- **Real-time Updates**: Streaming data support with STOMP
- **Type Safety**: Full TypeScript support

### Architecture Overview

```
┌─────────────────────┐
│  DataProvider       │
│  Context & Registry │
└──────────┬──────────┘
           │
    ┌──────┴──────┬─────────┬──────────┐
    │             │         │          │
┌───▼───┐   ┌────▼───┐ ┌───▼───┐ ┌────▼───┐
│ STOMP │   │  REST  │ │WebSocket│ │Memory │
│Provider│   │Provider│ │Provider │ │Provider│
└───┬───┘   └────┬───┘ └────┬───┘ └────┬───┘
    │            │           │          │
    └────────────┴───────────┴──────────┘
                        │
              ┌─────────┴──────────┐
              │                    │
         ┌────▼─────┐        ┌────▼─────┐
         │DataTable │        │  Chart   │
         │Component │        │Component │
         └──────────┘        └──────────┘
```

## Core Interfaces & Types

### Base Data Provider Interface

```typescript
// types/data-provider.types.ts

/**
 * Event types emitted by data providers
 */
export type DataEventType = 
  | 'snapshot-update'    // During initial data load
  | 'snapshot-complete'  // When initial load is done
  | 'update'            // Individual row updates
  | 'delete'            // Row deletion
  | 'error'             // Error occurred
  | 'status-change';    // Connection status changed

/**
 * Data event emitted by providers
 */
export interface DataEvent {
  type: DataEventType;
  data?: any[];
  key?: string | string[];
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * Listener interface for data events
 */
export interface DataListener {
  onData?: (event: DataEvent) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

/**
 * Connection status
 */
export type ConnectionStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'error' 
  | 'reconnecting';

/**
 * Field definition for schema
 */
export interface FieldDefinition {
  field: string;
  headerName: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  format?: string;           // e.g., 'email', 'url', 'currency'
  editable?: boolean;
  required?: boolean;
  defaultValue?: any;
  metadata?: Record<string, any>;
}

/**
 * Data schema definition
 */
export interface DataSchema {
  fields: FieldDefinition[];
  keyField?: string;
  version?: string;
  metadata?: Record<string, any>;
}

/**
 * Base configuration for all providers
 */
export interface DataProviderConfig {
  id: string;
  name: string;
  type: string;
  autoConnect?: boolean;
  schema?: DataSchema;
  columnDefs?: ColDef[];
  metadata?: Record<string, any>;
}

/**
 * Base data provider interface
 */
export interface DataProvider<TConfig extends DataProviderConfig = DataProviderConfig> {
  // Identity
  readonly id: string;
  readonly name: string;
  readonly type: string;
  
  // Status
  status: ConnectionStatus;
  
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Data subscription
  subscribe(listener: DataListener): () => void;
  
  // Data operations
  refresh?(): Promise<void>;
  getData?(): any[];
  
  // Schema management
  getSchema(): Promise<DataSchema>;
  inferFields(sampleData?: any[]): Promise<FieldDefinition[]>;
  
  // Column definitions for AG-Grid
  getColumnDefs(): ColDef[];
  setColumnDefs(columns: ColDef[]): void;
  
  // Configuration
  getConfig(): TConfig;
  updateConfig(config: Partial<TConfig>): void;
  
  // Cleanup
  dispose(): void;
}
```

### STOMP Provider Types

```typescript
// types/stomp-provider.types.ts

/**
 * STOMP-specific configuration
 */
export interface StompConfig extends DataProviderConfig {
  type: 'stomp';
  
  // Connection settings
  socketUrl: string;
  username?: string;
  password?: string;
  
  // Topics
  listenerTopic: string;
  triggerTopic: string;
  
  // Data handling
  snapshotEndIndicator: string;  // e.g., "Success"
  keyColumn: string;             // Row identifier field
  dataFormat: 'single' | 'array';
  
  // Connection options
  autoReconnect?: boolean;
  reconnectDelay?: number;
  heartbeatIncoming?: number;
  heartbeatOutgoing?: number;
  
  // Advanced options
  headers?: Record<string, string>;
  debug?: boolean;
}

/**
 * STOMP provider interface
 */
export interface StompDataProvider extends DataProvider<StompConfig> {
  type: 'stomp';
  
  // STOMP-specific methods
  sendTrigger(payload?: any): void;
  sendMessage(topic: string, body: any): void;
  isSnapshotComplete(): boolean;
  getSnapshotData(): Map<string, any>;
}
```

## STOMP Provider Implementation

### Complete STOMP Provider Class

```typescript
// providers/stomp-data-provider.ts
import { Client, IFrame, IMessage, StompSubscription } from '@stomp/stompjs';
import { 
  DataProvider, 
  DataListener, 
  DataEvent, 
  ConnectionStatus,
  DataSchema,
  FieldDefinition 
} from '@/types/data-provider';
import { StompConfig } from '@/types/stomp-provider';
import { ColDef } from 'ag-grid-community';

export class StompDataProvider implements StompDataProvider {
  readonly type = 'stomp';
  
  // State
  status: ConnectionStatus = 'disconnected';
  private config: StompConfig;
  private listeners = new Set<DataListener>();
  
  // STOMP client
  private client: Client | null = null;
  private subscription: StompSubscription | null = null;
  
  // Data management
  private snapshotData = new Map<string, any>();
  private isSnapshotDone = false;
  private schema: DataSchema | null = null;
  private columnDefs: ColDef[] = [];
  
  constructor(config: StompConfig) {
    this.config = { ...config };
    this.id = config.id;
    this.name = config.name;
    
    // Auto-connect if configured
    if (config.autoConnect) {
      this.connect().catch(console.error);
    }
  }
  
  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }
    
    this.updateStatus('connecting');
    
    try {
      this.client = new Client({
        brokerURL: this.config.socketUrl,
        connectHeaders: {
          login: this.config.username || '',
          passcode: this.config.password || '',
          ...this.config.headers
        },
        debug: this.config.debug ? (msg) => console.log(msg) : undefined,
        reconnectDelay: this.config.reconnectDelay || 5000,
        heartbeatIncoming: this.config.heartbeatIncoming || 4000,
        heartbeatOutgoing: this.config.heartbeatOutgoing || 4000,
        
        onConnect: this.handleConnect.bind(this),
        onStompError: this.handleStompError.bind(this),
        onDisconnect: this.handleDisconnect.bind(this),
        onWebSocketClose: this.handleWebSocketClose.bind(this)
      });
      
      this.client.activate();
    } catch (error) {
      this.updateStatus('error');
      this.notifyError(error as Error);
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    
    if (this.client) {
      await this.client.deactivate();
      this.client = null;
    }
    
    this.updateStatus('disconnected');
    this.resetData();
  }
  
  isConnected(): boolean {
    return this.status === 'connected';
  }
  
  // STOMP event handlers
  private handleConnect(frame: IFrame): void {
    console.log('STOMP connected:', frame);
    this.updateStatus('connected');
    
    // Subscribe to listener topic
    this.subscription = this.client!.subscribe(
      this.config.listenerTopic,
      this.handleMessage.bind(this),
      this.config.headers
    );
    
    // Send trigger to start data flow
    if (this.config.triggerTopic) {
      this.sendTrigger();
    }
  }
  
  private handleStompError(frame: IFrame): void {
    console.error('STOMP error:', frame);
    this.updateStatus('error');
    this.notifyError(new Error(frame.body));
  }
  
  private handleDisconnect(frame: IFrame): void {
    console.log('STOMP disconnected:', frame);
    this.updateStatus('disconnected');
  }
  
  private handleWebSocketClose(event: CloseEvent): void {
    if (this.config.autoReconnect && event.code !== 1000) {
      this.updateStatus('reconnecting');
    } else {
      this.updateStatus('disconnected');
    }
  }
  
  // Message handling
  private handleMessage(message: IMessage): void {
    try {
      const body = message.body;
      
      // Check for snapshot end indicator
      if (body.startsWith(this.config.snapshotEndIndicator)) {
        this.handleSnapshotComplete();
        return;
      }
      
      // Parse JSON data
      const data = JSON.parse(body);
      
      if (this.config.dataFormat === 'array' && Array.isArray(data)) {
        data.forEach(item => this.processDataItem(item));
      } else {
        this.processDataItem(data);
      }
      
    } catch (error) {
      console.error('Failed to process message:', error);
      this.notifyError(error as Error);
    }
  }
  
  private processDataItem(item: any): void {
    const key = item[this.config.keyColumn];
    
    if (!key) {
      console.warn('Data item missing key column:', this.config.keyColumn);
      return;
    }
    
    if (!this.isSnapshotDone) {
      // Building snapshot
      this.snapshotData.set(key, item);
      
      this.notifyListeners({
        type: 'snapshot-update',
        data: [item],
        key,
        metadata: { snapshotSize: this.snapshotData.size }
      });
    } else {
      // Update existing data
      const existing = this.snapshotData.get(key);
      const updated = existing ? { ...existing, ...item } : item;
      this.snapshotData.set(key, updated);
      
      this.notifyListeners({
        type: 'update',
        data: [updated],
        key
      });
    }
  }
  
  private handleSnapshotComplete(): void {
    this.isSnapshotDone = true;
    const allData = Array.from(this.snapshotData.values());
    
    this.notifyListeners({
      type: 'snapshot-complete',
      data: allData,
      metadata: { 
        totalRows: allData.length,
        timestamp: Date.now()
      }
    });
    
    // Infer schema if not provided
    if (!this.schema && allData.length > 0) {
      this.inferFields(allData.slice(0, 100))
        .then(fields => {
          this.schema = {
            fields,
            keyField: this.config.keyColumn
          };
        })
        .catch(console.error);
    }
  }
  
  // Public STOMP methods
  sendTrigger(payload?: any): void {
    if (!this.client || !this.client.connected) {
      throw new Error('Not connected to STOMP server');
    }
    
    const body = payload || { action: 'start', timestamp: Date.now() };
    
    this.client.publish({
      destination: this.config.triggerTopic,
      body: JSON.stringify(body),
      headers: this.config.headers
    });
  }
  
  sendMessage(topic: string, body: any): void {
    if (!this.client || !this.client.connected) {
      throw new Error('Not connected to STOMP server');
    }
    
    this.client.publish({
      destination: topic,
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers: this.config.headers
    });
  }
  
  isSnapshotComplete(): boolean {
    return this.isSnapshotDone;
  }
  
  getSnapshotData(): Map<string, any> {
    return new Map(this.snapshotData);
  }
  
  // Data provider interface implementation
  subscribe(listener: DataListener): () => void {
    this.listeners.add(listener);
    
    // Send current snapshot if available
    if (this.isSnapshotDone && this.snapshotData.size > 0) {
      listener.onData?.({
        type: 'snapshot-complete',
        data: Array.from(this.snapshotData.values())
      });
    }
    
    // Send current status
    listener.onStatusChange?.(this.status);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  async refresh(): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Provider not connected');
    }
    
    // Reset data and re-trigger
    this.resetData();
    this.sendTrigger();
  }
  
  getData(): any[] {
    return Array.from(this.snapshotData.values());
  }
  
  // Schema management
  async getSchema(): Promise<DataSchema> {
    if (this.schema) {
      return this.schema;
    }
    
    // Wait for some data if none available
    if (this.snapshotData.size === 0) {
      await new Promise<void>((resolve) => {
        const unsubscribe = this.subscribe({
          onData: (event) => {
            if (event.type === 'snapshot-update' && this.snapshotData.size >= 10) {
              unsubscribe();
              resolve();
            }
          }
        });
      });
    }
    
    const fields = await this.inferFields();
    this.schema = {
      fields,
      keyField: this.config.keyColumn
    };
    
    return this.schema;
  }
  
  async inferFields(sampleData?: any[]): Promise<FieldDefinition[]> {
    const data = sampleData || Array.from(this.snapshotData.values()).slice(0, 100);
    
    if (data.length === 0) {
      return [];
    }
    
    const fieldMap = new Map<string, FieldDefinition>();
    
    // Analyze all records to determine field types
    data.forEach(record => {
      Object.entries(record).forEach(([key, value]) => {
        if (!fieldMap.has(key)) {
          fieldMap.set(key, {
            field: key,
            headerName: this.camelCaseToTitle(key),
            type: 'string',
            editable: false
          });
        }
        
        const field = fieldMap.get(key)!;
        const inferredType = this.inferType(value);
        
        // Update type if more specific
        if (field.type === 'string' && inferredType !== 'string') {
          field.type = inferredType;
        }
      });
    });
    
    return Array.from(fieldMap.values());
  }
  
  // Column definitions
  getColumnDefs(): ColDef[] {
    if (this.columnDefs.length > 0) {
      return this.columnDefs;
    }
    
    // Generate from schema if available
    if (this.schema) {
      this.columnDefs = this.generateColumnDefs(this.schema.fields);
    }
    
    return this.columnDefs;
  }
  
  setColumnDefs(columns: ColDef[]): void {
    this.columnDefs = columns;
    this.config.columnDefs = columns;
  }
  
  // Configuration
  getConfig(): StompConfig {
    return { ...this.config };
  }
  
  updateConfig(config: Partial<StompConfig>): void {
    const needsReconnect = 
      config.socketUrl !== undefined ||
      config.listenerTopic !== undefined ||
      config.username !== undefined ||
      config.password !== undefined;
    
    this.config = { ...this.config, ...config };
    
    if (needsReconnect && this.isConnected()) {
      this.disconnect().then(() => this.connect());
    }
  }
  
  // Cleanup
  dispose(): void {
    this.disconnect();
    this.listeners.clear();
    this.snapshotData.clear();
  }
  
  // Helper methods
  private updateStatus(status: ConnectionStatus): void {
    this.status = status;
    this.notifyListeners({ type: 'status-change' });
    this.listeners.forEach(listener => {
      listener.onStatusChange?.(status);
    });
  }
  
  private notifyListeners(event: DataEvent): void {
    this.listeners.forEach(listener => {
      listener.onData?.(event);
    });
  }
  
  private notifyError(error: Error): void {
    const event: DataEvent = {
      type: 'error',
      error
    };
    
    this.listeners.forEach(listener => {
      listener.onData?.(event);
      listener.onError?.(error);
    });
  }
  
  private resetData(): void {
    this.snapshotData.clear();
    this.isSnapshotDone = false;
  }
  
  private inferType(value: any): FieldDefinition['type'] {
    if (value === null || value === undefined) {
      return 'string';
    }
    
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    
    if (typeof value === 'number') {
      return 'number';
    }
    
    if (typeof value === 'object') {
      return Array.isArray(value) ? 'array' : 'object';
    }
    
    // Check for date strings
    if (typeof value === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
      if (dateRegex.test(value) && !isNaN(Date.parse(value))) {
        return 'date';
      }
    }
    
    return 'string';
  }
  
  private camelCaseToTitle(str: string): string {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }
  
  private generateColumnDefs(fields: FieldDefinition[]): ColDef[] {
    return fields.map(field => {
      const colDef: ColDef = {
        field: field.field,
        headerName: field.headerName,
        editable: field.editable,
        sortable: true,
        filter: true,
        resizable: true
      };
      
      // Type-specific configurations
      switch (field.type) {
        case 'number':
          colDef.filter = 'agNumberColumnFilter';
          colDef.valueFormatter = (params) => {
            if (params.value == null) return '';
            return Number(params.value).toLocaleString();
          };
          break;
          
        case 'date':
          colDef.filter = 'agDateColumnFilter';
          colDef.valueFormatter = (params) => {
            if (params.value == null) return '';
            return new Date(params.value).toLocaleString();
          };
          break;
          
        case 'boolean':
          colDef.cellRenderer = 'agCheckboxCellRenderer';
          colDef.cellEditor = 'agCheckboxCellEditor';
          break;
      }
      
      return colDef;
    });
  }
}
```

## Data Provider Context & Management

### Provider Context Implementation

```typescript
// contexts/data-provider-context.tsx
import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useRef 
} from 'react';
import { DataProvider, DataProviderConfig } from '@/types/data-provider';
import { StompDataProvider } from '@/providers/stomp-data-provider';
import { RestDataProvider } from '@/providers/rest-data-provider';
import { MemoryDataProvider } from '@/providers/memory-data-provider';

interface DataProviderContextValue {
  providers: Map<string, DataProvider>;
  
  // Provider management
  registerProvider: (provider: DataProvider) => void;
  unregisterProvider: (id: string) => void;
  getProvider: (id: string) => DataProvider | null;
  listProviders: (type?: string) => DataProvider[];
  
  // Factory methods
  createProvider: (type: string, config: DataProviderConfig) => DataProvider;
  createFromConfig: (config: DataProviderConfig) => DataProvider;
  
  // Persistence
  saveProviders: () => void;
  loadProviders: () => void;
}

const DataProviderContext = createContext<DataProviderContextValue | null>(null);

export const useDataProviders = () => {
  const context = useContext(DataProviderContext);
  if (!context) {
    throw new Error('useDataProviders must be used within DataProviderProvider');
  }
  return context;
};

export const DataProviderProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [providers] = useState(() => new Map<string, DataProvider>());
  const [, forceUpdate] = useState({});
  const providersRef = useRef(providers);
  
  // Factory for creating providers
  const createProvider = useCallback((
    type: string, 
    config: DataProviderConfig
  ): DataProvider => {
    let provider: DataProvider;
    
    switch (type) {
      case 'stomp':
        provider = new StompDataProvider(config as any);
        break;
        
      case 'rest':
        provider = new RestDataProvider(config as any);
        break;
        
      case 'memory':
        provider = new MemoryDataProvider(config as any);
        break;
        
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
    
    return provider;
  }, []);
  
  // Create from saved config
  const createFromConfig = useCallback((config: DataProviderConfig): DataProvider => {
    return createProvider(config.type, config);
  }, [createProvider]);
  
  // Register a provider
  const registerProvider = useCallback((provider: DataProvider): void => {
    providersRef.current.set(provider.id, provider);
    forceUpdate({});
    
    // Auto-save
    saveProviders();
  }, []);
  
  // Unregister and cleanup
  const unregisterProvider = useCallback((id: string): void => {
    const provider = providersRef.current.get(id);
    if (provider) {
      provider.dispose();
      providersRef.current.delete(id);
      forceUpdate({});
      saveProviders();
    }
  }, []);
  
  // Get specific provider
  const getProvider = useCallback((id: string): DataProvider | null => {
    return providersRef.current.get(id) || null;
  }, []);
  
  // List providers
  const listProviders = useCallback((type?: string): DataProvider[] => {
    const all = Array.from(providersRef.current.values());
    return type ? all.filter(p => p.type === type) : all;
  }, []);
  
  // Save providers to localStorage
  const saveProviders = useCallback(() => {
    const configs: DataProviderConfig[] = [];
    
    providersRef.current.forEach(provider => {
      configs.push(provider.getConfig());
    });
    
    localStorage.setItem('dataProviders', JSON.stringify(configs));
  }, []);
  
  // Load providers from localStorage
  const loadProviders = useCallback(() => {
    const saved = localStorage.getItem('dataProviders');
    if (!saved) return;
    
    try {
      const configs: DataProviderConfig[] = JSON.parse(saved);
      
      configs.forEach(config => {
        const provider = createFromConfig(config);
        providersRef.current.set(provider.id, provider);
      });
      
      forceUpdate({});
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  }, [createFromConfig]);
  
  // Load on mount
  React.useEffect(() => {
    loadProviders();
    
    // Cleanup on unmount
    return () => {
      providersRef.current.forEach(provider => {
        provider.dispose();
      });
    };
  }, []);
  
  const value: DataProviderContextValue = {
    providers: providersRef.current,
    registerProvider,
    unregisterProvider,
    getProvider,
    listProviders,
    createProvider,
    createFromConfig,
    saveProviders,
    loadProviders
  };
  
  return (
    <DataProviderContext.Provider value={value}>
      {children}
    </DataProviderContext.Provider>
  );
};
```

## UI Components

### Data Provider Manager

```typescript
// components/data-provider/DataProviderManager.tsx
import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Settings, Trash2, Play, Square } from 'lucide-react';
import { useDataProviders } from '@/contexts/data-provider-context';
import { DataProviderCard } from './DataProviderCard';
import { StompProviderForm } from './forms/StompProviderForm';
import { RestProviderForm } from './forms/RestProviderForm';
import { MemoryProviderForm } from './forms/MemoryProviderForm';

export function DataProviderManager() {
  const { providers, createProvider, registerProvider, unregisterProvider } = useDataProviders();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedType, setSelectedType] = useState('stomp');
  
  const handleCreate = (type: string, config: any) => {
    const provider = createProvider(type, {
      ...config,
      id: `${type}-${Date.now()}`,
      type
    });
    
    registerProvider(provider);
    setShowCreate(false);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Data Providers</h2>
          <p className="text-muted-foreground">
            Manage data sources for your components
          </p>
        </div>
        
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Provider
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from(providers.values()).map(provider => (
          <DataProviderCard
            key={provider.id}
            provider={provider}
            onDelete={() => unregisterProvider(provider.id)}
          />
        ))}
        
        {providers.size === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-muted-foreground mb-4">
                No data providers configured
              </p>
              <Button variant="outline" onClick={() => setShowCreate(true)}>
                Create your first provider
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Data Provider</DialogTitle>
          </DialogHeader>
          
          <Tabs value={selectedType} onValueChange={setSelectedType}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="stomp">STOMP</TabsTrigger>
              <TabsTrigger value="rest">REST API</TabsTrigger>
              <TabsTrigger value="memory">In-Memory</TabsTrigger>
            </TabsList>
            
            <TabsContent value="stomp" className="mt-4">
              <StompProviderForm
                onSubmit={(config) => handleCreate('stomp', config)}
                onCancel={() => setShowCreate(false)}
              />
            </TabsContent>
            
            <TabsContent value="rest" className="mt-4">
              <RestProviderForm
                onSubmit={(config) => handleCreate('rest', config)}
                onCancel={() => setShowCreate(false)}
              />
            </TabsContent>
            
            <TabsContent value="memory" className="mt-4">
              <MemoryProviderForm
                onSubmit={(config) => handleCreate('memory', config)}
                onCancel={() => setShowCreate(false)}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

### STOMP Provider Form

```typescript
// components/data-provider/forms/StompProviderForm.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const stompSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  socketUrl: z.string().url('Must be a valid WebSocket URL'),
  username: z.string().optional(),
  password: z.string().optional(),
  listenerTopic: z.string().min(1, 'Listener topic is required'),
  triggerTopic: z.string().min(1, 'Trigger topic is required'),
  snapshotEndIndicator: z.string().min(1, 'Snapshot end indicator is required'),
  keyColumn: z.string().min(1, 'Key column is required'),
  dataFormat: z.enum(['single', 'array']),
  autoConnect: z.boolean(),
  autoReconnect: z.boolean(),
  reconnectDelay: z.number().min(1000),
  debug: z.boolean()
});

type StompFormData = z.infer<typeof stompSchema>;

interface StompProviderFormProps {
  onSubmit: (data: StompFormData) => void;
  onCancel: () => void;
  initialData?: Partial<StompFormData>;
}

export function StompProviderForm({ 
  onSubmit, 
  onCancel, 
  initialData 
}: StompProviderFormProps) {
  const form = useForm<StompFormData>({
    resolver: zodResolver(stompSchema),
    defaultValues: {
      name: '',
      socketUrl: 'ws://localhost:8080/ws',
      listenerTopic: '/topic/data',
      triggerTopic: '/app/trigger',
      snapshotEndIndicator: 'Success',
      keyColumn: 'id',
      dataFormat: 'array',
      autoConnect: true,
      autoReconnect: true,
      reconnectDelay: 5000,
      debug: false,
      ...initialData
    }
  });
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provider Name</FormLabel>
              <FormControl>
                <Input placeholder="My STOMP Provider" {...field} />
              </FormControl>
              <FormDescription>
                A friendly name to identify this provider
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="socketUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WebSocket URL</FormLabel>
                <FormControl>
                  <Input placeholder="ws://localhost:8080/ws" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="keyColumn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Key Column</FormLabel>
                <FormControl>
                  <Input placeholder="id" {...field} />
                </FormControl>
                <FormDescription>
                  Field used as row identifier
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username (Optional)</FormLabel>
                <FormControl>
                  <Input type="text" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password (Optional)</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="listenerTopic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Listener Topic</FormLabel>
                <FormControl>
                  <Input placeholder="/topic/data" {...field} />
                </FormControl>
                <FormDescription>
                  Topic to subscribe for data
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="triggerTopic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trigger Topic</FormLabel>
                <FormControl>
                  <Input placeholder="/app/trigger" {...field} />
                </FormControl>
                <FormDescription>
                  Topic to send trigger message
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="snapshotEndIndicator"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Snapshot End Indicator</FormLabel>
                <FormControl>
                  <Input placeholder="Success" {...field} />
                </FormControl>
                <FormDescription>
                  Message prefix indicating snapshot complete
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="dataFormat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Format</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="array">Array of Objects</SelectItem>
                    <SelectItem value="single">Single Object</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="autoConnect"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel>Auto Connect</FormLabel>
                  <FormDescription>
                    Connect automatically when provider is created
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="autoReconnect"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel>Auto Reconnect</FormLabel>
                  <FormDescription>
                    Reconnect automatically on connection loss
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="debug"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel>Debug Mode</FormLabel>
                  <FormDescription>
                    Log STOMP frames to console
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Create Provider
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### Column Definition Builder

```typescript
// components/data-provider/ColumnDefBuilder.tsx
import React, { useState, useEffect } from 'react';
import { ColDef } from 'ag-grid-community';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { 
  Wand, 
  Plus, 
  Trash2, 
  GripVertical, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { DataProvider, FieldDefinition } from '@/types/data-provider';
import { toast } from '@/hooks/use-toast';

interface ColumnDefBuilderProps {
  provider: DataProvider;
  onSave?: (columns: ColDef[]) => void;
}

export function ColumnDefBuilder({ provider, onSave }: ColumnDefBuilderProps) {
  const [columns, setColumns] = useState<ColDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedColumns, setExpandedColumns] = useState<Set<number>>(new Set());
  
  // Load existing columns
  useEffect(() => {
    const existingColumns = provider.getColumnDefs();
    if (existingColumns.length > 0) {
      setColumns(existingColumns);
    }
  }, [provider]);
  
  // Infer fields from data
  const handleInferFields = async () => {
    setLoading(true);
    try {
      const fields = await provider.inferFields();
      
      if (fields.length === 0) {
        toast({
          title: "No fields found",
          description: "Make sure the provider has data",
          variant: "destructive"
        });
        return;
      }
      
      const columnDefs = fields.map(field => createColumnDef(field));
      setColumns(columnDefs);
      
      toast({
        title: "Fields inferred",
        description: `Found ${fields.length} fields`
      });
    } catch (error) {
      toast({
        title: "Failed to infer fields",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const createColumnDef = (field: FieldDefinition): ColDef => {
    const colDef: ColDef = {
      field: field.field,
      headerName: field.headerName || field.field,
      sortable: true,
      filter: true,
      resizable: true,
      editable: field.editable || false
    };
    
    // Type-specific settings
    switch (field.type) {
      case 'number':
        colDef.filter = 'agNumberColumnFilter';
        colDef.cellClass = 'text-right';
        break;
        
      case 'date':
        colDef.filter = 'agDateColumnFilter';
        break;
        
      case 'boolean':
        colDef.cellRenderer = 'agCheckboxCellRenderer';
        break;
    }
    
    return colDef;
  };
  
  // Add manual column
  const handleAddColumn = () => {
    const newColumn: ColDef = {
      field: `field_${Date.now()}`,
      headerName: 'New Column',
      sortable: true,
      filter: true,
      resizable: true
    };
    
    setColumns([...columns, newColumn]);
    setExpandedColumns(new Set([...expandedColumns, columns.length]));
  };
  
  // Update column
  const handleUpdateColumn = (index: number, updates: Partial<ColDef>) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], ...updates };
    setColumns(updated);
  };
  
  // Delete column
  const handleDeleteColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
    
    // Update expanded state
    const newExpanded = new Set(expandedColumns);
    newExpanded.delete(index);
    setExpandedColumns(newExpanded);
  };
  
  // Move column
  const handleMoveColumn = (fromIndex: number, toIndex: number) => {
    const updated = [...columns];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setColumns(updated);
  };
  
  // Toggle column expansion
  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedColumns);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedColumns(newExpanded);
  };
  
  // Save columns
  const handleSave = () => {
    provider.setColumnDefs(columns);
    onSave?.(columns);
    
    toast({
      title: "Column definitions saved",
      description: `Saved ${columns.length} columns`
    });
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Column Definitions</h3>
        <div className="flex gap-2">
          <Button
            onClick={handleInferFields}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <Wand className="w-4 h-4 mr-2" />
            Infer from Data
          </Button>
          
          <Button
            onClick={handleAddColumn}
            variant="outline"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Column
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        {columns.map((column, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{column.headerName}</span>
                    <span className="text-sm text-muted-foreground">
                      ({column.field})
                    </span>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(index)}
                >
                  {expandedColumns.has(index) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteColumn(index)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
            
            {expandedColumns.has(index) && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Field Name</Label>
                    <Input
                      value={column.field}
                      onChange={(e) => handleUpdateColumn(index, { 
                        field: e.target.value 
                      })}
                    />
                  </div>
                  
                  <div>
                    <Label>Header Name</Label>
                    <Input
                      value={column.headerName}
                      onChange={(e) => handleUpdateColumn(index, { 
                        headerName: e.target.value 
                      })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Filter Type</Label>
                    <Select
                      value={column.filter as string}
                      onValueChange={(value) => handleUpdateColumn(index, { 
                        filter: value 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agTextColumnFilter">Text</SelectItem>
                        <SelectItem value="agNumberColumnFilter">Number</SelectItem>
                        <SelectItem value="agDateColumnFilter">Date</SelectItem>
                        <SelectItem value="agSetColumnFilter">Set</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Width</Label>
                    <Input
                      type="number"
                      value={column.width || ''}
                      onChange={(e) => handleUpdateColumn(index, { 
                        width: e.target.value ? Number(e.target.value) : undefined 
                      })}
                      placeholder="Auto"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={column.sortable !== false}
                      onCheckedChange={(checked) => handleUpdateColumn(index, { 
                        sortable: checked 
                      })}
                    />
                    <span className="text-sm">Sortable</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={column.filter !== false}
                      onCheckedChange={(checked) => handleUpdateColumn(index, { 
                        filter: checked 
                      })}
                    />
                    <span className="text-sm">Filterable</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={column.resizable !== false}
                      onCheckedChange={(checked) => handleUpdateColumn(index, { 
                        resizable: checked 
                      })}
                    />
                    <span className="text-sm">Resizable</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={column.editable === true}
                      onCheckedChange={(checked) => handleUpdateColumn(index, { 
                        editable: checked 
                      })}
                    />
                    <span className="text-sm">Editable</span>
                  </label>
                </div>
              </div>
            )}
          </Card>
        ))}
        
        {columns.length === 0 && (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <p>No columns defined</p>
              <p className="text-sm mt-2">
                Click "Infer from Data" or "Add Column" to get started
              </p>
            </div>
          </Card>
        )}
      </div>
      
      {columns.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave}>
            Save Column Definitions
          </Button>
        </div>
      )}
    </div>
  );
}
```

### Data Provider Selector

```typescript
// components/data-provider/DataProviderSelector.tsx
import React, { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataProvider } from '@/types/data-provider';
import { cn } from '@/lib/utils';

interface DataProviderSelectorProps {
  value?: string;
  onChange: (providerId: string) => void;
  providers: DataProvider[];
  filter?: (provider: DataProvider) => boolean;
  placeholder?: string;
  className?: string;
}

export function DataProviderSelector({
  value,
  onChange,
  providers,
  filter,
  placeholder = "Select data provider",
  className
}: DataProviderSelectorProps) {
  // Group providers by type
  const groupedProviders = useMemo(() => {
    const filtered = filter ? providers.filter(filter) : providers;
    
    return filtered.reduce((groups, provider) => {
      const type = provider.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(provider);
      return groups;
    }, {} as Record<string, DataProvider[]>);
  }, [providers, filter]);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'stomp':
        return 'STOMP Providers';
      case 'rest':
        return 'REST API Providers';
      case 'memory':
        return 'In-Memory Providers';
      default:
        return `${type} Providers`;
    }
  };
  
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("w-[250px]", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(groupedProviders).map(([type, providers]) => (
          <SelectGroup key={type}>
            <SelectLabel>{getTypeLabel(type)}</SelectLabel>
            {providers.map(provider => (
              <SelectItem key={provider.id} value={provider.id}>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    getStatusColor(provider.status)
                  )} />
                  <span>{provider.name}</span>
                  {provider.status === 'connected' && (
                    <Badge variant="outline" className="text-xs">
                      Live
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
        
        {Object.keys(groupedProviders).length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No providers available
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
```

## Component Integration

### DataTable with Data Provider

```typescript
// components/DataTable.tsx
import React, { 
  forwardRef, 
  useImperativeHandle, 
  useRef, 
  useState, 
  useEffect 
} from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { ComponentAPI, ConfigurableComponentProps } from '@/types/component-api';
import { useDataProviders } from '@/contexts/data-provider-context';
import { DataProviderSelector } from '@/components/data-provider/DataProviderSelector';
import { DataProviderControls } from '@/components/data-provider/DataProviderControls';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface DataTableProps extends ConfigurableComponentProps {
  defaultProviderId?: string;
}

export const DataTable = forwardRef<ComponentAPI, DataTableProps>(
  ({ id, onReady, onSettingsChange, initialSettings, defaultProviderId }, ref) => {
    const { providers } = useDataProviders();
    const gridRef = useRef<AgGridReact>(null);
    const [gridApi, setGridApi] = useState<GridApi | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    
    // Data provider state
    const [selectedProviderId, setSelectedProviderId] = useState(
      defaultProviderId || ''
    );
    const [rowData, setRowData] = useState<any[]>([]);
    const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Get current provider
    const currentProvider = selectedProviderId 
      ? providers.get(selectedProviderId) 
      : null;
    
    // Subscribe to data provider
    useEffect(() => {
      if (!currentProvider) {
        setRowData([]);
        setColumnDefs([]);
        return;
      }
      
      setIsLoading(true);
      
      // Get column definitions
      const columns = currentProvider.getColumnDefs();
      if (columns.length > 0) {
        setColumnDefs(columns);
      }
      
      // Subscribe to data updates
      const unsubscribe = currentProvider.subscribe({
        onData: (event) => {
          switch (event.type) {
            case 'snapshot-complete':
              setRowData(event.data || []);
              setIsLoading(false);
              break;
              
            case 'snapshot-update':
              // Optional: show loading progress
              break;
              
            case 'update':
              if (gridApi && event.key) {
                // Update specific rows
                const rowNode = gridApi.getRowNode(event.key as string);
                if (rowNode && event.data?.[0]) {
                  rowNode.setData(event.data[0]);
                }
              }
              break;
              
            case 'error':
              console.error('Data provider error:', event.error);
              setIsLoading(false);
              break;
          }
        },
        
        onStatusChange: (status) => {
          if (status === 'error' || status === 'disconnected') {
            setIsLoading(false);
          }
        }
      });
      
      // Connect if not connected
      if (currentProvider.status === 'disconnected') {
        currentProvider.connect().catch(console.error);
      }
      
      return () => {
        unsubscribe();
      };
    }, [selectedProviderId, currentProvider, gridApi]);
    
    // Grid ready handler
    const handleGridReady = (event: GridReadyEvent) => {
      setGridApi(event.api);
      setIsReady(true);
      
      // Apply initial settings if any
      if (initialSettings) {
        applySettings(initialSettings);
      }
    };
    
    // Get current settings
    const getCurrentSettings = () => {
      if (!gridApi) return {};
      
      return {
        providerId: selectedProviderId,
        columnState: gridApi.getColumnState(),
        filterModel: gridApi.getFilterModel(),
        sortModel: gridApi.getSortModel()
      };
    };
    
    // Apply settings
    const applySettings = (settings: any) => {
      if (!gridApi) return;
      
      if (settings.providerId) {
        setSelectedProviderId(settings.providerId);
      }
      
      if (settings.columnState) {
        gridApi.applyColumnState({ state: settings.columnState });
      }
      
      if (settings.filterModel) {
        gridApi.setFilterModel(settings.filterModel);
      }
      
      setIsDirty(false);
    };
    
    // Expose component API
    useImperativeHandle(ref, () => ({
      getId: () => id,
      getType: () => 'DataTable',
      getCurrentSettings,
      applySettings,
      getActiveProfileId: () => null,
      setActiveProfile: async () => {},
      isDirty: () => isDirty,
      isReady: () => isReady,
      
      refresh: async () => {
        if (currentProvider?.refresh) {
          await currentProvider.refresh();
        }
      },
      
      validate: () => {
        if (!selectedProviderId) {
          return { 
            valid: false, 
            errors: ['No data provider selected'] 
          };
        }
        return { valid: true };
      }
    }), [id, isReady, isDirty, selectedProviderId, currentProvider]);
    
    // Track changes
    const handleGridChange = () => {
      setIsDirty(true);
      if (onSettingsChange) {
        onSettingsChange(getCurrentSettings());
      }
    };
    
    // Get row ID
    const getRowId = (params: any) => {
      if (currentProvider?.config.keyColumn) {
        return params.data[currentProvider.config.keyColumn];
      }
      return params.data.id;
    };
    
    return (
      <div className="datatable-container h-full flex flex-col">
        <div className="toolbar p-2 border-b flex items-center gap-2">
          <DataProviderSelector
            value={selectedProviderId}
            onChange={setSelectedProviderId}
            providers={Array.from(providers.values())}
            filter={(p) => p.type === 'stomp' || p.type === 'rest'}
          />
          
          {currentProvider && (
            <>
              <DataProviderControls provider={currentProvider} />
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => currentProvider.refresh?.()}
                disabled={!currentProvider.refresh || isLoading}
              >
                <RefreshCw className={cn(
                  "w-4 h-4",
                  isLoading && "animate-spin"
                )} />
              </Button>
            </>
          )}
          
          <div className="flex-1" />
          
          <ProfileManager
            componentId={id}
            componentType="DataTable"
            currentSettings={getCurrentSettings()}
            onSettingsChange={applySettings}
          />
        </div>
        
        <div className="flex-1">
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            onGridReady={handleGridReady}
            onColumnMoved={handleGridChange}
            onFilterChanged={handleGridChange}
            onSortChanged={handleGridChange}
            getRowId={getRowId}
            animateRows={true}
            rowSelection="multiple"
            suppressLoadingOverlay={!isLoading}
            loading={isLoading}
          />
        </div>
      </div>
    );
  }
);

DataTable.displayName = 'DataTable';
```

## Testing

### Mock Data Provider for Testing

```typescript
// test/mocks/mock-data-provider.ts
import { 
  DataProvider, 
  DataListener, 
  ConnectionStatus,
  DataSchema,
  FieldDefinition 
} from '@/types/data-provider';

export class MockDataProvider implements DataProvider {
  id = 'mock-provider';
  name = 'Mock Provider';
  type = 'mock';
  status: ConnectionStatus = 'disconnected';
  
  private listeners = new Set<DataListener>();
  private mockData: any[] = [];
  
  constructor(private config: any = {}) {
    this.mockData = config.data || this.generateMockData();
  }
  
  async connect(): Promise<void> {
    this.status = 'connecting';
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.status = 'connected';
    
    // Send snapshot data
    this.notifyListeners({
      type: 'snapshot-complete',
      data: this.mockData
    });
  }
  
  async disconnect(): Promise<void> {
    this.status = 'disconnected';
  }
  
  isConnected(): boolean {
    return this.status === 'connected';
  }
  
  subscribe(listener: DataListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  async getSchema(): Promise<DataSchema> {
    const fields = await this.inferFields();
    return { fields };
  }
  
  async inferFields(): Promise<FieldDefinition[]> {
    if (this.mockData.length === 0) return [];
    
    const sample = this.mockData[0];
    return Object.keys(sample).map(key => ({
      field: key,
      headerName: key.charAt(0).toUpperCase() + key.slice(1),
      type: typeof sample[key] === 'number' ? 'number' : 'string'
    }));
  }
  
  getColumnDefs(): ColDef[] {
    return this.config.columnDefs || [];
  }
  
  setColumnDefs(columns: ColDef[]): void {
    this.config.columnDefs = columns;
  }
  
  getConfig(): any {
    return { ...this.config };
  }
  
  updateConfig(config: any): void {
    this.config = { ...this.config, ...config };
  }
  
  dispose(): void {
    this.listeners.clear();
  }
  
  // Test helpers
  simulateUpdate(data: any): void {
    this.notifyListeners({
      type: 'update',
      data: [data],
      key: data.id
    });
  }
  
  simulateError(error: Error): void {
    this.notifyListeners({
      type: 'error',
      error
    });
  }
  
  private generateMockData(): any[] {
    return Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.floor(Math.random() * 1000),
      status: ['Active', 'Pending', 'Inactive'][Math.floor(Math.random() * 3)],
      date: new Date(Date.now() - Math.random() * 10000000000).toISOString()
    }));
  }
  
  private notifyListeners(event: any): void {
    this.listeners.forEach(listener => {
      listener.onData?.(event);
    });
  }
}
```

### Testing Data Provider Integration

```typescript
// components/DataTable.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { DataTable } from './DataTable';
import { DataProviderProvider } from '@/contexts/data-provider-context';
import { MockDataProvider } from '@/test/mocks/mock-data-provider';

describe('DataTable with Data Provider', () => {
  const wrapper = ({ children }) => (
    <DataProviderProvider>
      {children}
    </DataProviderProvider>
  );
  
  it('should connect to data provider and display data', async () => {
    const mockProvider = new MockDataProvider({
      data: [
        { id: 1, name: 'Test 1', value: 100 },
        { id: 2, name: 'Test 2', value: 200 }
      ]
    });
    
    const { getByText } = render(
      <DataTable 
        id="test-table" 
        defaultProviderId={mockProvider.id}
      />,
      { wrapper }
    );
    
    // Should connect automatically
    await waitFor(() => {
      expect(mockProvider.isConnected()).toBe(true);
    });
    
    // Should display data
    await waitFor(() => {
      expect(getByText('Test 1')).toBeInTheDocument();
      expect(getByText('Test 2')).toBeInTheDocument();
    });
  });
  
  it('should handle real-time updates', async () => {
    const mockProvider = new MockDataProvider();
    
    render(
      <DataTable 
        id="test-table" 
        defaultProviderId={mockProvider.id}
      />,
      { wrapper }
    );
    
    await mockProvider.connect();
    
    // Simulate update
    mockProvider.simulateUpdate({
      id: 1,
      name: 'Updated Item',
      value: 999
    });
    
    await waitFor(() => {
      expect(screen.getByText('Updated Item')).toBeInTheDocument();
    });
  });
});
```

## Best Practices

### 1. Provider Lifecycle Management

```typescript
// Properly cleanup providers when components unmount
useEffect(() => {
  return () => {
    if (provider && provider.status === 'connected') {
      provider.disconnect();
    }
  };
}, [provider]);
```

### 2. Error Handling

```typescript
// Always handle connection errors
provider.subscribe({
  onError: (error) => {
    toast({
      title: 'Connection Error',
      description: error.message,
      variant: 'destructive'
    });
  }
});
```

### 3. Performance Optimization

```typescript
// Throttle updates for high-frequency data
const throttledUpdate = throttle((data) => {
  setRowData(data);
}, 100);

// Use immutable updates for AG-Grid
const updateRows = (updates: any[]) => {
  const transaction = {
    update: updates
  };
  gridApi.applyTransaction(transaction);
};
```

### 4. Connection Management

```typescript
// Implement connection pooling for shared providers
class DataProviderPool {
  private activeConnections = new Map<string, number>();
  
  acquire(provider: DataProvider): void {
    const count = this.activeConnections.get(provider.id) || 0;
    this.activeConnections.set(provider.id, count + 1);
    
    if (count === 0) {
      provider.connect();
    }
  }
  
  release(provider: DataProvider): void {
    const count = this.activeConnections.get(provider.id) || 0;
    if (count <= 1) {
      provider.disconnect();
      this.activeConnections.delete(provider.id);
    } else {
      this.activeConnections.set(provider.id, count - 1);
    }
  }
}
```

## Conclusion

The Data Provider system provides a flexible, type-safe way to manage data sources across your application. Key benefits include:

1. **Unified Interface** - All data sources work the same way
2. **Real-time Support** - Built-in streaming with STOMP
3. **Automatic Field Inference** - Reduces manual configuration
4. **Visual Management** - UI components for configuration
5. **Sharing** - Multiple components can use the same provider
6. **Type Safety** - Full TypeScript support throughout

This architecture scales from simple in-memory data to complex real-time streaming scenarios while maintaining a clean, understandable API.