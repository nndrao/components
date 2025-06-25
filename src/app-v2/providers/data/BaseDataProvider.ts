/**
 * Base Data Provider
 * 
 * Abstract base class for all data providers.
 */

import { TypedEventEmitter } from './TypedEventEmitter';
import {
  DataProvider,
  DataProviderConfig,
  DataProviderState,
  DataProviderEvents,
  DataProviderTrigger,
  ConnectionStatus,
  DataProviderMessage,
  TriggerFormat,
} from './data-provider.types';

export abstract class BaseDataProvider extends TypedEventEmitter<DataProviderEvents> implements DataProvider {
  public readonly id: string;
  public readonly config: DataProviderConfig;
  public state: DataProviderState;

  protected reconnectTimer?: NodeJS.Timeout;
  protected reconnectAttempts = 0;

  constructor(config: DataProviderConfig) {
    super();
    this.id = config.id;
    this.config = config;
    this.state = {
      status: ConnectionStatus.Disconnected,
      error: null,
      metadata: {
        messageCount: 0,
      },
    };
  }

  /**
   * Connect to data source
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from data source
   */
  abstract disconnect(): Promise<void>;

  /**
   * Send message implementation
   */
  protected abstract sendImpl(message: string | ArrayBuffer): Promise<void>;

  /**
   * Send message/trigger
   * Supports both plain string and JSON formats
   */
  async send(trigger: DataProviderTrigger): Promise<void> {
    if (this.state.status !== ConnectionStatus.Connected) {
      throw new Error('Provider is not connected');
    }

    try {
      // Format the trigger based on type
      let formattedMessage: string;
      
      if (typeof trigger === 'string') {
        // Plain string format
        formattedMessage = trigger;
      } else {
        // JSON format
        formattedMessage = JSON.stringify(trigger);
      }

      // Apply output transform if configured
      if (this.config.transform?.output) {
        const transform = this.config.transform.output;
        if (typeof transform === 'function') {
          formattedMessage = transform(formattedMessage);
        }
      }

      // Send the message
      await this.sendImpl(formattedMessage);

      // Emit event
      this.emit('messageSent', trigger);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Destroy provider
   */
  destroy(): void {
    this.disconnect();
    this.removeAllListeners();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
  }

  /**
   * Update connection status
   */
  protected updateStatus(status: ConnectionStatus): void {
    const previousStatus = this.state.status;
    this.state.status = status;

    if (status === ConnectionStatus.Connected) {
      this.state.metadata!.connectedAt = Date.now();
      this.reconnectAttempts = 0;
    } else if (status === ConnectionStatus.Disconnected || status === ConnectionStatus.Error) {
      this.state.metadata!.disconnectedAt = Date.now();
    }

    if (previousStatus !== status) {
      this.emit('statusChange', status);
    }
  }

  /**
   * Handle received data
   */
  protected handleData(data: any): void {
    try {
      // Parse data based on configuration
      let parsedData = data;
      
      if (this.config.transform?.parser) {
        switch (this.config.transform.parser) {
          case 'json':
            parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            break;
          case 'text':
            parsedData = typeof data === 'string' ? data : JSON.stringify(data);
            break;
          case 'custom':
            if (this.config.transform.customParser) {
              parsedData = this.config.transform.customParser(data);
            }
            break;
        }
      }

      // Apply input transform if configured
      if (this.config.transform?.input) {
        const transform = this.config.transform.input;
        if (typeof transform === 'function') {
          parsedData = transform(parsedData);
        }
      }

      // Update metadata
      this.state.metadata!.lastMessageAt = Date.now();
      this.state.metadata!.messageCount!++;

      // Emit data event
      this.emit('data', parsedData);
    } catch (error) {
      this.handleError(new Error(`Failed to parse data: ${error}`));
    }
  }

  /**
   * Handle errors
   */
  protected handleError(error: Error): void {
    this.state.error = error;
    this.emit('error', error);
    
    if (this.state.status === ConnectionStatus.Connected) {
      this.updateStatus(ConnectionStatus.Error);
    }
  }

  /**
   * Handle connection
   */
  protected handleConnect(): void {
    this.updateStatus(ConnectionStatus.Connected);
    this.emit('connect');
  }

  /**
   * Handle disconnection
   */
  protected handleDisconnect(reason?: string): void {
    this.updateStatus(ConnectionStatus.Disconnected);
    this.emit('disconnect', reason);
    
    // Auto-reconnect if enabled
    if (this.config.connection.autoReconnect && 
        this.reconnectAttempts < (this.config.connection.maxReconnectAttempts || 10)) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection
   */
  protected scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.config.connection.reconnectInterval || 5000;
    this.reconnectAttempts++;
    this.state.metadata!.reconnectAttempts = this.reconnectAttempts;
    
    this.updateStatus(ConnectionStatus.Reconnecting);
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        // Reconnect failed, will be handled by connect method
      }
    }, delay);
  }

  /**
   * Format trigger as DataProviderMessage
   */
  protected formatAsMessage(trigger: DataProviderTrigger): DataProviderMessage {
    if (typeof trigger === 'string') {
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(trigger);
        if (parsed.type) {
          return parsed as DataProviderMessage;
        }
        // Wrap in standard message format
        return {
          type: 'message',
          payload: parsed,
          metadata: {
            timestamp: Date.now(),
            source: this.id,
          },
        };
      } catch {
        // Plain string message
        return {
          type: 'message',
          payload: trigger,
          metadata: {
            timestamp: Date.now(),
            source: this.id,
          },
        };
      }
    } else {
      // Already an object
      if (trigger.type) {
        return trigger as DataProviderMessage;
      }
      // Wrap in standard message format
      return {
        type: 'message',
        payload: trigger,
        metadata: {
          timestamp: Date.now(),
          source: this.id,
        },
      };
    }
  }

  /**
   * Validate trigger format
   */
  protected validateTrigger(trigger: DataProviderTrigger): boolean {
    // Always valid for base implementation
    // Derived classes can override for specific validation
    return true;
  }
}