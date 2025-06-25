/**
 * Data Provider Manager
 * 
 * Manages multiple data providers and subscriptions.
 */

import { TypedEventEmitter } from './TypedEventEmitter';
import {
  DataProvider,
  DataProviderConfig,
  DataSubscription,
  ConnectionStatus,
  DataProviderTrigger,
} from './data-provider.types';
import { DataProviderFactory, defaultDataProviderFactory } from './DataProviderFactory';

export interface DataProviderManagerOptions {
  /**
   * Custom provider factory
   */
  factory?: DataProviderFactory;
  
  /**
   * Auto-connect providers on creation
   */
  autoConnect?: boolean;
  
  /**
   * Global transform for all providers
   */
  globalTransform?: (data: any) => any;
}

interface DataProviderManagerEvents {
  'provider:connect': (providerId: string) => void;
  'provider:disconnect': (providerId: string, reason?: string) => void;
  'provider:error': (providerId: string, error: Error) => void;
  'provider:statusChange': (providerId: string, status: ConnectionStatus) => void;
  'provider:removed': (providerId: string) => void;
  'data': (data: any, providerId: string) => void;
}

export class DataProviderManager extends TypedEventEmitter<DataProviderManagerEvents> {
  private providers = new Map<string, DataProvider>();
  private subscriptions = new Map<string, DataSubscription>();
  private factory: DataProviderFactory;
  private options: DataProviderManagerOptions;

  constructor(options: DataProviderManagerOptions = {}) {
    super();
    this.options = options;
    this.factory = options.factory || defaultDataProviderFactory;
  }

  /**
   * Create and register a data provider
   */
  async createProvider(config: DataProviderConfig): Promise<DataProvider> {
    if (this.providers.has(config.id)) {
      throw new Error(`Provider with id ${config.id} already exists`);
    }

    const provider = this.factory.create(config);
    this.providers.set(config.id, provider);

    // Set up provider event forwarding
    provider.on('connect', () => this.emit('provider:connect', config.id));
    provider.on('disconnect', (reason) => this.emit('provider:disconnect', config.id, reason));
    provider.on('error', (error) => this.emit('provider:error', config.id, error));
    provider.on('statusChange', (status) => this.emit('provider:statusChange', config.id, status));
    
    // Handle data with global transform
    provider.on('data', (data) => {
      const transformed = this.options.globalTransform 
        ? this.options.globalTransform(data) 
        : data;
      this.handleProviderData(config.id, transformed);
    });

    // Auto-connect if enabled
    if (this.options.autoConnect) {
      await provider.connect();
    }

    return provider;
  }

  /**
   * Get a provider by ID
   */
  getProvider(id: string): DataProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Remove a provider
   */
  async removeProvider(id: string): Promise<void> {
    const provider = this.providers.get(id);
    if (provider) {
      await provider.disconnect();
      provider.destroy();
      this.providers.delete(id);
      this.emit('provider:removed', id);
    }
  }

  /**
   * Connect all providers
   */
  async connectAll(): Promise<void> {
    const promises = Array.from(this.providers.values()).map(provider => 
      provider.state.status !== ConnectionStatus.Connected ? provider.connect() : Promise.resolve()
    );
    await Promise.all(promises);
  }

  /**
   * Disconnect all providers
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.providers.values()).map(provider => 
      provider.disconnect()
    );
    await Promise.all(promises);
  }

  /**
   * Send message to a specific provider
   */
  async send(providerId: string, trigger: DataProviderTrigger): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    await provider.send(trigger);
  }

  /**
   * Broadcast message to all connected providers
   */
  async broadcast(trigger: DataProviderTrigger): Promise<void> {
    const promises = Array.from(this.providers.values())
      .filter(provider => provider.state.status === ConnectionStatus.Connected)
      .map(provider => provider.send(trigger).catch(err => {
        this.emit('provider:error', provider.id, err);
      }));
    await Promise.all(promises);
  }

  /**
   * Subscribe to data from specific provider(s)
   */
  subscribe(options: {
    providerId?: string | string[];
    filter?: (data: any) => boolean;
    transform?: (data: any) => any;
    handler: (data: any, providerId: string) => void;
  }): DataSubscription {
    const id = this.generateSubscriptionId();
    
    const subscription: DataSubscription = {
      id,
      filter: options.filter,
      transform: options.transform,
      handler: (data: any) => {
        // This will be overridden per provider
      },
      unsubscribe: () => {
        this.unsubscribe(id);
      },
    };

    // Store provider IDs for this subscription
    const providerIds = options.providerId 
      ? Array.isArray(options.providerId) ? options.providerId : [options.providerId]
      : Array.from(this.providers.keys());

    // Create handler that includes provider ID
    const wrappedHandler = (data: any, providerId: string) => {
      options.handler(data, providerId);
    };

    // Store subscription with metadata
    this.subscriptions.set(id, {
      ...subscription,
      handler: wrappedHandler,
      providerIds,
    } as any);

    return subscription;
  }

  /**
   * Unsubscribe from data
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Get all providers
   */
  getAllProviders(): DataProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get providers by status
   */
  getProvidersByStatus(status: ConnectionStatus): DataProvider[] {
    return this.getAllProviders().filter(provider => provider.state.status === status);
  }

  /**
   * Destroy manager and all providers
   */
  async destroy(): Promise<void> {
    // Disconnect all providers
    await this.disconnectAll();
    
    // Destroy all providers
    this.providers.forEach(provider => provider.destroy());
    
    // Clear collections
    this.providers.clear();
    this.subscriptions.clear();
    
    // Remove all listeners
    this.removeAllListeners();
  }

  /**
   * Handle data from provider
   */
  private handleProviderData(providerId: string, data: any): void {
    // Process subscriptions
    this.subscriptions.forEach((subscription: any) => {
      // Check if subscription applies to this provider
      if (!subscription.providerIds || subscription.providerIds.includes(providerId)) {
        // Apply filter
        if (!subscription.filter || subscription.filter(data)) {
          // Apply transform
          const transformed = subscription.transform 
            ? subscription.transform(data) 
            : data;
          
          // Call handler
          subscription.handler(transformed, providerId);
        }
      }
    });

    // Emit global data event
    this.emit('data', data, providerId);
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}