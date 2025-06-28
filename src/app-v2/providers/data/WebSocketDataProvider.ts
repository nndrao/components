/**
 * WebSocket Data Provider (STOMP-based)
 * 
 * Provides real-time data through STOMP WebSocket connections.
 * Handles both snapshot data delivery and live updates.
 */

import { Client, IMessage } from '@stomp/stompjs';
import { BaseDataProvider } from './BaseDataProvider';
import {
  DataProviderConfig,
  ConnectionStatus,
  DataProviderTrigger,
} from './data-provider.types';

export class WebSocketDataProvider extends BaseDataProvider {
  private stompClient?: Client;
  private isSnapshotComplete = false;
  private snapshotBuffer: any[] = [];
  private cachedSnapshot: any[] | null = null;
  private subscriptions = new Map<string, any>();
  private hasEmittedSnapshot = false;
  private messageCount = 0;
  private endTokenCount = 0;
  
  // Batched snapshot delivery
  private realtimeUpdateBuffer: any[] = [];
  private totalSnapshotReceived = 0;
  private hasEmittedFinalSnapshot = false;
  private readonly BATCH_SIZE = 5000;

  constructor(config: DataProviderConfig) {
    super(config);
  }

  /**
   * Override to provide cached snapshot to late subscribers
   */
  on<K extends keyof import('./data-provider.types').DataProviderEvents>(
    event: K,
    handler: import('./data-provider.types').DataProviderEvents[K]
  ): void {
    super.on(event, handler);
    
    // Removed automatic cached snapshot emission to prevent duplicates
    // The DataProviderManager handles snapshot caching and distribution
  }

  /**
   * Test method to manually trigger snapshot
   */
  testEmitSnapshot(): void {
    if (this.cachedSnapshot && this.cachedSnapshot.length > 0) {
      this.emit('snapshot', this.cachedSnapshot);
    } else if (this.snapshotBuffer.length > 0) {
      const snapshotData = [...this.snapshotBuffer];
      this.cachedSnapshot = snapshotData;
      this.isSnapshotComplete = true;
      this.emit('snapshot', snapshotData);
    } else {
      console.log(`[WebSocketDataProvider-${this.id}] No snapshot data to emit`);
    }
  }

  /**
   * Connect to STOMP server
   */
  async connect(): Promise<void> {
    if (this.state.status === ConnectionStatus.Connected) {
      return;
    }

    this.updateStatus(ConnectionStatus.Connecting);

    try {
      // Create a dedicated STOMP client for this data source
      console.log(`[WebSocketDataProvider-${this.id}] Creating STOMP client for ${this.config.connection.url}`);
      
      this.stompClient = new Client({
        brokerURL: this.config.connection.url,
        reconnectDelay: 0, // Disable automatic reconnection - we'll handle it ourselves
        connectionTimeout: this.config.connection.timeout || 10000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        debug: (str) => {
          if (str.includes('ERROR') || str.includes('error')) {
            console.error(`[WebSocketDataProvider-${this.id}] STOMP Debug:`, str);
          }
        }
      });

      // Set up connection handlers
      this.stompClient.onConnect = (frame) => {
        console.log(`[WebSocketDataProvider-${this.id}] Connected to ${this.config.connection.url}`);
        
        // Reset snapshot state BEFORE calling handleConnect
        this.isSnapshotComplete = false;
        this.snapshotBuffer = [];
        this.cachedSnapshot = null;
        this.hasEmittedSnapshot = false;
        this.hasEmittedFinalSnapshot = false;
        this.messageCount = 0;
        this.endTokenCount = 0;
        this.totalSnapshotReceived = 0;
        this.realtimeUpdateBuffer = [];
        this.handleConnect();
        
        // Subscribe to data topic
        const listenerTopic = this.config.settings?.listenerTopic || `/snapshot/${this.config.dataType || 'positions'}`;
        
        // Create a unique subscription ID for this provider instance
        const subscriptionId = `${this.id}_${listenerTopic}`;
        
        // Check if already subscribed to this topic
        if (!this.subscriptions.has(subscriptionId)) {
          try {
            // Create a message handler that only processes messages for this provider
            const messageHandler = (message: IMessage) => {
              // Only process if this provider hasn't been disconnected
              if (this.state.status === ConnectionStatus.Connected) {
                this.handleStompMessage(message);
              } else {
                console.log(`[WebSocketDataProvider-${this.id}] Ignoring message - not connected or snapshot complete`);
              }
            };
            
            const subscription = this.stompClient!.subscribe(listenerTopic, messageHandler);
            
            // Store subscription for cleanup
            this.subscriptions.set(subscriptionId, subscription);
            console.log(`[WebSocketDataProvider-${this.id}] Subscribed to ${listenerTopic}`);
          } catch (error) {
            this.handleError(new Error(`Failed to subscribe to ${listenerTopic}: ${error}`));
          }
        } else {
          console.log(`[WebSocketDataProvider-${this.id}] Already subscribed to ${listenerTopic}`);
        }
        
        // Send trigger message to start data flow (with small delay to ensure connection is ready)
        setTimeout(() => {
          this.sendTriggerMessage();
        }, 100);
      };

      this.stompClient.onStompError = (frame) => {
        console.error(`[WebSocketDataProvider-${this.id}] STOMP Error:`, frame);
        this.handleError(new Error(frame.headers.message || 'STOMP error'));
      };

      this.stompClient.onDisconnect = (frame) => {
        console.log(`[WebSocketDataProvider-${this.id}] Disconnected:`, frame);
        this.handleDisconnect('STOMP disconnected');
      };
      
      this.stompClient.onWebSocketError = (event) => {
        console.error(`[WebSocketDataProvider-${this.id}] WebSocket Error:`, event);
      };

      // Activate the client
      console.log(`[WebSocketDataProvider-${this.id}] Activating STOMP client...`);
      await this.stompClient.activate();
      
      // Wait for connection
      console.log(`[WebSocketDataProvider-${this.id}] Waiting for connection...`);
      await this.waitForConnection();
      console.log(`[WebSocketDataProvider-${this.id}] Connection established!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[WebSocketDataProvider-${this.id}] Connection failed: ${errorMessage}`);
      
      // Add more context to the error
      if (errorMessage.includes('Connection timeout')) {
        const enhancedError = new Error(
          `Failed to connect to WebSocket server at ${this.config.connection.url}. ` +
          `Please ensure the server is running and accessible.`
        );
        this.handleError(enhancedError);
        throw enhancedError;
      } else {
        this.handleError(error as Error);
        throw error;
      }
    }
  }

  /**
   * Disconnect from STOMP server
   */
  async disconnect(): Promise<void> {
    // Unsubscribe from all topics
    this.subscriptions.forEach((subscription) => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
    this.subscriptions.clear();
    
    if (this.stompClient) {
      await this.stompClient.deactivate();
      this.stompClient = undefined;
    }
    this.isSnapshotComplete = false;
    this.snapshotBuffer = [];
    this.cachedSnapshot = null;
    this.hasEmittedSnapshot = false;
    this.hasEmittedFinalSnapshot = false;
    this.totalSnapshotReceived = 0;
    this.realtimeUpdateBuffer = [];
    this.updateStatus(ConnectionStatus.Disconnected);
  }

  /**
   * Send message implementation
   */
  protected async sendImpl(message: string | ArrayBuffer): Promise<void> {
    if (!this.stompClient || !this.stompClient.connected) {
      throw new Error('STOMP client is not connected');
    }

    // For STOMP, we need a destination
    // If message looks like a path, use it as destination
    if (typeof message === 'string' && message.startsWith('/')) {
      this.stompClient.publish({
        destination: message,
        body: message
      });
    } else {
      // Send to default destination
      this.stompClient.publish({
        destination: '/app/message',
        body: typeof message === 'string' ? message : ''
      });
    }
  }

  /**
   * Send trigger message to start data flow
   */
  private sendTriggerMessage(): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.error(`[WebSocketDataProvider-${this.id}] Cannot send trigger - not connected`);
      return;
    }
    
    const triggerDestination = this.config.settings?.triggerDestination;
    const triggerMessage = this.config.settings?.triggerMessage;
    const triggerFormat = this.config.settings?.triggerFormat || 'text';
    
    if (triggerDestination && triggerMessage) {
      let body: string;
      if (triggerFormat === 'json') {
        try {
          // Validate JSON
          JSON.parse(triggerMessage);
          body = triggerMessage;
        } catch (e) {
          body = triggerMessage; // Send as-is anyway
        }
      } else {
        body = triggerMessage;
      }
      
      this.stompClient.publish({
        destination: triggerDestination,
        body: body,
        headers: triggerFormat === 'json' ? { 'content-type': 'application/json' } : {}
      });
      
      console.log(`[WebSocketDataProvider-${this.id}] Sent trigger to ${triggerDestination}`);
    } else {
      // Fallback to legacy format
      const dataType = this.config.dataType || 'positions';
      const rate = this.config.messageRate || 1000;
      const batchSize = this.config.batchSize || Math.floor(rate / 10);
      const trigger = `/snapshot/${dataType}/${rate}/${batchSize}`;
      
      this.stompClient.publish({
        destination: trigger,
        body: trigger
      });
      
      console.log(`[WebSocketDataProvider-${this.id}] Sent legacy trigger: ${trigger}`);
    }
  }

  /**
   * Wait for connection to be established
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = this.config.connection.timeout || 10000;
      const startTime = Date.now();

      const checkConnection = () => {
        if (this.stompClient?.connected) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Connection timeout'));
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  /**
   * Handle STOMP message
   */
  private handleStompMessage(message: IMessage): void {
    this.messageCount++;
    
    try {
      const body = message.body;
      console.log(`[WebSocketDataProvider-${this.id}] Message #${this.messageCount}: ${body.substring(0, 100)}...`);
      
      // Check if this message indicates end of snapshot
      const snapshotEndToken = this.config.settings?.snapshotEndToken;
      const bodyLower = body.toLowerCase();
      
      // Check for any end-of-snapshot indicator
      const isEndOfSnapshot = 
        (snapshotEndToken && bodyLower.startsWith(snapshotEndToken.toLowerCase())) ||
        (bodyLower.includes('success:') && bodyLower.includes('starting live updates')) ||
        bodyLower.includes('snapshot complete') ||
        bodyLower.includes('end_snapshot') ||
        (bodyLower.startsWith('success:') && bodyLower.includes('snapshot'));
      
      if (isEndOfSnapshot) {
        this.endTokenCount++;
        console.log(`[WebSocketDataProvider-${this.id}] End token #${this.endTokenCount} detected: "${body.substring(0, 50)}..."`);
        
        // Only process if we haven't already completed the snapshot
        if (!this.isSnapshotComplete) {
          // Emit any remaining data as final batch
          if (this.snapshotBuffer.length > 0) {
            this.totalSnapshotReceived += this.snapshotBuffer.length;
            console.log(`[WebSocketDataProvider-${this.id}] Emitting final batch of ${this.snapshotBuffer.length} records. Total snapshot: ${this.totalSnapshotReceived} records`);
            
            // Emit final batch with isPartial: false
            this.emit('snapshot', [...this.snapshotBuffer], { 
              isPartial: false, 
              totalReceived: this.totalSnapshotReceived 
            });
            
            // Cache the complete snapshot count for late subscribers
            this.cachedSnapshot = { totalReceived: this.totalSnapshotReceived };
            this.snapshotBuffer = [];
          } else {
            // No remaining data, just emit completion signal
            console.log(`[WebSocketDataProvider-${this.id}] Snapshot complete. Total: ${this.totalSnapshotReceived} records`);
            this.emit('snapshot', [], { 
              isPartial: false, 
              totalReceived: this.totalSnapshotReceived 
            });
          }
          
          this.isSnapshotComplete = true;
          this.hasEmittedFinalSnapshot = true;
          this.hasEmittedSnapshot = true;
          this.emit('snapshotComplete', true);
          
          // Process any buffered real-time updates
          if (this.realtimeUpdateBuffer.length > 0) {
            console.log(`[WebSocketDataProvider-${this.id}] Processing ${this.realtimeUpdateBuffer.length} buffered real-time updates`);
            this.realtimeUpdateBuffer.forEach(update => {
              this.handleData(update);
            });
            this.realtimeUpdateBuffer = [];
          }
        } else {
          console.log(`[WebSocketDataProvider-${this.id}] Ignoring duplicate end-of-snapshot message`);
        }
        
        return;
      }
      
      // Try to parse as JSON data
      let data;
      try {
        data = JSON.parse(body);
      } catch (e) {
        // Not JSON, might be a control message
        console.log(`[WebSocketDataProvider-${this.id}] Non-JSON message received: "${body.substring(0, 50)}..."`);
        return;
      }
      
      // If we haven't completed the snapshot yet, buffer the data
      if (!this.isSnapshotComplete) {
        const beforeCount = this.snapshotBuffer.length;
        if (Array.isArray(data)) {
          this.snapshotBuffer.push(...data);
          console.log(`[WebSocketDataProvider-${this.id}] Buffered ${data.length} records (${beforeCount} -> ${this.snapshotBuffer.length})`);
        } else {
          this.snapshotBuffer.push(data);
          console.log(`[WebSocketDataProvider-${this.id}] Buffered 1 record (${beforeCount} -> ${this.snapshotBuffer.length})`);
        }
        
        // Emit batch if we have enough data
        while (this.snapshotBuffer.length >= this.BATCH_SIZE) {
          const batch = this.snapshotBuffer.splice(0, this.BATCH_SIZE);
          this.totalSnapshotReceived += batch.length;
          console.log(`[WebSocketDataProvider-${this.id}] Emitting batch of ${batch.length} records. Total received: ${this.totalSnapshotReceived}`);
          this.emit('snapshot', batch, { 
            isPartial: true, 
            totalReceived: this.totalSnapshotReceived 
          });
        }
      } else {
        // After snapshot complete, buffer real-time updates until final snapshot is emitted
        if (!this.hasEmittedFinalSnapshot) {
          console.log(`[WebSocketDataProvider-${this.id}] Buffering real-time update during final snapshot emission`);
          this.realtimeUpdateBuffer.push(data);
        } else {
          // Process real-time updates normally
          console.log(`[WebSocketDataProvider-${this.id}] Processing real-time update: ${Array.isArray(data) ? data.length + ' records' : '1 record'}`);
          this.handleData(data);
        }
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Override send to support STOMP destinations and refresh action
   */
  async send(trigger: DataProviderTrigger): Promise<void> {
    if (!this.stompClient || !this.stompClient.connected) {
      throw new Error('STOMP client not connected');
    }
    
    // Handle refresh action - clear snapshot and request new one
    if (typeof trigger === 'object' && trigger.action === 'refresh') {
      console.log(`[WebSocketDataProvider-${this.id}] Handling refresh action`);
      
      // Only refresh if connected
      if (this.state.status !== ConnectionStatus.Connected) {
        console.warn(`[WebSocketDataProvider-${this.id}] Cannot refresh - not connected`);
        return;
      }
      
      // Clear current snapshot state to allow new snapshot
      this.isSnapshotComplete = false;
      this.snapshotBuffer = [];
      this.cachedSnapshot = null;
      this.hasEmittedSnapshot = false;
      this.hasEmittedFinalSnapshot = false;
      this.messageCount = 0;
      this.endTokenCount = 0;
      this.totalSnapshotReceived = 0;
      this.realtimeUpdateBuffer = [];
      
      // Send new trigger to request fresh snapshot
      this.sendTriggerMessage();
      
      return;
    }
    
    // Support both string and object triggers
    const message = typeof trigger === 'string' 
      ? trigger 
      : JSON.stringify(trigger);
    
    // For STOMP, we expect trigger to be a destination path
    // e.g., "/snapshot/positions/1000/100"
    if (typeof trigger === 'string' && trigger.startsWith('/')) {
      this.stompClient.publish({
        destination: trigger,
        body: trigger
      });
    } else {
      // Send as message to default destination
      await super.send(trigger);
    }
  }
}