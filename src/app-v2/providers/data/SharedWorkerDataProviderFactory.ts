/**
 * SharedWorker Data Provider Factory
 * 
 * Factory that creates WorkerDataProvider instances when SharedWorker is enabled
 */

import { DataProvider, DataProviderConfig } from './data-provider.types';
import { WorkerDataProvider } from './WorkerDataProvider';
import { DataProviderFactory } from './DataProviderFactory';

export class SharedWorkerDataProviderFactory implements DataProviderFactory {
  private fallbackFactory: DataProviderFactory;
  private useSharedWorker: boolean;

  constructor(fallbackFactory: DataProviderFactory, useSharedWorker = true) {
    this.fallbackFactory = fallbackFactory;
    this.useSharedWorker = useSharedWorker;
  }

  /**
   * Create a data provider instance
   */
  create(config: DataProviderConfig): DataProvider {
    // Check if SharedWorker should be used
    if (this.useSharedWorker && WorkerDataProvider.isSupported()) {
      console.log(`[SharedWorkerDataProviderFactory] Creating WorkerDataProvider for ${config.id}`);
      return new WorkerDataProvider(config);
    }
    
    // Fall back to regular provider
    console.log(`[SharedWorkerDataProviderFactory] Falling back to regular provider for ${config.id}`);
    return this.fallbackFactory.create(config);
  }

  /**
   * Update whether to use SharedWorker
   */
  setUseSharedWorker(useSharedWorker: boolean): void {
    this.useSharedWorker = useSharedWorker;
  }

  /**
   * Check if SharedWorker is available and enabled
   */
  isSharedWorkerActive(): boolean {
    return this.useSharedWorker && WorkerDataProvider.isSupported();
  }
}