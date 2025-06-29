import { WorkerMessage, WorkerMessageType, ConnectionPayload, SubscriptionPayload, DataPayload, SnapshotPayload, ErrorPayload, WorkerPort } from './types';

interface DataProviderEvents {
  data: (data: any) => void;
  snapshot: (data: any[], metadata?: any) => void;
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  statusChange: (status: string) => void;
  snapshotComplete: (complete: boolean) => void;
}

class TypedEventEmitter<TEvents extends Record<string, any>> {
  private listeners = new Map<keyof TEvents, Set<Function>>();

  on<K extends keyof TEvents>(event: K, handler: TEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as Function);
  }

  off<K extends keyof TEvents>(event: K, handler: TEvents[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as Function);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  protected emit<K extends keyof TEvents>(
    event: K,
    ...args: Parameters<TEvents[K]>
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${String(event)}:`, error);
        }
      });
    }
  }

  protected removeAllListeners(): void {
    this.listeners.clear();
  }
}

interface BaseDataProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
}

class SharedWorkerDataManager {
  private providers = new Map<string, BaseDataProvider>();
  private ports = new Map<MessagePort, WorkerPort>();
  private subscriptions = new Map<string, Map<string, MessagePort>>();
  private snapshotCache = new Map<string, any[]>();
  
  private readonly PORT_TIMEOUT = 60000; // 1 minute
  private readonly HEARTBEAT_CHECK_INTERVAL = 30000; // Check every 30 seconds

  constructor() {
    console.log('[SharedWorker] Initializing SharedWorkerDataManager');
    (self as any).addEventListener('connect', this.handleConnect.bind(this));
    this.startHeartbeat();
    console.log('[SharedWorker] SharedWorkerDataManager initialized');
  }

  private handleConnect(event: MessageEvent) {
    console.log('[SharedWorker] New client connecting');
    const port = event.ports[0];
    
    this.ports.set(port, {
      port,
      subscriberIds: new Set(),
      lastActivity: Date.now()
    });

    port.addEventListener('message', (event) => this.handleMessage(port, event));
    port.start();
    
    console.log('[SharedWorker] Sending CONNECTED message to client');
    this.sendMessage(port, {
      id: 'connected',
      type: WorkerMessageType.CONNECTED
    });
  }

  private async handleMessage(port: MessagePort, event: MessageEvent) {
    const message: WorkerMessage = event.data;
    console.log(`[SharedWorker] Received message type: ${message.type}, id: ${message.id}`);
    
    const workerPort = this.ports.get(port);
    
    if (!workerPort) {
      console.error('[SharedWorker] Message from unknown port');
      return;
    }

    workerPort.lastActivity = Date.now();

    try {
      switch (message.type) {
        case WorkerMessageType.CONNECT:
          await this.handleConnectProvider(port, message);
          break;
        
        case WorkerMessageType.DISCONNECT:
          await this.handleDisconnectProvider(port, message);
          break;
        
        case WorkerMessageType.SUBSCRIBE:
          this.handleSubscribe(port, message);
          break;
        
        case WorkerMessageType.UNSUBSCRIBE:
          this.handleUnsubscribe(port, message);
          break;
        
        case WorkerMessageType.TRIGGER:
          await this.handleTrigger(message);
          break;
        
        case WorkerMessageType.PING:
          this.sendMessage(port, {
            id: message.id,
            type: WorkerMessageType.PONG
          });
          break;
      }
    } catch (error) {
      this.sendError(port, (message as any).payload?.providerId || '', error);
    }
  }

  private async handleConnectProvider(port: MessagePort, message: any) {
    const { providerId, config, subscriberId } = message.payload as ConnectionPayload;
    console.log(`[SharedWorker] Handling connect for provider ${providerId}, subscriber ${subscriberId}`);
    
    const workerPort = this.ports.get(port);
    if (workerPort) {
      workerPort.subscriberIds.add(subscriberId);
    }

    let provider = this.providers.get(providerId);
    
    if (!provider) {
      console.log(`[SharedWorker] Creating new provider for ${providerId}`);
      try {
        provider = await this.createProvider(config);
        this.providers.set(providerId, provider);
        
        // Set up event handlers
        this.setupProviderEventHandlers(providerId, provider);
        
        console.log(`[SharedWorker] Connecting provider ${providerId}`);
        await provider.connect();
        console.log(`[SharedWorker] Provider ${providerId} connected successfully`);
      } catch (error) {
        console.error(`[SharedWorker] Failed to create/connect provider ${providerId}:`, error);
        // Send error response
        this.sendMessage(port, {
          id: message.id,
          type: WorkerMessageType.ERROR,
          payload: {
            providerId,
            error: error instanceof Error ? error.message : String(error)
          }
        } as any);
        throw error;
      }
      
      // Send initial status after connection (use the request ID for response)
      this.sendMessage(port, {
        id: message.id,
        type: WorkerMessageType.STATUS,
        payload: {
          providerId,
          status: 'Connected'
        }
      } as any);
    } else {
      // Send current status (use the request ID for response)
      this.sendMessage(port, {
        id: message.id,
        type: WorkerMessageType.STATUS,
        payload: {
          providerId,
          status: 'Connected'
        }
      } as any);
      
      // Send cached snapshot if available
      const cachedSnapshot = this.snapshotCache.get(providerId);
      if (cachedSnapshot) {
        this.sendSnapshot(port, providerId, cachedSnapshot, {
          isPartial: false,
          totalReceived: cachedSnapshot.length
        });
      }
    }
    
    this.addSubscription(providerId, subscriberId, port);
  }

  private async handleDisconnectProvider(port: MessagePort, message: any) {
    const { providerId, subscriberId } = message.payload as SubscriptionPayload;
    
    this.removeSubscription(providerId, subscriberId);
    
    const workerPort = this.ports.get(port);
    if (workerPort) {
      workerPort.subscriberIds.delete(subscriberId);
    }
    
    const subscriptions = this.subscriptions.get(providerId);
    if (!subscriptions || subscriptions.size === 0) {
      const provider = this.providers.get(providerId);
      if (provider) {
        await provider.disconnect();
        this.providers.delete(providerId);
        this.snapshotCache.delete(providerId);
      }
    }
  }

  private handleSubscribe(port: MessagePort, message: any) {
    const { providerId, subscriberId } = message.payload as SubscriptionPayload;
    this.addSubscription(providerId, subscriberId, port);
    
    const cachedSnapshot = this.snapshotCache.get(providerId);
    if (cachedSnapshot) {
      this.sendSnapshot(port, providerId, cachedSnapshot, {
        isPartial: false,
        totalReceived: cachedSnapshot.length
      });
    }
  }

  private handleUnsubscribe(port: MessagePort, message: any) {
    const { providerId, subscriberId } = message.payload as SubscriptionPayload;
    this.removeSubscription(providerId, subscriberId);
  }

  private async handleTrigger(message: any) {
    const { providerId, trigger } = message.payload;
    const provider = this.providers.get(providerId);
    
    if (provider && 'send' in provider) {
      await (provider as any).send(trigger);
    }
  }

  private async createProvider(config: any): Promise<BaseDataProvider> {
    console.log(`[SharedWorker] Creating provider of type: ${config.type}`);
    // Create the appropriate provider based on type
    switch (config.type) {
      case 'websocket':
        console.log(`[SharedWorker] Creating WorkerWebSocketProvider with config:`, config);
        return new WorkerWebSocketProvider(config);
      default:
        // For other types, return a mock provider for now
        console.log(`[SharedWorker] Creating MockDataProvider for type: ${config.type}`);
        return new MockDataProvider(config);
    }
  }

  private setupProviderEventHandlers(providerId: string, provider: BaseDataProvider) {
    provider.on('statusChange', (status: string) => {
      this.broadcastToSubscribers(providerId, {
        id: `status-${Date.now()}`,
        type: WorkerMessageType.STATUS,
        payload: { providerId, status }
      });
    });

    provider.on('data', (data: any) => {
      this.broadcastToSubscribers(providerId, {
        id: `data-${Date.now()}`,
        type: WorkerMessageType.DATA,
        payload: { providerId, data }
      });
    });

    provider.on('snapshot', (data: any[], metadata?: any) => {
      if (!metadata?.isPartial) {
        this.snapshotCache.set(providerId, data);
      }
      
      this.broadcastToSubscribers(providerId, {
        id: `snapshot-${Date.now()}`,
        type: WorkerMessageType.SNAPSHOT,
        payload: { providerId, data, metadata }
      });
    });

    provider.on('snapshotComplete', () => {
      this.broadcastToSubscribers(providerId, {
        id: `snapshot-complete-${Date.now()}`,
        type: WorkerMessageType.SNAPSHOT_COMPLETE,
        payload: { providerId }
      });
    });

    provider.on('error', (error: Error) => {
      this.broadcastToSubscribers(providerId, {
        id: `error-${Date.now()}`,
        type: WorkerMessageType.ERROR,
        payload: { providerId, error: error.message }
      });
    });
  }

  private addSubscription(providerId: string, subscriberId: string, port: MessagePort) {
    if (!this.subscriptions.has(providerId)) {
      this.subscriptions.set(providerId, new Map());
    }
    
    const providerSubs = this.subscriptions.get(providerId)!;
    providerSubs.set(subscriberId, port);
  }

  private removeSubscription(providerId: string, subscriberId: string) {
    const providerSubs = this.subscriptions.get(providerId);
    if (providerSubs) {
      providerSubs.delete(subscriberId);
      if (providerSubs.size === 0) {
        this.subscriptions.delete(providerId);
      }
    }
  }

  private broadcastToSubscribers(providerId: string, message: WorkerMessage) {
    const providerSubs = this.subscriptions.get(providerId);
    if (providerSubs) {
      providerSubs.forEach((port) => {
        try {
          port.postMessage(message);
        } catch (error) {
          console.error(`Failed to send message to port:`, error);
        }
      });
    }
  }

  private sendMessage(port: MessagePort, message: WorkerMessage) {
    try {
      port.postMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  private sendError(port: MessagePort, providerId: string, error: any) {
    this.sendMessage(port, {
      id: `error-${Date.now()}`,
      type: WorkerMessageType.ERROR,
      payload: {
        providerId,
        error: error.message || String(error)
      }
    } as any);
  }

  private sendSnapshot(port: MessagePort, providerId: string, data: any[], metadata?: any) {
    this.sendMessage(port, {
      id: `snapshot-${Date.now()}`,
      type: WorkerMessageType.SNAPSHOT,
      payload: {
        providerId,
        data,
        metadata
      }
    } as any);
  }

  private startHeartbeat() {
    setInterval(() => {
      const now = Date.now();
      const deadPorts: MessagePort[] = [];
      
      this.ports.forEach((workerPort, port) => {
        if (now - workerPort.lastActivity > this.PORT_TIMEOUT) {
          deadPorts.push(port);
        }
      });
      
      deadPorts.forEach(port => {
        const workerPort = this.ports.get(port);
        if (workerPort) {
          workerPort.subscriberIds.forEach(subscriberId => {
            this.subscriptions.forEach((providerSubs) => {
              providerSubs.delete(subscriberId);
            });
          });
        }
        this.ports.delete(port);
      });
    }, this.HEARTBEAT_CHECK_INTERVAL);
  }
}

// Worker-compatible WebSocket provider
class WorkerWebSocketProvider extends TypedEventEmitter<DataProviderEvents> implements BaseDataProvider {
  private ws: WebSocket | null = null;
  private isSnapshotComplete = false;
  private snapshotBuffer: any[] = [];
  private messageCount = 0;
  private totalSnapshotReceived = 0;
  private readonly BATCH_SIZE = 5000;

  constructor(private config: any) {
    super();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Use the URL as-is, don't force wss:// in worker context
        const url = this.config.connection.url;
        console.log(`[WorkerWebSocketProvider] Connecting to ${url}`);
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log(`[WorkerWebSocketProvider] Connected to ${url}`);
          this.emit('statusChange', 'Connected');
          this.setupStompProtocol();
          resolve();
        };

        this.ws.onerror = (error) => {
          console.error(`[WorkerWebSocketProvider] WebSocket error:`, error);
          this.emit('error', new Error('WebSocket error'));
          reject(error);
        };

        this.ws.onclose = () => {
          console.log(`[WorkerWebSocketProvider] Disconnected`);
          this.emit('statusChange', 'Disconnected');
          this.emit('disconnected');
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

      } catch (error) {
        console.error(`[WorkerWebSocketProvider] Connection error:`, error);
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.emit('statusChange', 'Disconnected');
  }

  private setupStompProtocol() {
    if (!this.ws) return;

    // Send STOMP CONNECT frame
    this.ws.send('CONNECT\naccept-version:1.2\n\n\0');

    // Subscribe to data topic
    const topic = this.config.settings?.listenerTopic || `/topic/${this.config.dataType || 'data'}`;
    setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(`SUBSCRIBE\nid:sub-0\ndestination:${topic}\n\n\0`);
        
        // Send trigger message
        const trigger = this.config.settings?.triggerDestination || `/app/trigger`;
        const message = this.config.settings?.triggerMessage || 'START';
        this.ws.send(`SEND\ndestination:${trigger}\n\n${message}\0`);
      }
    }, 100);
  }

  private handleMessage(data: string) {
    this.messageCount++;
    
    // Parse STOMP frame (simplified)
    const lines = data.split('\n');
    const command = lines[0];
    
    if (command === 'MESSAGE') {
      // Extract body (after empty line)
      const bodyIndex = lines.findIndex(line => line === '');
      if (bodyIndex > 0 && bodyIndex < lines.length - 1) {
        const body = lines.slice(bodyIndex + 1).join('\n').replace(/\0$/, '');
        this.processMessageBody(body);
      }
    }
  }

  private processMessageBody(body: string) {
    try {
      // Check for end of snapshot
      const snapshotEndToken = this.config.settings?.snapshotEndToken;
      const isEndOfSnapshot = 
        (snapshotEndToken && body.toLowerCase().includes(snapshotEndToken.toLowerCase())) ||
        body.toLowerCase().includes('snapshot complete') ||
        body.toLowerCase().includes('end_snapshot');
      
      if (isEndOfSnapshot && !this.isSnapshotComplete) {
        // Emit remaining snapshot data
        if (this.snapshotBuffer.length > 0) {
          this.totalSnapshotReceived += this.snapshotBuffer.length;
          this.emit('snapshot', [...this.snapshotBuffer], { 
            isPartial: false, 
            totalReceived: this.totalSnapshotReceived 
          });
          this.snapshotBuffer = [];
        }
        
        this.isSnapshotComplete = true;
        this.emit('snapshotComplete', true);
        return;
      }
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(body);
      } catch (e) {
        // Not JSON, ignore
        return;
      }
      
      if (!this.isSnapshotComplete) {
        // Buffer snapshot data
        if (Array.isArray(data)) {
          this.snapshotBuffer.push(...data);
        } else {
          this.snapshotBuffer.push(data);
        }
        
        // Emit batch if we have enough data
        while (this.snapshotBuffer.length >= this.BATCH_SIZE) {
          const batch = this.snapshotBuffer.splice(0, this.BATCH_SIZE);
          this.totalSnapshotReceived += batch.length;
          this.emit('snapshot', batch, { 
            isPartial: true, 
            totalReceived: this.totalSnapshotReceived 
          });
        }
      } else {
        // Real-time update
        this.emit('data', data);
      }
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  async send(trigger: any): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Handle refresh action
      if (typeof trigger === 'object' && trigger.action === 'refresh') {
        this.isSnapshotComplete = false;
        this.snapshotBuffer = [];
        this.totalSnapshotReceived = 0;
        
        // Re-send trigger
        const dest = this.config.settings?.triggerDestination || `/app/trigger`;
        const msg = this.config.settings?.triggerMessage || 'START';
        this.ws.send(`SEND\ndestination:${dest}\n\n${msg}\0`);
      }
    }
  }
}

// Mock provider for non-WebSocket types
class MockDataProvider extends TypedEventEmitter<DataProviderEvents> implements BaseDataProvider {
  constructor(private config: any) {
    super();
  }

  async connect(): Promise<void> {
    this.emit('statusChange', 'Connected');
    setTimeout(() => {
      this.emit('snapshot', [], { isPartial: false, totalReceived: 0 });
      this.emit('snapshotComplete', true);
    }, 100);
  }

  async disconnect(): Promise<void> {
    this.emit('statusChange', 'Disconnected');
  }
}

// Initialize the SharedWorker
new SharedWorkerDataManager();