/**
 * Static Data Provider
 * 
 * Provides static/mock data for testing and development.
 */

import { BaseDataProvider } from './BaseDataProvider';
import {
  DataProviderConfig,
  ConnectionStatus,
  DataProviderTrigger,
} from './data-provider.types';

interface StaticProviderSettings {
  /**
   * Static data to provide
   */
  data?: any[];
  
  /**
   * Data generator function
   */
  generator?: () => any;
  
  /**
   * Emit interval in ms (0 = emit once)
   */
  interval?: number;
  
  /**
   * Random delay range [min, max] in ms
   */
  randomDelay?: [number, number];
  
  /**
   * Response to triggers
   */
  triggerResponses?: Record<string, any>;
}

export class StaticDataProvider extends BaseDataProvider {
  private emitTimer?: NodeJS.Timeout;
  private dataIndex = 0;

  constructor(config: DataProviderConfig) {
    super(config);
  }

  /**
   * Connect to static data source
   */
  async connect(): Promise<void> {
    if (this.state.status === ConnectionStatus.Connected) {
      return;
    }

    this.updateStatus(ConnectionStatus.Connecting);

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 100));

    this.handleConnect();

    // Start emitting data
    const settings = this.config.settings as StaticProviderSettings;
    if (settings?.interval && settings.interval > 0) {
      this.startEmitting(settings.interval);
    } else {
      // Emit once
      this.emitData();
    }
  }

  /**
   * Disconnect from static data source
   */
  async disconnect(): Promise<void> {
    if (this.emitTimer) {
      clearInterval(this.emitTimer);
      this.emitTimer = undefined;
    }
    this.updateStatus(ConnectionStatus.Disconnected);
  }

  /**
   * Send message implementation
   */
  protected async sendImpl(message: string | ArrayBuffer): Promise<void> {
    // For static provider, sending triggers a response
    const settings = this.config.settings as StaticProviderSettings;
    
    if (settings?.triggerResponses) {
      // Parse message to check for trigger
      let trigger: string;
      
      if (typeof message === 'string') {
        try {
          const parsed = JSON.parse(message);
          trigger = parsed.type || parsed.action || message;
        } catch {
          trigger = message;
        }
      } else {
        throw new Error('Binary data not supported by static provider');
      }

      // Check for matching response
      const response = settings.triggerResponses[trigger];
      if (response !== undefined) {
        // Emit response after a small delay
        setTimeout(() => {
          this.handleData(response);
        }, 50);
      }
    }
  }

  /**
   * Start emitting data
   */
  private startEmitting(interval: number): void {
    this.emitTimer = setInterval(() => {
      this.emitData();
    }, interval);
    
    // Emit first data immediately
    this.emitData();
  }

  /**
   * Emit data
   */
  private emitData(): void {
    const settings = this.config.settings as StaticProviderSettings;
    let data: any;

    if (settings?.generator) {
      // Use generator function
      data = settings.generator();
    } else if (settings?.data && settings.data.length > 0) {
      // Use static data array
      data = settings.data[this.dataIndex % settings.data.length];
      this.dataIndex++;
    } else {
      // Default data
      data = {
        timestamp: Date.now(),
        value: Math.random() * 100,
        source: 'static',
      };
    }

    // Apply random delay if configured
    if (settings?.randomDelay) {
      const [min, max] = settings.randomDelay;
      const delay = Math.floor(Math.random() * (max - min + 1)) + min;
      setTimeout(() => {
        this.handleData(data);
      }, delay);
    } else {
      this.handleData(data);
    }
  }

  /**
   * Override send to support trigger-based responses
   */
  async send(trigger: DataProviderTrigger): Promise<void> {
    if (this.state.status !== ConnectionStatus.Connected) {
      throw new Error('Provider is not connected');
    }

    const settings = this.config.settings as StaticProviderSettings;
    
    // Check for trigger responses
    if (settings?.triggerResponses) {
      let triggerKey: string;
      
      if (typeof trigger === 'string') {
        triggerKey = trigger;
      } else {
        // Use type or action as key
        triggerKey = trigger.type || trigger.action || JSON.stringify(trigger);
      }

      const response = settings.triggerResponses[triggerKey];
      if (response !== undefined) {
        // Emit response after a small delay to simulate async
        setTimeout(() => {
          this.handleData(response);
        }, 10);
      } else {
        // No matching response, emit generic acknowledgment
        setTimeout(() => {
          this.handleData({
            type: 'ack',
            trigger: triggerKey,
            timestamp: Date.now(),
          });
        }, 10);
      }
    }

    // Emit event
    this.emit('messageSent', trigger);
  }
}