// SharedWorker for centralized data provider management
console.log('[SharedWorker] Loading shared worker script');

// Message types
const WorkerMessageType = {
  CONNECT: 'CONNECT',
  DISCONNECT: 'DISCONNECT',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  SUBSCRIBE: 'SUBSCRIBE',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  DATA: 'DATA',
  SNAPSHOT: 'SNAPSHOT',
  TRIGGER: 'TRIGGER',
  STATUS: 'STATUS',
  ERROR: 'ERROR',
  SNAPSHOT_COMPLETE: 'SNAPSHOT_COMPLETE',
  PING: 'PING',
  PONG: 'PONG',
};

// Simple WebSocket STOMP provider
class WebSocketProvider {
  constructor(config) {
    this.config = config;
    this.ws = null;
    this.isSnapshotComplete = false;
    this.snapshotBuffer = [];
    this.messageCount = 0;
    this.totalSnapshotReceived = 0;
    this.BATCH_SIZE = 5000;
    this.listeners = new Map();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
  }

  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  emit(event, ...args) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        const url = this.config.connection.url;
        console.log(`[WebSocketProvider] Connecting to ${url}`);
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log(`[WebSocketProvider] Connected to ${url}`);
          this.emit('statusChange', 'Connected');
          this.setupStompProtocol();
          resolve();
        };

        this.ws.onerror = (error) => {
          console.error(`[WebSocketProvider] WebSocket error:`, error);
          this.emit('error', new Error('WebSocket error'));
          reject(error);
        };

        this.ws.onclose = () => {
          console.log(`[WebSocketProvider] Disconnected`);
          this.emit('statusChange', 'Disconnected');
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

      } catch (error) {
        console.error(`[WebSocketProvider] Connection error:`, error);
        reject(error);
      }
    });
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.emit('statusChange', 'Disconnected');
  }

  setupStompProtocol() {
    if (!this.ws) return;

    // Send STOMP CONNECT frame
    this.ws.send('CONNECT\naccept-version:1.2\n\n\0');

    // Subscribe to data topic
    const topic = this.config.settings?.listenerTopic || `/topic/${this.config.dataType || 'data'}`;
    setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(`SUBSCRIBE\nid:sub-0\ndestination:${topic}\n\n\0`);
        
        // Send trigger message
        const triggerDestination = this.config.settings?.triggerDestination;
        const triggerMessage = this.config.settings?.triggerMessage;
        
        if (triggerDestination && triggerMessage) {
          console.log(`[WebSocketProvider] Sending trigger to ${triggerDestination}`);
          this.ws.send(`SEND\ndestination:${triggerDestination}\n\n${triggerMessage}\0`);
        } else {
          // Legacy trigger format
          const dataType = this.config.dataType || 'positions';
          const rate = this.config.messageRate || 1000;
          const batchSize = this.config.batchSize || Math.floor(rate / 10);
          const trigger = `/snapshot/${dataType}/${rate}/${batchSize}`;
          console.log(`[WebSocketProvider] Sending legacy trigger: ${trigger}`);
          this.ws.send(`SEND\ndestination:${trigger}\n\n${trigger}\0`);
        }
      }
    }, 100);
  }

  handleMessage(data) {
    this.messageCount++;
    
    // Parse STOMP frame
    const lines = data.split('\n');
    const command = lines[0];
    
    if (command === 'MESSAGE' || command.includes('MESSAGE')) {
      // Extract body (after empty line)
      const bodyIndex = lines.findIndex(line => line === '');
      if (bodyIndex > 0 && bodyIndex < lines.length - 1) {
        const body = lines.slice(bodyIndex + 1).join('\n').replace(/\0$/, '');
        this.processMessageBody(body);
      }
    } else if (command === 'CONNECTED') {
      console.log('[WebSocketProvider] STOMP connected');
    }
  }

  processMessageBody(body) {
    try {
      console.log(`[WebSocketProvider] Message #${this.messageCount}: ${body.substring(0, 100)}...`);
      
      // Check for end of snapshot
      const snapshotEndToken = this.config.settings?.snapshotEndToken;
      const bodyLower = body.toLowerCase();
      
      const isEndOfSnapshot = 
        (snapshotEndToken && bodyLower.startsWith(snapshotEndToken.toLowerCase())) ||
        (bodyLower.includes('success:') && bodyLower.includes('starting live updates')) ||
        bodyLower.includes('snapshot complete') ||
        bodyLower.includes('end_snapshot') ||
        (bodyLower.startsWith('success:') && bodyLower.includes('snapshot'));
      
      if (isEndOfSnapshot && !this.isSnapshotComplete) {
        console.log(`[WebSocketProvider] End of snapshot detected`);
        
        // Emit remaining snapshot data
        if (this.snapshotBuffer.length > 0) {
          this.totalSnapshotReceived += this.snapshotBuffer.length;
          console.log(`[WebSocketProvider] Emitting final batch of ${this.snapshotBuffer.length} records`);
          this.emit('snapshot', [...this.snapshotBuffer], { 
            isPartial: false, 
            totalReceived: this.totalSnapshotReceived 
          });
          this.snapshotBuffer = [];
        } else {
          // No data, emit empty snapshot
          console.log(`[WebSocketProvider] Emitting empty snapshot`);
          this.emit('snapshot', [], { 
            isPartial: false, 
            totalReceived: 0 
          });
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
        // Not JSON, might be a control message
        console.log(`[WebSocketProvider] Non-JSON message: "${body.substring(0, 50)}..."`);
        return;
      }
      
      if (!this.isSnapshotComplete) {
        // Buffer snapshot data
        if (Array.isArray(data)) {
          this.snapshotBuffer.push(...data);
          console.log(`[WebSocketProvider] Buffered ${data.length} records (total: ${this.snapshotBuffer.length})`);
        } else {
          this.snapshotBuffer.push(data);
          console.log(`[WebSocketProvider] Buffered 1 record (total: ${this.snapshotBuffer.length})`);
        }
        
        // Emit batch if we have enough data
        while (this.snapshotBuffer.length >= this.BATCH_SIZE) {
          const batch = this.snapshotBuffer.splice(0, this.BATCH_SIZE);
          this.totalSnapshotReceived += batch.length;
          console.log(`[WebSocketProvider] Emitting batch of ${batch.length} records`);
          this.emit('snapshot', batch, { 
            isPartial: true, 
            totalReceived: this.totalSnapshotReceived 
          });
        }
      } else {
        // Real-time update
        console.log(`[WebSocketProvider] Processing real-time update`);
        this.emit('data', data);
      }
    } catch (error) {
      console.error('[WebSocketProvider] Error processing message:', error);
      this.emit('error', error);
    }
  }

  async send(trigger) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Handle refresh action
      if (typeof trigger === 'object' && trigger.action === 'refresh') {
        console.log('[WebSocketProvider] Handling refresh action');
        this.isSnapshotComplete = false;
        this.snapshotBuffer = [];
        this.totalSnapshotReceived = 0;
        
        // Re-send trigger
        const triggerDestination = this.config.settings?.triggerDestination;
        const triggerMessage = this.config.settings?.triggerMessage;
        
        if (triggerDestination && triggerMessage) {
          this.ws.send(`SEND\ndestination:${triggerDestination}\n\n${triggerMessage}\0`);
        }
      }
    }
  }
}

// SharedWorker manager
class SharedWorkerDataManager {
  constructor() {
    console.log('[SharedWorker] Initializing SharedWorkerDataManager');
    this.ports = new Map();
    this.providers = new Map();
    this.subscriptions = new Map();
    this.snapshotCache = new Map();
    
    self.addEventListener('connect', this.handleConnect.bind(this));
    console.log('[SharedWorker] SharedWorkerDataManager initialized');
  }

  handleConnect(event) {
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
    port.postMessage({
      id: 'connected',
      type: WorkerMessageType.CONNECTED
    });
  }

  async handleMessage(port, event) {
    const message = event.data;
    console.log(`[SharedWorker] Received message type: ${message.type}, id: ${message.id}`);
    
    try {
      switch (message.type) {
        case WorkerMessageType.CONNECT:
          await this.handleConnectProvider(port, message);
          break;
          
        case WorkerMessageType.DISCONNECT:
          await this.handleDisconnectProvider(port, message);
          break;
          
        case WorkerMessageType.TRIGGER:
          await this.handleTrigger(message);
          break;
          
        case WorkerMessageType.PING:
          port.postMessage({
            id: message.id,
            type: WorkerMessageType.PONG
          });
          break;
      }
    } catch (error) {
      console.error('[SharedWorker] Error handling message:', error);
      port.postMessage({
        id: message.id,
        type: WorkerMessageType.ERROR,
        payload: {
          providerId: message.payload?.providerId || '',
          error: error.message || String(error)
        }
      });
    }
  }

  async handleConnectProvider(port, message) {
    const { providerId, config, subscriberId } = message.payload;
    console.log(`[SharedWorker] Handling connect for provider ${providerId}`);
    
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
        port.postMessage({
          id: message.id,
          type: WorkerMessageType.ERROR,
          payload: {
            providerId,
            error: error.message || String(error)
          }
        });
        throw error;
      }
      
      // Send initial status
      port.postMessage({
        id: message.id,
        type: WorkerMessageType.STATUS,
        payload: {
          providerId,
          status: 'Connected'
        }
      });
    } else {
      // Send current status
      port.postMessage({
        id: message.id,
        type: WorkerMessageType.STATUS,
        payload: {
          providerId,
          status: 'Connected'
        }
      });
      
      // Send cached snapshot if available
      const cachedSnapshot = this.snapshotCache.get(providerId);
      if (cachedSnapshot) {
        console.log(`[SharedWorker] Sending cached snapshot for ${providerId}`);
        port.postMessage({
          id: `snapshot-${Date.now()}`,
          type: WorkerMessageType.SNAPSHOT,
          payload: {
            providerId,
            data: cachedSnapshot,
            metadata: {
              isPartial: false,
              totalReceived: cachedSnapshot.length
            }
          }
        });
      }
    }
    
    this.addSubscription(providerId, subscriberId, port);
  }

  async handleDisconnectProvider(port, message) {
    const { providerId, subscriberId } = message.payload;
    
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

  async handleTrigger(message) {
    const { providerId, trigger } = message.payload;
    const provider = this.providers.get(providerId);
    
    if (provider && provider.send) {
      await provider.send(trigger);
    }
  }

  async createProvider(config) {
    console.log(`[SharedWorker] Creating provider of type: ${config.type}`);
    
    switch (config.type) {
      case 'websocket':
        console.log(`[SharedWorker] Creating WebSocketProvider with config:`, config);
        return new WebSocketProvider(config);
      default:
        console.log(`[SharedWorker] Unsupported provider type: ${config.type}`);
        throw new Error(`Unsupported provider type: ${config.type}`);
    }
  }

  setupProviderEventHandlers(providerId, provider) {
    provider.on('statusChange', (status) => {
      console.log(`[SharedWorker] Provider ${providerId} status changed to: ${status}`);
      this.broadcastToSubscribers(providerId, {
        id: `status-${Date.now()}`,
        type: WorkerMessageType.STATUS,
        payload: { providerId, status }
      });
    });

    provider.on('data', (data) => {
      console.log(`[SharedWorker] Provider ${providerId} received data`);
      this.broadcastToSubscribers(providerId, {
        id: `data-${Date.now()}`,
        type: WorkerMessageType.DATA,
        payload: { providerId, data }
      });
    });

    provider.on('snapshot', (data, metadata) => {
      console.log(`[SharedWorker] Provider ${providerId} received snapshot with ${data.length} records`);
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
      console.log(`[SharedWorker] Provider ${providerId} snapshot complete`);
      this.broadcastToSubscribers(providerId, {
        id: `snapshot-complete-${Date.now()}`,
        type: WorkerMessageType.SNAPSHOT_COMPLETE,
        payload: { providerId }
      });
    });

    provider.on('error', (error) => {
      console.error(`[SharedWorker] Provider ${providerId} error:`, error);
      this.broadcastToSubscribers(providerId, {
        id: `error-${Date.now()}`,
        type: WorkerMessageType.ERROR,
        payload: { providerId, error: error.message }
      });
    });
  }

  addSubscription(providerId, subscriberId, port) {
    if (!this.subscriptions.has(providerId)) {
      this.subscriptions.set(providerId, new Map());
    }
    
    const providerSubs = this.subscriptions.get(providerId);
    providerSubs.set(subscriberId, port);
    console.log(`[SharedWorker] Added subscription ${subscriberId} for provider ${providerId}`);
  }

  removeSubscription(providerId, subscriberId) {
    const providerSubs = this.subscriptions.get(providerId);
    if (providerSubs) {
      providerSubs.delete(subscriberId);
      if (providerSubs.size === 0) {
        this.subscriptions.delete(providerId);
      }
    }
  }

  broadcastToSubscribers(providerId, message) {
    const providerSubs = this.subscriptions.get(providerId);
    if (providerSubs) {
      console.log(`[SharedWorker] Broadcasting ${message.type} to ${providerSubs.size} subscribers for provider ${providerId}`);
      providerSubs.forEach((port) => {
        try {
          port.postMessage(message);
        } catch (error) {
          console.error(`[SharedWorker] Failed to send message to port:`, error);
        }
      });
    }
  }
}

// Initialize the SharedWorker
new SharedWorkerDataManager();