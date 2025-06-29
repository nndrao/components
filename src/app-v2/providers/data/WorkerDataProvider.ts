/**
 * WorkerDataProvider - Proxy provider that communicates with SharedWorker
 * 
 * This provider acts as a bridge between the DataProviderManager and the SharedWorker,
 * translating DataProvider interface calls to worker messages and vice versa.
 */

import { BaseDataProvider } from './BaseDataProvider';
import {
  DataProviderConfig,
  ConnectionStatus,
  DataProviderTrigger,
} from './data-provider.types';
import {
  WorkerMessage,
  WorkerMessageType,
  TypedWorkerMessage,
} from '../../workers/types';

export class WorkerDataProvider extends BaseDataProvider {
  private worker: SharedWorker | null = null;
  private port: MessagePort | null = null;
  private subscriberId: string;
  private messageHandlers = new Map<string, (response: any) => void>();
  private connectionPromise: Promise<void> | null = null;

  constructor(config: DataProviderConfig) {
    super(config);
    this.subscriberId = `${config.id}-${Date.now()}-${Math.random()}`;
  }

  /**
   * Connect to the SharedWorker
   */
  async connect(): Promise<void> {
    if (this.state.status === ConnectionStatus.Connected) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.connectInternal();
    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  private async connectInternal(): Promise<void> {
    this.updateStatus(ConnectionStatus.Connecting);
    console.log(`[WorkerDataProvider] Connecting provider ${this.id}`);

    try {
      // Create or get SharedWorker instance
      console.log('[WorkerDataProvider] Creating SharedWorker');
      this.worker = new SharedWorker(
        '/shared-worker.js',
        { name: 'data-provider-worker' }
      );

      this.port = this.worker.port;
      console.log('[WorkerDataProvider] Got worker port');

      // Set up message handler
      this.port.onmessage = this.handleWorkerMessage.bind(this);

      // Start the port
      this.port.start();
      console.log('[WorkerDataProvider] Started port');

      // Wait for initial connection
      console.log('[WorkerDataProvider] Waiting for initial connection');
      await this.waitForConnection();
      console.log('[WorkerDataProvider] Initial connection established');

      // Send connection request to worker
      console.log(`[WorkerDataProvider] Sending CONNECT message for provider ${this.id}`);
      await this.sendMessageAndWait({
        id: `connect-${this.subscriberId}`,
        type: WorkerMessageType.CONNECT,
        payload: {
          providerId: this.id,
          config: this.config,
          subscriberId: this.subscriberId,
        },
      }, WorkerMessageType.STATUS);
      console.log(`[WorkerDataProvider] Received STATUS response for provider ${this.id}`);

    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from the SharedWorker
   */
  async disconnect(): Promise<void> {
    if (this.state.status === ConnectionStatus.Disconnected) {
      return;
    }

    this.updateStatus(ConnectionStatus.Disconnecting);

    try {
      if (this.port) {
        // Send disconnect message
        await this.sendMessage({
          id: `disconnect-${this.subscriberId}`,
          type: WorkerMessageType.DISCONNECT,
          payload: {
            providerId: this.id,
            subscriberId: this.subscriberId,
          },
        });

        // Close the port
        this.port.close();
        this.port = null;
      }

      this.worker = null;
      this.updateStatus(ConnectionStatus.Disconnected);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Send trigger to the worker
   */
  async send(trigger: DataProviderTrigger): Promise<void> {
    if (!this.port) {
      throw new Error('Not connected to worker');
    }

    await this.sendMessage({
      id: `trigger-${Date.now()}`,
      type: WorkerMessageType.TRIGGER,
      payload: {
        providerId: this.id,
        trigger,
      },
    });
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(event: MessageEvent) {
    const message: TypedWorkerMessage = event.data;
    console.log(`[WorkerDataProvider] Received message type: ${message.type}, id: ${message.id}`);

    // Handle response callbacks
    const handler = this.messageHandlers.get(message.id);
    if (handler) {
      console.log(`[WorkerDataProvider] Found handler for message ${message.id}`);
      handler(message);
      this.messageHandlers.delete(message.id);
      return;
    }

    // Handle event messages
    switch (message.type) {
      case WorkerMessageType.CONNECTED:
        this.handleConnect();
        break;

      case WorkerMessageType.STATUS:
        if (message.payload.providerId === this.id) {
          this.updateStatus(message.payload.status);
        }
        break;

      case WorkerMessageType.DATA:
        if (message.payload.providerId === this.id) {
          this.handleData(message.payload.data);
        }
        break;

      case WorkerMessageType.SNAPSHOT:
        if (message.payload.providerId === this.id) {
          this.emit('snapshot', message.payload.data, message.payload.metadata);
        }
        break;

      case WorkerMessageType.SNAPSHOT_COMPLETE:
        if (message.payload.providerId === this.id) {
          this.emit('snapshotComplete', true);
        }
        break;

      case WorkerMessageType.ERROR:
        if (message.payload.providerId === this.id) {
          this.handleError(new Error(message.payload.error));
        }
        break;

      case WorkerMessageType.DISCONNECTED:
        if (!message.payload || message.payload.providerId === this.id) {
          this.handleDisconnect(message.payload?.reason || 'Worker disconnected');
        }
        break;
    }
  }

  /**
   * Send message to worker
   */
  private async sendMessage(message: WorkerMessage): Promise<void> {
    if (!this.port) {
      throw new Error('Worker port not available');
    }

    this.port.postMessage(message);
  }

  /**
   * Send message and wait for response
   */
  private sendMessageAndWait(
    message: WorkerMessage,
    expectedType: WorkerMessageType,
    timeout = 5000
  ): Promise<TypedWorkerMessage> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.messageHandlers.delete(message.id);
        reject(new Error(`Timeout waiting for ${expectedType} response`));
      }, timeout);

      this.messageHandlers.set(message.id, (response: TypedWorkerMessage) => {
        clearTimeout(timeoutId);
        if (response.type === expectedType || response.type === WorkerMessageType.ERROR) {
          resolve(response);
        } else {
          reject(new Error(`Unexpected response type: ${response.type}`));
        }
      });

      this.sendMessage(message).catch((error) => {
        clearTimeout(timeoutId);
        this.messageHandlers.delete(message.id);
        reject(error);
      });
    });
  }

  /**
   * Wait for initial connection to worker
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for worker connection'));
      }, 5000);

      const checkConnected = (event: MessageEvent) => {
        const message: TypedWorkerMessage = event.data;
        if (message.type === WorkerMessageType.CONNECTED) {
          clearTimeout(timeout);
          resolve();
        }
      };

      // Wait for CONNECTED message
      this.port!.addEventListener('message', checkConnected, { once: true });
    });
  }

  /**
   * Send implementation (not used for WorkerDataProvider)
   */
  protected async sendImpl(message: string | ArrayBuffer): Promise<void> {
    // This method is not used for WorkerDataProvider
    // All communication goes through the send() method with triggers
    throw new Error('sendImpl not implemented for WorkerDataProvider');
  }

  /**
   * Check if SharedWorker is supported
   */
  static isSupported(): boolean {
    return typeof SharedWorker !== 'undefined';
  }

  /**
   * Get worker status for debugging
   */
  getWorkerStatus(): {
    connected: boolean;
    subscriberId: string;
    providerId: string;
  } {
    return {
      connected: this.port !== null && this.state.status === ConnectionStatus.Connected,
      subscriberId: this.subscriberId,
      providerId: this.id,
    };
  }
}