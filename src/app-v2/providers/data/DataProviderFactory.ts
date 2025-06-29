/**
 * Data Provider Factory
 * 
 * Factory for creating data providers based on configuration.
 */

import {
  DataProvider,
  DataProviderConfig,
  DataProviderFactory as IDataProviderFactory,
  DataProviderType,
} from './data-provider.types';
import { WebSocketDataProvider } from './WebSocketDataProvider';
import { RestDataProvider } from './RestDataProvider';
import { StaticDataProvider } from './StaticDataProvider';

export class DataProviderFactory implements IDataProviderFactory {
  private providers = new Map<string, new (config: DataProviderConfig) => DataProvider>();

  constructor() {
    // Register built-in providers
    this.register(DataProviderType.WebSocket, WebSocketDataProvider);
    this.register(DataProviderType.REST, RestDataProvider);
    this.register(DataProviderType.Polling, RestDataProvider); // REST with polling
    this.register(DataProviderType.Static, StaticDataProvider);
  }

  /**
   * Register a custom provider
   */
  register(
    type: string,
    providerClass: new (config: DataProviderConfig) => DataProvider
  ): void {
    this.providers.set(type, providerClass);
  }

  /**
   * Create data provider
   */
  create(config: DataProviderConfig): DataProvider {
    const ProviderClass = this.providers.get(config.type);
    
    if (!ProviderClass) {
      throw new Error(`Unsupported provider type: ${config.type}`);
    }

    return new ProviderClass(config);
  }

  /**
   * Check if provider type is supported
   */
  supports(type: DataProviderType | string): boolean {
    return this.providers.has(type);
  }
}

// Default factory instance
export const defaultDataProviderFactory = new DataProviderFactory();