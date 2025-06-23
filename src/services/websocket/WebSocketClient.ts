import { Client, IMessage, StompConfig, messageCallbackType } from '@stomp/stompjs';
import { EventEmitter } from './EventEmitter';
import type { 
  WebSocketConfig, 
  DataUpdate, 
  ConnectionStatus,
  DataSourceEvent,
  DataSourceEventType,
  SubscriptionOptions
} from '@/types/agv1/datasource.types';

export interface WebSocketSubscription {
  id: string;
  topic: string;
  callback: messageCallbackType;
  unsubscribe: () => void;
}

export interface ConnectionState {
  status: ConnectionStatus;
  connectedAt?: Date;
  disconnectedAt?: Date;
  reconnectCount: number;
  lastError?: string;
}

export class WebSocketClient extends EventEmitter {
  private client: Client;
  private config: WebSocketConfig;
  private subscriptions: Map<string, WebSocketSubscription>;
  private connectionState: ConnectionState;
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private messageBuffer: DataUpdate[] = [];
  private batchTimer?: NodeJS.Timeout;
  private messageStats = {
    received: 0,
    processed: 0,
    dropped: 0,
    errors: 0,
  };

  constructor(config: WebSocketConfig) {
    super();
    this.config = config;
    this.subscriptions = new Map();
    this.connectionState = {
      status: 'disconnected',
      reconnectCount: 0,
    };

    this.client = new Client(this.createStompConfig());
    this.setupEventHandlers();
  }

  private createStompConfig(): StompConfig {
    return {
      brokerURL: this.config.url,
      connectHeaders: this.config.headers || {},
      debug: this.config.debug ? (str) => console.log('[STOMP]', str) : undefined,
      reconnectDelay: this.config.reconnect?.enabled ? this.config.reconnect.delay : 0,
      heartbeatIncoming: this.config.heartbeat?.incoming || 10000,
      heartbeatOutgoing: this.config.heartbeat?.outgoing || 10000,
      splitLargeFrames: true,
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      
      onConnect: this.handleConnect.bind(this),
      onDisconnect: this.handleDisconnect.bind(this),
      onStompError: this.handleStompError.bind(this),
      onWebSocketClose: this.handleWebSocketClose.bind(this),
      onWebSocketError: this.handleWebSocketError.bind(this),
    };
  }

  private setupEventHandlers(): void {
    // Limit the number of reconnection attempts
    if (this.config.reconnect?.enabled) {
      this.client.configure({
        beforeConnect: () => {
          if (this.connectionState.reconnectCount >= (this.config.reconnect?.maxAttempts || 10)) {
            console.error('Max reconnection attempts reached');
            this.updateConnectionState('error', 'Max reconnection attempts reached');
            this.client.deactivate();
            return;
          }
        },
      });
    }
  }

  private handleConnect(): void {
    console.log('WebSocket connected');
    this.updateConnectionState('connected');
    this.connectionState.connectedAt = new Date();
    this.connectionState.reconnectCount = 0;
    
    this.emitEvent('connected', {
      timestamp: new Date().toISOString(),
      reconnectCount: this.connectionState.reconnectCount,
    });

    // Resubscribe to all topics after reconnection
    this.resubscribeAll();
    
    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();
  }

  private handleDisconnect(): void {
    console.log('WebSocket disconnected');
    this.updateConnectionState('disconnected');
    this.connectionState.disconnectedAt = new Date();
    
    this.emitEvent('disconnected', {
      timestamp: new Date().toISOString(),
    });

    this.stopHeartbeatMonitoring();
    
    // Handle reconnection
    if (this.config.reconnect?.enabled && 
        this.connectionState.reconnectCount < (this.config.reconnect.maxAttempts || 10)) {
      this.scheduleReconnect();
    }
  }

  private handleStompError(frame: any): void {
    console.error('STOMP error:', frame);
    const errorMessage = frame.headers?.message || 'Unknown STOMP error';
    this.updateConnectionState('error', errorMessage);
    
    this.emitEvent('error', {
      error: new Error(errorMessage),
      timestamp: new Date().toISOString(),
    });

    this.messageStats.errors++;
  }

  private handleWebSocketClose(event: CloseEvent): void {
    console.log('WebSocket closed:', event);
    this.handleDisconnect();
  }

  private handleWebSocketError(event: Event): void {
    console.error('WebSocket error:', event);
    this.updateConnectionState('error', 'WebSocket connection error');
  }

  private updateConnectionState(status: ConnectionStatus, error?: string): void {
    this.connectionState.status = status;
    if (error) {
      this.connectionState.lastError = error;
    }
    
    this.emit('connectionStateChange', this.connectionState);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(
      this.config.reconnect!.delay * Math.pow(2, this.connectionState.reconnectCount),
      this.config.reconnect!.maxDelay
    );

    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.connectionState.reconnectCount + 1})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connectionState.reconnectCount++;
      this.updateConnectionState('connecting');
      this.emitEvent('reconnecting', {
        attempt: this.connectionState.reconnectCount,
        timestamp: new Date().toISOString(),
      });
      
      this.client.activate();
    }, delay);
  }

  private startHeartbeatMonitoring(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    // Monitor connection health
    this.heartbeatTimer = setInterval(() => {
      if (!this.client.connected) {
        console.warn('Heartbeat check: Connection lost');
        this.handleDisconnect();
      }
    }, this.config.heartbeat?.incoming || 10000);
  }

  private stopHeartbeatMonitoring(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private resubscribeAll(): void {
    console.log(`Resubscribing to ${this.subscriptions.size} topics`);
    this.subscriptions.forEach((subscription) => {
      // Recreate the subscription
      const newSub = this.client.subscribe(subscription.topic, subscription.callback);
      subscription.unsubscribe = () => newSub.unsubscribe();
    });
  }

  private emitEvent(type: DataSourceEventType, data?: any): void {
    const event: DataSourceEvent = {
      type,
      source: 'websocket',
      timestamp: new Date().toISOString(),
      data,
    };
    
    this.emit('dataSourceEvent', event);
  }

  // Public API

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.client.connected) {
        resolve();
        return;
      }

      this.updateConnectionState('connecting');
      
      const connectHandler = () => {
        this.off('connected', connectHandler);
        this.off('error', errorHandler);
        resolve();
      };

      const errorHandler = (event: DataSourceEvent) => {
        this.off('connected', connectHandler);
        this.off('error', errorHandler);
        reject(event.error || new Error('Connection failed'));
      };

      this.once('connected', connectHandler);
      this.once('error', errorHandler);

      try {
        this.client.activate();
      } catch (error) {
        this.off('connected', connectHandler);
        this.off('error', errorHandler);
        reject(error);
      }
    });
  }

  public disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.client.connected) {
        resolve();
        return;
      }

      // Clear all timers
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }
      this.stopHeartbeatMonitoring();

      // Clear subscriptions
      this.subscriptions.forEach((sub) => sub.unsubscribe());
      this.subscriptions.clear();

      this.client.deactivate().then(() => {
        this.updateConnectionState('disconnected');
        resolve();
      });
    });
  }

  public subscribe(
    topic: string,
    callback: (update: DataUpdate) => void,
    options?: SubscriptionOptions
  ): string {
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const messageHandler: messageCallbackType = (message: IMessage) => {
      try {
        this.messageStats.received++;
        
        const body = JSON.parse(message.body);
        const update: DataUpdate = {
          type: body.type || 'update',
          timestamp: body.timestamp || new Date().toISOString(),
          data: body.data,
          key: body.key,
          metadata: {
            ...body.metadata,
            topic,
            subscriptionId,
          },
        };

        // Apply filters if specified
        if (options?.filter && !options.filter(update.data)) {
          return;
        }

        // Handle throttling
        if (options?.throttle) {
          this.throttleUpdate(update, callback, options.throttle);
        } else {
          callback(update);
          this.messageStats.processed++;
        }
      } catch (error) {
        console.error('Error processing message:', error);
        this.messageStats.errors++;
      }
    };

    const stompSubscription = this.client.subscribe(topic, messageHandler);
    
    const subscription: WebSocketSubscription = {
      id: subscriptionId,
      topic,
      callback: messageHandler,
      unsubscribe: () => {
        stompSubscription.unsubscribe();
        this.subscriptions.delete(subscriptionId);
        this.emitEvent('subscription-removed', { subscriptionId, topic });
      },
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.emitEvent('subscription-added', { subscriptionId, topic });

    return subscriptionId;
  }

  public unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.unsubscribe();
    }
  }

  public publish(topic: string, data: any, headers?: Record<string, string>): void {
    if (!this.client.connected) {
      throw new Error('WebSocket is not connected');
    }

    this.client.publish({
      destination: topic,
      body: JSON.stringify(data),
      headers: headers || {},
    });
  }

  public getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  public getStatistics() {
    return {
      connection: this.getConnectionState(),
      messages: { ...this.messageStats },
      subscriptions: this.subscriptions.size,
    };
  }

  private throttleUpdate(
    update: DataUpdate,
    callback: (update: DataUpdate) => void,
    throttleMs: number
  ): void {
    this.messageBuffer.push(update);

    if (this.batchTimer) {
      return;
    }

    this.batchTimer = setTimeout(() => {
      const updates = [...this.messageBuffer];
      this.messageBuffer = [];
      this.batchTimer = undefined;

      // Process all buffered updates
      updates.forEach((u) => {
        callback(u);
        this.messageStats.processed++;
      });
    }, throttleMs);
  }

  public isConnected(): boolean {
    return this.client.connected;
  }

  public getClient(): Client {
    return this.client;
  }
}