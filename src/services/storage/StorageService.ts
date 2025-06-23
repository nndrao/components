/**
 * Storage Service
 * 
 * Coordinates storage operations and provides a unified interface
 * for storage management. Handles storage adapter selection,
 * initialization, and monitoring.
 */

import {
  IStorageAdapter,
  HybridStorageConfig,
  StorageEvent,
  StorageEventListener,
  SyncStatus
} from '@/types';
import { IndexedDBAdapter } from './IndexedDBAdapter';
import { MongoDBAdapter } from './MongoDBAdapter';
import { HybridStorageAdapter } from './HybridStorageAdapter';

/**
 * Storage mode options
 */
export type StorageMode = 'local' | 'remote' | 'hybrid';

/**
 * Storage service configuration
 */
export interface StorageServiceConfig {
  mode: StorageMode;
  mongoDbConfig?: {
    apiUrl: string;
    authToken?: string;
  };
  hybridConfig?: Partial<HybridStorageConfig>;
}

/**
 * Storage health status
 */
export interface StorageHealth {
  mode: StorageMode;
  status: 'healthy' | 'degraded' | 'error';
  local?: {
    connected: boolean;
    error?: string;
  };
  remote?: {
    connected: boolean;
    error?: string;
  };
  sync?: SyncStatus;
}

/**
 * Storage service implementation
 */
export class StorageService {
  private adapter: IStorageAdapter | null = null;
  private config: StorageServiceConfig;
  private eventListeners: StorageEventListener[] = [];
  private healthCheckInterval?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config: StorageServiceConfig) {
    this.config = config;
  }

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('StorageService already initialized');
      return;
    }

    try {
      // Create appropriate adapter based on mode
      switch (this.config.mode) {
        case 'local':
          this.adapter = new IndexedDBAdapter();
          break;
          
        case 'remote':
          const mongoAdapter = new MongoDBAdapter();
          if (this.config.mongoDbConfig?.authToken) {
            mongoAdapter.setAuthToken(this.config.mongoDbConfig.authToken);
          }
          this.adapter = mongoAdapter;
          break;
          
        case 'hybrid':
          this.adapter = new HybridStorageAdapter(this.config.hybridConfig);
          break;
          
        default:
          throw new Error(`Unknown storage mode: ${this.config.mode}`);
      }

      // Initialize the adapter
      await this.adapter!.initialize();
      
      // Subscribe to adapter events
      this.adapter!.addEventListener(this.handleStorageEvent.bind(this));
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.isInitialized = true;
      console.log(`StorageService initialized in ${this.config.mode} mode`);
    } catch (error) {
      console.error('Failed to initialize StorageService:', error);
      throw error;
    }
  }

  /**
   * Get the storage adapter
   */
  getAdapter(): IStorageAdapter {
    if (!this.adapter) {
      throw new Error('StorageService not initialized');
    }
    return this.adapter;
  }

  /**
   * Change storage mode
   */
  async changeMode(newMode: StorageMode, config?: any): Promise<void> {
    console.log(`Changing storage mode from ${this.config.mode} to ${newMode}`);
    
    // Stop health monitoring
    this.stopHealthMonitoring();
    
    // Close current adapter
    if (this.adapter && 'close' in this.adapter) {
      await (this.adapter as any).close();
    }
    
    // Update config
    this.config.mode = newMode;
    if (config) {
      if (newMode === 'remote' && config.mongoDbConfig) {
        this.config.mongoDbConfig = config.mongoDbConfig;
      } else if (newMode === 'hybrid' && config.hybridConfig) {
        this.config.hybridConfig = config.hybridConfig;
      }
    }
    
    // Reinitialize
    this.isInitialized = false;
    this.adapter = null;
    await this.initialize();
  }

  /**
   * Get storage health status
   */
  async getHealth(): Promise<StorageHealth> {
    const health: StorageHealth = {
      mode: this.config.mode,
      status: 'healthy'
    };

    if (!this.adapter) {
      health.status = 'error';
      return health;
    }

    try {
      switch (this.config.mode) {
        case 'local':
          health.local = {
            connected: true
          };
          break;
          
        case 'remote':
          // In production, would check actual connection
          health.remote = {
            connected: navigator.onLine
          };
          if (!navigator.onLine) {
            health.status = 'error';
            health.remote.error = 'No internet connection';
          }
          break;
          
        case 'hybrid':
          const hybridAdapter = this.adapter as HybridStorageAdapter;
          const syncStatus = hybridAdapter.getSyncStatus();
          
          health.local = { connected: true };
          health.remote = { connected: navigator.onLine };
          health.sync = syncStatus;
          
          if (!navigator.onLine) {
            health.status = 'degraded';
            health.remote.error = 'No internet connection';
          } else if (syncStatus.failedItems && syncStatus.failedItems.length > 0) {
            health.status = 'degraded';
          }
          break;
      }
    } catch (error) {
      health.status = 'error';
      console.error('Health check failed:', error);
    }

    return health;
  }

  /**
   * Force sync (for hybrid mode)
   */
  async forceSync(): Promise<void> {
    if (this.config.mode !== 'hybrid') {
      throw new Error('Sync is only available in hybrid mode');
    }

    const hybridAdapter = this.adapter as HybridStorageAdapter;
    await hybridAdapter.sync();
  }

  /**
   * Get sync status (for hybrid mode)
   */
  getSyncStatus(): SyncStatus | null {
    if (this.config.mode !== 'hybrid') {
      return null;
    }

    const hybridAdapter = this.adapter as HybridStorageAdapter;
    return hybridAdapter.getSyncStatus();
  }

  /**
   * Clear all data
   */
  async clearAllData(): Promise<void> {
    if (!this.adapter) {
      throw new Error('StorageService not initialized');
    }

    // This would need to be implemented in each adapter
    console.warn('Clear all data not fully implemented');
    
    // For now, just clear sync queue if hybrid
    if (this.config.mode === 'hybrid' && 'clearSyncQueue' in this.adapter) {
      await (this.adapter as any).clearSyncQueue();
    }
  }

  /**
   * Export all data
   */
  async exportAllData(): Promise<string> {
    if (!this.adapter) {
      throw new Error('StorageService not initialized');
    }

    const [configs, profiles] = await Promise.all([
      this.adapter.searchComponentConfigs({}),
      this.getAllProfiles()
    ]);

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      mode: this.config.mode,
      data: {
        configurations: configs,
        profiles: profiles
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import data
   */
  async importData(jsonData: string): Promise<{
    configurations: number;
    profiles: number;
  }> {
    if (!this.adapter) {
      throw new Error('StorageService not initialized');
    }

    let importData;
    try {
      importData = JSON.parse(jsonData);
    } catch (error) {
      throw new Error('Invalid import data format');
    }

    if (!importData.data) {
      throw new Error('Invalid import data structure');
    }

    let configCount = 0;
    let profileCount = 0;

    // Import configurations
    if (importData.data.configurations) {
      for (const config of importData.data.configurations) {
        await this.adapter.saveComponentConfig(config);
        configCount++;
      }
    }

    // Import profiles
    if (importData.data.profiles) {
      for (const profile of importData.data.profiles) {
        await this.adapter.saveProfile(profile);
        profileCount++;
      }
    }

    return {
      configurations: configCount,
      profiles: profileCount
    };
  }

  /**
   * Get storage statistics
   */
  async getStatistics(): Promise<{
    configurations: {
      total: number;
      byType: Record<string, number>;
    };
    profiles: {
      total: number;
    };
    storage: {
      mode: StorageMode;
      syncPending?: number;
    };
  }> {
    if (!this.adapter) {
      throw new Error('StorageService not initialized');
    }

    const configs = await this.adapter.searchComponentConfigs({});
    const profiles = await this.getAllProfiles();

    const configsByType: Record<string, number> = {};
    for (const config of configs) {
      configsByType[config.componentType] = (configsByType[config.componentType] || 0) + 1;
    }

    const stats = {
      configurations: {
        total: configs.length,
        byType: configsByType
      },
      profiles: {
        total: profiles.length
      },
      storage: {
        mode: this.config.mode,
        syncPending: undefined as number | undefined
      }
    };

    // Add sync pending count for hybrid mode
    if (this.config.mode === 'hybrid') {
      const syncStatus = this.getSyncStatus();
      if (syncStatus) {
        stats.storage.syncPending = syncStatus.pendingChanges;
      }
    }

    return stats;
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    // Check health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getHealth();
        
        if (health.status === 'error') {
          console.error('Storage health check failed:', health);
          this.emitEvent({
            type: 'storage-error',
            timestamp: new Date().toISOString(),
            data: health
          });
        } else if (health.status === 'degraded') {
          console.warn('Storage health degraded:', health);
          this.emitEvent({
            type: 'storage-degraded',
            timestamp: new Date().toISOString(),
            data: health
          });
        }
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, 30000);
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Handle storage events from adapter
   */
  private handleStorageEvent(event: StorageEvent): void {
    // Log important events
    if (event.type === 'sync-failed' || event.type === 'conflict-detected') {
      console.warn('Storage event:', event);
    }

    // Forward to listeners
    this.emitEvent(event);
  }

  /**
   * Emit storage event
   */
  private emitEvent(event: StorageEvent | any): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in storage event listener:', error);
      }
    });
  }

  /**
   * Add event listener
   */
  addEventListener(listener: StorageEventListener): () => void {
    this.eventListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get all profiles (helper method)
   */
  private async getAllProfiles(): Promise<any[]> {
    // This is a simplified version - would need proper implementation
    // based on the current user context
    try {
      return await this.adapter!.getUserProfiles('', '');
    } catch {
      return [];
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    this.stopHealthMonitoring();
    
    if (this.adapter && 'close' in this.adapter) {
      await (this.adapter as any).close();
    }
    
    this.adapter = null;
    this.isInitialized = false;
    this.eventListeners = [];
  }
}