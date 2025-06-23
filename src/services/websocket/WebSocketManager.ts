import { EventEmitter } from './EventEmitter';
import { WebSocketClient } from './WebSocketClient';
import type { WebSocketConfig, ConnectionStatus, DataSourceEvent } from '@/types/agv1/datasource.types';

export interface ManagedConnection {
  id: string;
  name: string;
  client: WebSocketClient;
  config: WebSocketConfig;
  status: ConnectionStatus;
  createdAt: Date;
  lastActivity?: Date;
  metrics: {
    messagesReceived: number;
    messagesSent: number;
    reconnectCount: number;
    errors: number;
  };
}

export interface ConnectionOptions {
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

/**
 * WebSocket Manager Service
 * 
 * Manages multiple WebSocket connections, provides connection pooling,
 * monitoring, and centralized event handling.
 */
export class WebSocketManager extends EventEmitter {
  private connections: Map<string, ManagedConnection> = new Map();
  private defaultOptions: ConnectionOptions = {
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectDelay: 1000,
    heartbeatInterval: 30000,
  };

  constructor(defaultOptions?: Partial<ConnectionOptions>) {
    super();
    if (defaultOptions) {
      this.defaultOptions = { ...this.defaultOptions, ...defaultOptions };
    }
  }

  /**
   * Create a new WebSocket connection
   */
  public async createConnection(
    id: string,
    name: string,
    config: WebSocketConfig,
    options?: ConnectionOptions
  ): Promise<ManagedConnection> {
    if (this.connections.has(id)) {
      throw new Error(`Connection with id '${id}' already exists`);
    }

    // Merge options
    const connectionOptions = { ...this.defaultOptions, ...options };
    const wsConfig: WebSocketConfig = {
      ...config,
      reconnect: {
        enabled: connectionOptions.autoReconnect || false,
        delay: connectionOptions.reconnectDelay || 1000,
        maxDelay: 30000,
        maxAttempts: connectionOptions.maxReconnectAttempts || 10,
      },
      heartbeat: {
        incoming: connectionOptions.heartbeatInterval || 30000,
        outgoing: connectionOptions.heartbeatInterval || 30000,
      },
    };

    // Create client
    const client = new WebSocketClient(wsConfig);
    
    // Create managed connection
    const connection: ManagedConnection = {
      id,
      name,
      client,
      config: wsConfig,
      status: 'disconnected',
      createdAt: new Date(),
      metrics: {
        messagesReceived: 0,
        messagesSent: 0,
        reconnectCount: 0,
        errors: 0,
      },
    };

    // Set up event handlers
    this.setupConnectionHandlers(connection);

    // Store connection
    this.connections.set(id, connection);

    // Emit connection created event
    this.emit('connectionCreated', connection);

    return connection;
  }

  /**
   * Get a connection by ID
   */
  public getConnection(id: string): ManagedConnection | undefined {
    return this.connections.get(id);
  }

  /**
   * Get all connections
   */
  public getAllConnections(): ManagedConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Connect to a WebSocket
   */
  public async connect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection '${connectionId}' not found`);
    }

    if (connection.status === 'connected' || connection.status === 'connecting') {
      return;
    }

    try {
      await connection.client.connect();
      connection.lastActivity = new Date();
    } catch (error) {
      connection.metrics.errors++;
      throw error;
    }
  }

  /**
   * Disconnect from a WebSocket
   */
  public async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection '${connectionId}' not found`);
    }

    if (connection.status === 'disconnected') {
      return;
    }

    await connection.client.disconnect();
  }

  /**
   * Remove a connection
   */
  public async removeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    // Disconnect if connected
    if (connection.status !== 'disconnected') {
      await connection.client.disconnect();
    }

    // Remove event listeners
    connection.client.removeAllListeners();

    // Remove from map
    this.connections.delete(connectionId);

    // Emit event
    this.emit('connectionRemoved', connection);
  }

  /**
   * Subscribe to a topic on a connection
   */
  public subscribe(
    connectionId: string,
    topic: string,
    callback: (data: any) => void,
    options?: any
  ): string {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection '${connectionId}' not found`);
    }

    if (connection.status !== 'connected') {
      throw new Error(`Connection '${connectionId}' is not connected`);
    }

    return connection.client.subscribe(topic, callback, options);
  }

  /**
   * Unsubscribe from a topic
   */
  public unsubscribe(connectionId: string, subscriptionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection '${connectionId}' not found`);
    }

    connection.client.unsubscribe(subscriptionId);
  }

  /**
   * Publish a message
   */
  public publish(
    connectionId: string,
    topic: string,
    data: any,
    headers?: Record<string, string>
  ): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection '${connectionId}' not found`);
    }

    if (connection.status !== 'connected') {
      throw new Error(`Connection '${connectionId}' is not connected`);
    }

    connection.client.publish(topic, data, headers);
    connection.metrics.messagesSent++;
    connection.lastActivity = new Date();
  }

  /**
   * Get connection statistics
   */
  public getStatistics() {
    const connections = Array.from(this.connections.values());
    
    return {
      totalConnections: connections.length,
      activeConnections: connections.filter(c => c.status === 'connected').length,
      totalMessagesReceived: connections.reduce((sum, c) => sum + c.metrics.messagesReceived, 0),
      totalMessagesSent: connections.reduce((sum, c) => sum + c.metrics.messagesSent, 0),
      totalErrors: connections.reduce((sum, c) => sum + c.metrics.errors, 0),
      connections: connections.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        metrics: c.metrics,
        uptime: c.status === 'connected' && c.lastActivity 
          ? Date.now() - c.lastActivity.getTime() 
          : 0,
      })),
    };
  }

  /**
   * Set up event handlers for a connection
   */
  private setupConnectionHandlers(connection: ManagedConnection): void {
    const { client } = connection;

    // Connection state changes
    client.on('connectionStateChange', (state) => {
      connection.status = state.status;
      
      if (state.status === 'connected') {
        connection.lastActivity = new Date();
      }
      
      if (state.reconnectCount) {
        connection.metrics.reconnectCount = state.reconnectCount;
      }

      this.emit('connectionStateChange', {
        connectionId: connection.id,
        ...state,
      });
    });

    // Data source events
    client.on('dataSourceEvent', (event: DataSourceEvent) => {
      if (event.type === 'data-received') {
        connection.metrics.messagesReceived++;
        connection.lastActivity = new Date();
      }
      
      if (event.type === 'error') {
        connection.metrics.errors++;
      }

      this.emit('dataSourceEvent', {
        connectionId: connection.id,
        event,
      });
    });
  }

  /**
   * Clean up all connections
   */
  public async dispose(): Promise<void> {
    // Disconnect all connections
    const disconnectPromises = Array.from(this.connections.values())
      .filter(c => c.status !== 'disconnected')
      .map(c => this.disconnect(c.id));

    await Promise.all(disconnectPromises);

    // Clear all
    this.connections.clear();
    this.removeAllListeners();
  }
}