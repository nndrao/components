/**
 * Data Source Service
 * 
 * Manages data source connections, subscriptions, and data flow
 * to components. Supports multiple data source types including
 * WebSocket, REST API, and static data.
 */

import {
  IDataSourceService,
  IDataSource,
  ConnectionStatus,
  DataSourceDefinition,
  DataSourceType,
  WebSocketDataSourceConfig,
  RestApiConfig,
  StaticDataSourceConfig,
  DataUpdate,
  UpdateType,
  DataSourceEvent,
  DataSourceEventType
} from '@/types';
import { WebSocketClient } from '../websocket/WebSocketClient';
import { DummyDataSource, DummyDataConfig } from './DummyDataSource';

/**
 * Data source event listener
 */
export type DataSourceEventListener = (event: DataSourceEvent) => void;

/**
 * Connection status change listener
 */
export type ConnectionStatusListener = (dataSourceId: string, status: ConnectionStatus) => void;

/**
 * Error listener
 */
export type ErrorListener = (dataSourceId: string, error: Error) => void;

/**
 * Base data source implementation
 */
abstract class BaseDataSource implements IDataSource {
  id: string;
  name: string;
  type: DataSourceType;
  status: ConnectionStatus = 'disconnected';
  protected subscribers: Array<(data: any) => void> = [];
  protected eventListeners: DataSourceEventListener[] = [];

  constructor(id: string, name: string, type: DataSourceType) {
    this.id = id;
    this.name = name;
    this.type = type;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getData(): Promise<any[]>;

  subscribe(callback: (data: any) => void): () => void {
    this.subscribers.push(callback);
    
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  protected notifySubscribers(data: any): void {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in data source subscriber:', error);
      }
    });
  }

  protected emitEvent(type: DataSourceEventType, data?: any, error?: Error): void {
    const event: DataSourceEvent = {
      type,
      source: this.id,
      timestamp: new Date().toISOString(),
      data,
      error
    };

    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in data source event listener:', error);
      }
    });
  }

  addEventListener(listener: DataSourceEventListener): () => void {
    this.eventListeners.push(listener);
    
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }
}

/**
 * WebSocket data source implementation
 */
class WebSocketDataSource extends BaseDataSource {
  private config: WebSocketDataSourceConfig;
  private wsClient: WebSocketClient | null = null;
  private subscriptionId: string | null = null;
  private messageBuffer: any[] = [];
  private snapshotData: Map<any, any> = new Map();
  private isReceivingSnapshot = false;
  private batchTimer?: NodeJS.Timeout;
  private updateStats = {
    received: 0,
    processed: 0,
    batched: 0,
    dropped: 0
  };

  constructor(id: string, name: string, config: WebSocketDataSourceConfig) {
    super(id, name, 'websocket');
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.status = 'connecting';
    this.emitEvent('connecting');

    try {
      // Create WebSocket client
      this.wsClient = new WebSocketClient({
        ...this.config,
        reconnect: this.config.reconnect ? {
          enabled: this.config.reconnect.enabled,
          delay: this.config.reconnect.delay || 5000,
          maxDelay: this.config.reconnect.maxDelay || 30000,
          maxAttempts: this.config.reconnect.maxAttempts || 10
        } : undefined
      } as any);
      
      // Set up event listeners
      this.wsClient.on('connectionStateChange', (state) => {
        this.status = state.status;
        if (state.lastError) {
          this.emitEvent('error', undefined, new Error(state.lastError));
        }
      });
      
      this.wsClient.on('dataSourceEvent', (event: DataSourceEvent) => {
        this.emitEvent(event.type, event.data, event.error);
      });
      
      // Connect
      await this.wsClient.connect();
      
      // Subscribe to the listener topic
      if (this.config.listenerTopic) {
        this.subscriptionId = this.wsClient.subscribe(
          this.config.listenerTopic,
          (update) => this.processUpdate(update),
          {
            throttle: this.config.messageRateLimit ? 1000 / this.config.messageRateLimit : undefined
          }
        );
      }
      
      this.status = 'connected';
      this.emitEvent('connected');
      
      // Send initial request message if configured
      if (this.config.requestMessage && this.config.requestTopic) {
        this.sendRequest(this.config.requestMessage);
      }
    } catch (error) {
      this.status = 'error';
      this.emitEvent('error', undefined, error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.status === 'disconnected') {
      return;
    }

    // Clear batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Unsubscribe and disconnect
    if (this.wsClient) {
      if (this.subscriptionId) {
        this.wsClient.unsubscribe(this.subscriptionId);
        this.subscriptionId = null;
      }
      await this.wsClient.disconnect();
      this.wsClient = null;
    }

    this.status = 'disconnected';
    this.emitEvent('disconnected');
    
    // Clear data
    this.messageBuffer = [];
    this.snapshotData.clear();
  }

  async getData(): Promise<any[]> {
    return Array.from(this.snapshotData.values());
  }

  public getStatistics() {
    return {
      updateStats: { ...this.updateStats },
      snapshotSize: this.snapshotData.size,
      bufferSize: this.messageBuffer.length,
      connectionStats: this.wsClient?.getStatistics() || null
    };
  }

  private processUpdate(update: DataUpdate): void {
    this.updateStats.received++;
    
    // Check for snapshot markers
    if (update.metadata?.snapshotStart || (update.type === 'snapshot' && !this.isReceivingSnapshot)) {
      this.isReceivingSnapshot = true;
      this.emitEvent('snapshot-start');
    }
    
    if (update.metadata?.snapshotEnd || 
        (this.config.snapshotEndToken && update.data === this.config.snapshotEndToken)) {
      this.isReceivingSnapshot = false;
      this.emitEvent('snapshot-end');
      return;
    }
    
    const keyField = this.config.keyColumn || 'id';
    const key = update.key || update.data?.[keyField];
    
    // Update snapshot data
    switch (update.type) {
      case 'insert':
      case 'snapshot':
        if (key !== undefined) {
          this.snapshotData.set(key, update.data);
        }
        break;
        
      case 'update':
        if (key !== undefined && this.snapshotData.has(key)) {
          this.snapshotData.set(key, {
            ...this.snapshotData.get(key),
            ...update.data
          });
        } else if (key !== undefined) {
          this.snapshotData.set(key, update.data);
        }
        break;
        
      case 'delete':
        if (key !== undefined) {
          this.snapshotData.delete(key);
        }
        break;
        
      case 'clear':
        this.snapshotData.clear();
        break;
    }
    
    // Batch updates if needed
    if (this.config.messageRateLimit && this.config.messageRateLimit > 0) {
      this.batchUpdate(update);
    } else {
      this.notifySubscribers(update);
      this.updateStats.processed++;
    }
    
    this.emitEvent('data-received', update);
  }
  
  private batchUpdate(update: DataUpdate): void {
    this.messageBuffer.push(update);
    this.updateStats.batched++;
    
    if (!this.batchTimer) {
      const batchInterval = Math.max(100, 1000 / (this.config.messageRateLimit || 10));
      this.batchTimer = setTimeout(() => {
        this.flushMessageBuffer();
      }, batchInterval);
    }
  }

  private flushMessageBuffer(): void {
    if (this.messageBuffer.length === 0) return;
    
    const updates = [...this.messageBuffer];
    this.messageBuffer = [];
    this.batchTimer = undefined;
    
    // Batch notify
    const batchUpdate: DataUpdate = {
      type: 'update',
      timestamp: new Date().toISOString(),
      data: updates,
      metadata: {
        isBatch: true,
        batchSize: updates.length
      }
    };
    
    this.notifySubscribers(batchUpdate);
    this.updateStats.processed += updates.length;
  }

  private sendRequest(message: string): void {
    if (this.wsClient && this.wsClient.isConnected() && this.config.requestTopic) {
      try {
        const requestData = typeof message === 'string' ? JSON.parse(message) : message;
        this.wsClient.publish(this.config.requestTopic, requestData);
      } catch (error) {
        console.error('Error sending request:', error);
      }
    }
  }
}

/**
 * REST API data source implementation
 */
class RestApiDataSource extends BaseDataSource {
  private config: RestApiConfig;
  private data: any[] = [];
  private pollingTimer?: NodeJS.Timeout;

  constructor(id: string, name: string, config: RestApiConfig) {
    super(id, name, 'rest');
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.status = 'connecting';
    this.emitEvent('connecting');

    try {
      // Initial data fetch
      await this.fetchData();
      
      this.status = 'connected';
      this.emitEvent('connected');
      
      // Start polling if configured
      if (this.config.polling?.enabled) {
        this.startPolling();
      }
    } catch (error) {
      this.status = 'error';
      this.emitEvent('error', undefined, error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.status === 'disconnected') {
      return;
    }

    this.stopPolling();
    
    this.status = 'disconnected';
    this.emitEvent('disconnected');
  }

  async getData(): Promise<any[]> {
    if (this.status === 'connected') {
      // Refresh data
      await this.fetchData();
    }
    return this.data;
  }

  private async fetchData(): Promise<void> {
    try {
      // In production, this would make a real HTTP request
      // For now, simulate with mock data
      const mockData = [
        { id: 1, name: 'API Item 1', value: Math.random() * 100 },
        { id: 2, name: 'API Item 2', value: Math.random() * 100 },
        { id: 3, name: 'API Item 3', value: Math.random() * 100 }
      ];
      
      this.data = mockData;
      
      const update: DataUpdate = {
        type: 'snapshot',
        timestamp: new Date().toISOString(),
        data: mockData
      };
      
      this.notifySubscribers(update);
      this.emitEvent('data-received', update);
    } catch (error) {
      this.emitEvent('error', undefined, error as Error);
      throw error;
    }
  }

  private startPolling(): void {
    if (!this.config.polling?.interval) return;
    
    this.pollingTimer = setInterval(() => {
      if (this.status === 'connected') {
        this.fetchData().catch(error => {
          console.error('Polling error:', error);
        });
      }
    }, this.config.polling.interval);
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }
  }
}

/**
 * Static data source implementation
 */
class StaticDataSource extends BaseDataSource {
  private config: StaticDataSourceConfig;
  private updateTimer?: NodeJS.Timeout;

  constructor(id: string, name: string, config: StaticDataSourceConfig) {
    super(id, name, 'static');
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.status === 'connected') {
      return;
    }

    this.status = 'connected';
    this.emitEvent('connected');
    
    // Send initial data
    const update: DataUpdate = {
      type: 'snapshot',
      timestamp: new Date().toISOString(),
      data: this.config.data
    };
    
    this.notifySubscribers(update);
    this.emitEvent('data-received', update);
    
    // Start simulated updates if configured
    if (this.config.simulateUpdates?.enabled) {
      this.startSimulatedUpdates();
    }
  }

  async disconnect(): Promise<void> {
    if (this.status === 'disconnected') {
      return;
    }

    this.stopSimulatedUpdates();
    
    this.status = 'disconnected';
    this.emitEvent('disconnected');
  }

  async getData(): Promise<any[]> {
    return this.config.data;
  }

  private startSimulatedUpdates(): void {
    if (!this.config.simulateUpdates) return;
    
    this.updateTimer = setInterval(() => {
      const updateCount = Math.ceil(
        this.config.data.length * (this.config.simulateUpdates!.updatePercentage / 100)
      );
      
      const updates: any[] = [];
      const usedIndices = new Set<number>();
      
      for (let i = 0; i < updateCount; i++) {
        let index: number;
        do {
          index = Math.floor(Math.random() * this.config.data.length);
        } while (usedIndices.has(index));
        
        usedIndices.add(index);
        
        const item = this.config.data[index];
        const updatedItem = this.simulateItemUpdate(item);
        this.config.data[index] = updatedItem;
        updates.push(updatedItem);
      }
      
      const update: DataUpdate = {
        type: 'update',
        timestamp: new Date().toISOString(),
        data: updates
      };
      
      this.notifySubscribers(update);
      this.emitEvent('data-received', update);
    }, this.config.simulateUpdates.interval);
  }

  private stopSimulatedUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
  }

  private simulateItemUpdate(item: any): any {
    const updated = { ...item };
    
    // Simulate changes to numeric fields
    Object.keys(updated).forEach(key => {
      if (typeof updated[key] === 'number') {
        updated[key] += (Math.random() - 0.5) * updated[key] * 0.1;
      }
    });
    
    return updated;
  }
}

/**
 * Data source service implementation
 */
export class DataSourceService implements IDataSourceService {
  private dataSources: Map<string, IDataSource> = new Map();
  private connectionStatusListeners: ConnectionStatusListener[] = [];
  private errorListeners: ErrorListener[] = [];

  /**
   * Register a data source
   */
  registerDataSource(dataSource: IDataSource): void {
    if (this.dataSources.has(dataSource.id)) {
      throw new Error(`Data source ${dataSource.id} is already registered`);
    }
    
    this.dataSources.set(dataSource.id, dataSource);
    
    // Subscribe to data source events
    if ('addEventListener' in dataSource) {
      (dataSource as BaseDataSource).addEventListener((event) => {
        this.handleDataSourceEvent(dataSource.id, event);
      });
    }
    
    console.log(`Data source '${dataSource.name}' registered`);
  }

  /**
   * Create and register a data source from definition
   */
  createDataSource(definition: DataSourceDefinition): IDataSource {
    let dataSource: IDataSource;
    
    switch (definition.type) {
      case 'websocket':
        dataSource = new WebSocketDataSource(
          definition.id,
          definition.name,
          definition.config as WebSocketDataSourceConfig
        );
        break;
        
      case 'rest':
        dataSource = new RestApiDataSource(
          definition.id,
          definition.name,
          definition.config as RestApiConfig
        );
        break;
        
      case 'static':
        dataSource = new StaticDataSource(
          definition.id,
          definition.name,
          definition.config as StaticDataSourceConfig
        );
        break;
        
      case 'dummy':
        dataSource = new DummyDataSource(
          definition.id,
          definition.name,
          definition.config as DummyDataConfig
        );
        break;
        
      default:
        throw new Error(`Unsupported data source type: ${definition.type}`);
    }
    
    this.registerDataSource(dataSource);
    return dataSource;
  }

  /**
   * Get a data source by ID
   */
  getDataSource(id: string): IDataSource | null {
    return this.dataSources.get(id) || null;
  }

  /**
   * Get all data sources
   */
  getAllDataSources(): IDataSource[] {
    return Array.from(this.dataSources.values());
  }

  /**
   * Remove a data source
   */
  removeDataSource(id: string): void {
    const dataSource = this.dataSources.get(id);
    
    if (dataSource && dataSource.status === 'connected') {
      dataSource.disconnect();
    }
    
    this.dataSources.delete(id);
    console.log(`Data source '${id}' removed`);
  }

  /**
   * Connect to a data source
   */
  async connect(dataSourceId: string): Promise<void> {
    const dataSource = this.getDataSource(dataSourceId);
    
    if (!dataSource) {
      throw new Error(`Data source ${dataSourceId} not found`);
    }
    
    await dataSource.connect();
  }

  /**
   * Disconnect from a data source
   */
  async disconnect(dataSourceId: string): Promise<void> {
    const dataSource = this.getDataSource(dataSourceId);
    
    if (!dataSource) {
      throw new Error(`Data source ${dataSourceId} not found`);
    }
    
    await dataSource.disconnect();
  }

  /**
   * Check connection status
   */
  getConnectionStatus(dataSourceId: string): ConnectionStatus {
    const dataSource = this.getDataSource(dataSourceId);
    
    if (!dataSource) {
      throw new Error(`Data source ${dataSourceId} not found`);
    }
    
    return dataSource.status;
  }

  /**
   * Reconnect to a data source
   */
  async reconnect(dataSourceId: string): Promise<void> {
    await this.disconnect(dataSourceId);
    await this.connect(dataSourceId);
  }

  /**
   * Subscribe to data updates
   */
  subscribe(dataSourceId: string, callback: (data: any) => void): () => void {
    const dataSource = this.getDataSource(dataSourceId);
    
    if (!dataSource) {
      throw new Error(`Data source ${dataSourceId} not found`);
    }
    
    return dataSource.subscribe(callback);
  }

  /**
   * Get data snapshot
   */
  async getData(dataSourceId: string): Promise<any[]> {
    const dataSource = this.getDataSource(dataSourceId);
    
    if (!dataSource) {
      throw new Error(`Data source ${dataSourceId} not found`);
    }
    
    return dataSource.getData();
  }

  /**
   * Send data request
   */
  async sendRequest(dataSourceId: string, request: any): Promise<any> {
    const dataSource = this.getDataSource(dataSourceId);
    
    if (!dataSource) {
      throw new Error(`Data source ${dataSourceId} not found`);
    }
    
    // This would be implemented based on data source type
    console.log(`Sending request to data source ${dataSourceId}:`, request);
    return null;
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionStatusChange(callback: ConnectionStatusListener): () => void {
    this.connectionStatusListeners.push(callback);
    
    return () => {
      const index = this.connectionStatusListeners.indexOf(callback);
      if (index > -1) {
        this.connectionStatusListeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to data source errors
   */
  onError(callback: ErrorListener): () => void {
    this.errorListeners.push(callback);
    
    return () => {
      const index = this.errorListeners.indexOf(callback);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * Handle data source events
   */
  private handleDataSourceEvent(dataSourceId: string, event: DataSourceEvent): void {
    // Update connection status
    if (event.type === 'connected' || event.type === 'disconnected' || 
        event.type === 'error' || event.type === 'connecting') {
      const dataSource = this.getDataSource(dataSourceId);
      if (dataSource) {
        this.notifyConnectionStatusChange(dataSourceId, dataSource.status);
      }
    }
    
    // Handle errors
    if (event.type === 'error' && event.error) {
      this.notifyError(dataSourceId, event.error);
    }
  }

  /**
   * Notify connection status listeners
   */
  private notifyConnectionStatusChange(dataSourceId: string, status: ConnectionStatus): void {
    this.connectionStatusListeners.forEach(listener => {
      try {
        listener(dataSourceId, status);
      } catch (error) {
        console.error('Error in connection status listener:', error);
      }
    });
  }

  /**
   * Notify error listeners
   */
  private notifyError(dataSourceId: string, error: Error): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(dataSourceId, error);
      } catch (error) {
        console.error('Error in error listener:', error);
      }
    });
  }

  /**
   * Activate a data source (similar to connect)
   */
  async activateDataSource(id: string): Promise<void> {
    return this.connect(id);
  }
  
  /**
   * Deactivate a data source (similar to disconnect)
   */
  async deactivateDataSource(id: string): Promise<void> {
    return this.disconnect(id);
  }

  /**
   * Cleanup all data sources
   */
  async dispose(): Promise<void> {
    // Disconnect all data sources
    const disconnectPromises = Array.from(this.dataSources.values())
      .filter(ds => ds.status === 'connected')
      .map(ds => ds.disconnect());
    
    await Promise.all(disconnectPromises);
    
    // Clear all
    this.dataSources.clear();
    this.connectionStatusListeners = [];
    this.errorListeners = [];
  }
}