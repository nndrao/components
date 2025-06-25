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

  constructor(config: DataProviderConfig) {
    super(config);
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
      // Create STOMP client
      this.stompClient = new Client({
        brokerURL: this.config.connection.url,
        reconnectDelay: 5000,
        heartbeatIncoming: 0,
        heartbeatOutgoing: 0,
        debug: (str) => {
          if (this.config.debug) {
            console.log('[STOMP]', str);
          }
        }
      });

      // Set up connection handlers
      this.stompClient.onConnect = () => {
        console.log('[WebSocketDataProvider] STOMP connected');
        this.handleConnect();
        this.isSnapshotComplete = false;
        
        // Subscribe to data topic
        const listenerTopic = this.config.settings?.listenerTopic || `/snapshot/${this.config.dataType || 'positions'}`;
        
        console.log(`[WebSocketDataProvider] Subscribing to: ${listenerTopic}`);
        this.stompClient!.subscribe(listenerTopic, (message) => {
          this.handleStompMessage(message);
        });
        
        // Send trigger message to start data flow
        const triggerDestination = this.config.settings?.triggerDestination;
        const triggerMessage = this.config.settings?.triggerMessage;
        const triggerFormat = this.config.settings?.triggerFormat || 'text';
        
        if (triggerDestination && triggerMessage) {
          console.log(`[WebSocketDataProvider] Sending trigger to: ${triggerDestination}`);
          
          let body: string;
          if (triggerFormat === 'json') {
            try {
              // Validate JSON
              JSON.parse(triggerMessage);
              body = triggerMessage;
            } catch (e) {
              console.error('[WebSocketDataProvider] Invalid JSON trigger message:', e);
              body = triggerMessage; // Send as-is anyway
            }
          } else {
            body = triggerMessage;
          }
          
          this.stompClient!.publish({
            destination: triggerDestination,
            body: body,
            headers: triggerFormat === 'json' ? { 'content-type': 'application/json' } : {}
          });
        } else {
          // Fallback to legacy format
          const dataType = this.config.dataType || 'positions';
          const rate = this.config.messageRate || 1000;
          const batchSize = this.config.batchSize || Math.floor(rate / 10);
          const trigger = `/snapshot/${dataType}/${rate}/${batchSize}`;
          
          console.log(`[WebSocketDataProvider] Using legacy trigger: ${trigger}`);
          this.stompClient!.publish({
            destination: trigger,
            body: trigger
          });
        }
      };

      this.stompClient.onStompError = (frame) => {
        console.error('[WebSocketDataProvider] STOMP error:', frame);
        this.handleError(new Error(frame.headers.message || 'STOMP error'));
      };

      this.stompClient.onDisconnect = () => {
        console.log('[WebSocketDataProvider] STOMP disconnected');
        this.handleDisconnect('STOMP disconnected');
      };

      // Activate the client
      await this.stompClient.activate();
      
      // Wait for connection
      await this.waitForConnection();
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from STOMP server
   */
  async disconnect(): Promise<void> {
    if (this.stompClient) {
      await this.stompClient.deactivate();
      this.stompClient = undefined;
    }
    this.isSnapshotComplete = false;
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
    try {
      const body = message.body;
      
      // Check if this is the success message
      if (body.includes('Success:') && body.includes('Starting live updates')) {
        console.log('[WebSocketDataProvider] Snapshot complete, receiving live updates');
        this.isSnapshotComplete = true;
        this.emit('snapshotComplete', true);
        return;
      }
      
      // Parse data
      const data = JSON.parse(body);
      
      // Handle data through base class
      this.handleData(data);
    } catch (error) {
      console.error('[WebSocketDataProvider] Error handling message:', error);
      this.handleError(error as Error);
    }
  }

  /**
   * Override send to support STOMP destinations
   */
  async send(trigger: DataProviderTrigger): Promise<void> {
    if (!this.stompClient || !this.stompClient.connected) {
      throw new Error('STOMP client not connected');
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