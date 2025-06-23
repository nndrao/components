/**
 * WebSocket Service
 * 
 * Provides WebSocket connectivity using STOMP protocol for real-time
 * data streaming. Handles connection management, subscriptions,
 * and message routing.
 */

import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { IWebSocketService } from '@/types';

/**
 * WebSocket connection options
 */
export interface WebSocketOptions {
  brokerURL: string;
  connectHeaders?: Record<string, string>;
  debug?: boolean;
  reconnectDelay?: number;
  heartbeatIncoming?: number;
  heartbeatOutgoing?: number;
  splitLargeFrames?: boolean;
}

/**
 * Subscription info
 */
interface SubscriptionInfo {
  topic: string;
  callback: (message: any) => void;
  subscription?: StompSubscription;
}

/**
 * Connection state
 */
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * WebSocket service implementation
 */
export class WebSocketService implements IWebSocketService {
  private client: Client | null = null;
  private options: WebSocketOptions | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private subscriptions: Map<string, SubscriptionInfo[]> = new Map();
  private statusListeners: Array<(status: string) => void> = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isIntentionalDisconnect = false;

  /**
   * Connect to WebSocket server
   */
  async connect(url: string, options?: any): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      console.warn('WebSocket already connected or connecting');
      return;
    }

    this.options = {
      brokerURL: url,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      ...options
    };

    this.isIntentionalDisconnect = false;
    this.updateConnectionState('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.client = new Client({
          brokerURL: this.options!.brokerURL,
          connectHeaders: this.options!.connectHeaders,
          debug: this.options!.debug ? (str) => console.log('[STOMP]', str) : () => {}, // Always provide a function
          reconnectDelay: this.options!.reconnectDelay,
          heartbeatIncoming: this.options!.heartbeatIncoming,
          heartbeatOutgoing: this.options!.heartbeatOutgoing,
          splitLargeFrames: this.options!.splitLargeFrames,

          onConnect: () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            this.updateConnectionState('connected');
            
            // Resubscribe to all topics
            this.resubscribeAll();
            
            resolve();
          },

          onStompError: (frame) => {
            console.error('STOMP error:', frame.headers['message']);
            console.error('Details:', frame.body);
            
            this.updateConnectionState('error');
            
            if (this.connectionState === 'connecting') {
              reject(new Error(`STOMP error: ${frame.headers['message']}`));
            }
          },

          onDisconnect: () => {
            console.log('WebSocket disconnected');
            
            if (!this.isIntentionalDisconnect) {
              this.updateConnectionState('disconnected');
              
              // Handle reconnection
              if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
              } else {
                console.error('Max reconnection attempts reached');
                this.updateConnectionState('error');
              }
            }
          },

          onWebSocketError: (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionState('error');
            
            if (this.connectionState === 'connecting') {
              reject(error);
            }
          }
        });

        // Activate the client
        this.client.activate();
      } catch (error) {
        this.updateConnectionState('error');
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  async disconnect(): Promise<void> {
    if (this.connectionState === 'disconnected') {
      return;
    }

    this.isIntentionalDisconnect = true;
    
    // Unsubscribe all
    this.subscriptions.forEach((infos, topic) => {
      infos.forEach(info => {
        if (info.subscription) {
          info.subscription.unsubscribe();
        }
      });
    });

    if (this.client) {
      await this.client.deactivate();
      this.client = null;
    }

    this.updateConnectionState('disconnected');
  }

  /**
   * Subscribe to a topic
   */
  subscribe(topic: string, callback: (message: any) => void): () => void {
    const info: SubscriptionInfo = {
      topic,
      callback
    };

    // Add to subscriptions map
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, []);
    }
    this.subscriptions.get(topic)!.push(info);

    // Subscribe if connected
    if (this.connectionState === 'connected' && this.client && this.client.connected) {
      this.performSubscribe(info);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(topic, callback);
    };
  }

  /**
   * Unsubscribe from a topic
   */
  unsubscribe(topic: string, callback?: (message: any) => void): void {
    const infos = this.subscriptions.get(topic);
    
    if (!infos) {
      return;
    }

    if (callback) {
      // Unsubscribe specific callback
      const index = infos.findIndex(info => info.callback === callback);
      
      if (index > -1) {
        const info = infos[index];
        
        if (info.subscription) {
          info.subscription.unsubscribe();
        }
        
        infos.splice(index, 1);
        
        if (infos.length === 0) {
          this.subscriptions.delete(topic);
        }
      }
    } else {
      // Unsubscribe all callbacks for this topic
      infos.forEach(info => {
        if (info.subscription) {
          info.subscription.unsubscribe();
        }
      });
      
      this.subscriptions.delete(topic);
    }
  }

  /**
   * Send a message
   */
  send(destination: string, message: any): void {
    if (!this.client || !this.client.connected) {
      throw new Error('WebSocket not connected');
    }

    const body = typeof message === 'string' ? message : JSON.stringify(message);
    
    this.client.publish({
      destination,
      body
    });
  }

  /**
   * Get connection status
   */
  getStatus(): 'connected' | 'disconnected' | 'connecting' | 'error' {
    return this.connectionState;
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(callback: (status: string) => void): () => void {
    this.statusListeners.push(callback);
    
    // Immediately notify current status
    callback(this.connectionState);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusListeners.indexOf(callback);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && 
           this.client !== null && 
           this.client.connected;
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Get subscription count for a topic
   */
  getSubscriptionCount(topic: string): number {
    return this.subscriptions.get(topic)?.length || 0;
  }

  /**
   * Perform actual subscription
   */
  private performSubscribe(info: SubscriptionInfo): void {
    if (!this.client || !this.client.connected) {
      return;
    }

    try {
      info.subscription = this.client.subscribe(info.topic, (message: IMessage) => {
        try {
          // Parse message body
          let data;
          
          try {
            data = JSON.parse(message.body);
          } catch {
            // If not JSON, pass as-is
            data = message.body;
          }
          
          // Call the callback
          info.callback(data);
        } catch (error) {
          console.error(`Error processing message from ${info.topic}:`, error);
        }
      });
      
      console.log(`Subscribed to topic: ${info.topic}`);
    } catch (error) {
      console.error(`Failed to subscribe to ${info.topic}:`, error);
    }
  }

  /**
   * Resubscribe to all topics after reconnection
   */
  private resubscribeAll(): void {
    console.log('Resubscribing to all topics...');
    
    this.subscriptions.forEach((infos, topic) => {
      infos.forEach(info => {
        this.performSubscribe(info);
      });
    });
  }

  /**
   * Update connection state and notify listeners
   */
  private updateConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      
      this.statusListeners.forEach(listener => {
        try {
          listener(state);
        } catch (error) {
          console.error('Error in status listener:', error);
        }
      });
    }
  }

  /**
   * Send a request and wait for response
   */
  async request(
    destination: string, 
    message: any, 
    responseDestination: string,
    timeout: number = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error('Request timeout'));
      }, timeout);

      const unsubscribe = this.subscribe(responseDestination, (response) => {
        clearTimeout(timer);
        unsubscribe();
        resolve(response);
      });

      try {
        this.send(destination, message);
      } catch (error) {
        clearTimeout(timer);
        unsubscribe();
        reject(error);
      }
    });
  }

  /**
   * Get connection statistics
   */
  getStatistics(): {
    connected: boolean;
    connectionState: string;
    reconnectAttempts: number;
    activeSubscriptions: number;
    topics: string[];
  } {
    return {
      connected: this.isConnected(),
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      activeSubscriptions: this.subscriptions.size,
      topics: Array.from(this.subscriptions.keys())
    };
  }

  /**
   * Reset reconnection attempts
   */
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  /**
   * Set max reconnection attempts
   */
  setMaxReconnectAttempts(max: number): void {
    this.maxReconnectAttempts = max;
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    await this.disconnect();
    this.subscriptions.clear();
    this.statusListeners = [];
  }
}