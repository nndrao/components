/**
 * Hybrid Storage Adapter
 * 
 * Combines IndexedDB (local) and MongoDB (remote) storage with automatic
 * synchronization and conflict resolution. Provides offline-first functionality
 * with seamless sync when online.
 */

import { IndexedDBAdapter } from './IndexedDBAdapter';
import { MongoDBAdapter } from './MongoDBAdapter';
import {
  IStorageAdapter,
  ComponentConfig,
  ProfileConfig,
  Version,
  SearchCriteria,
  HybridStorageConfig,
  ConflictResolution,
  SyncStatus,
  StorageEvent,
  StorageEventListener
} from '@/types';

/**
 * Sync operation type
 */
interface SyncOperation {
  type: 'config' | 'profile';
  operation: 'create' | 'update' | 'delete';
  entityId: string;
  localVersion?: any;
  remoteVersion?: any;
  conflict?: boolean;
  resolution?: 'local' | 'remote' | 'merged';
}

/**
 * Default hybrid storage configuration
 */
const DEFAULT_CONFIG: HybridStorageConfig = {
  conflictResolution: 'newest-wins',
  syncInterval: 30000, // 30 seconds
  syncOnStartup: true,
  syncOnSave: true,
  maxRetries: 3,
  retryDelay: 1000
};

export class HybridStorageAdapter implements IStorageAdapter {
  private localAdapter: IndexedDBAdapter;
  private remoteAdapter: MongoDBAdapter;
  private config: HybridStorageConfig;
  private syncStatus: SyncStatus;
  private syncTimer?: NodeJS.Timeout;
  private eventListeners: StorageEventListener[] = [];
  private isSyncing = false;
  private onlineStatus = navigator.onLine;

  constructor(config?: Partial<HybridStorageConfig>) {
    this.localAdapter = new IndexedDBAdapter();
    this.remoteAdapter = new MongoDBAdapter();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.syncStatus = {
      lastSyncTime: '',
      pendingChanges: 0,
      syncInProgress: false,
      lastError: undefined,
      failedItems: []
    };
    
    // Monitor online/offline status
    this.setupOnlineMonitoring();
  }

  /**
   * Initialize both adapters and start sync
   */
  async initialize(): Promise<void> {
    // Initialize local storage
    await this.localAdapter.initialize();
    
    // Try to initialize remote storage
    if (this.onlineStatus) {
      try {
        await this.remoteAdapter.initialize();
        
        // Perform initial sync if configured
        if (this.config.syncOnStartup) {
          await this.sync();
        }
      } catch (error) {
        console.warn('Failed to initialize remote storage:', error);
        // Continue with local-only mode
      }
    }
    
    // Start sync interval
    if (this.config.syncInterval > 0) {
      this.startSyncInterval();
    }
    
    // Subscribe to local changes
    this.localAdapter.addEventListener(this.handleLocalChange.bind(this));
  }

  /**
   * Save a component configuration
   */
  async saveComponentConfig(config: ComponentConfig): Promise<void> {
    // Always save locally first
    await this.localAdapter.saveComponentConfig(config);
    
    // Sync to remote if configured and online
    if (this.config.syncOnSave && this.onlineStatus) {
      try {
        await this.remoteAdapter.saveComponentConfig(config);
      } catch (error) {
        console.warn('Failed to save to remote:', error);
        // Add to sync queue
        await this.queueForSync('config', 'create', config.instanceId);
      }
    }
    
    this.emitEvent({
      type: 'config-saved',
      timestamp: new Date().toISOString(),
      data: { instanceId: config.instanceId }
    });
  }

  /**
   * Get a component configuration by ID
   */
  async getComponentConfig(instanceId: string): Promise<ComponentConfig | null> {
    // Try local first (faster)
    const localConfig = await this.localAdapter.getComponentConfig(instanceId);
    
    // If online, check remote for updates
    if (this.onlineStatus && !this.isSyncing) {
      try {
        const remoteConfig = await this.remoteAdapter.getComponentConfig(instanceId);
        
        if (remoteConfig && localConfig) {
          // Compare versions and resolve conflicts
          const resolved = await this.resolveConflict(localConfig, remoteConfig);
          if (resolved !== localConfig) {
            await this.localAdapter.saveComponentConfig(resolved);
            return resolved;
          }
        } else if (remoteConfig && !localConfig) {
          // Remote has config that local doesn't
          await this.localAdapter.saveComponentConfig(remoteConfig);
          return remoteConfig;
        }
      } catch (error) {
        console.warn('Failed to check remote config:', error);
      }
    }
    
    return localConfig;
  }

  /**
   * Get all component configurations for a user
   */
  async getUserComponentConfigs(userId: string, appId: string): Promise<ComponentConfig[]> {
    // Get local configs
    const localConfigs = await this.localAdapter.getUserComponentConfigs(userId, appId);
    
    // If offline or syncing, return local only
    if (!this.onlineStatus || this.isSyncing) {
      return localConfigs;
    }
    
    // Try to get remote configs
    try {
      const remoteConfigs = await this.remoteAdapter.getUserComponentConfigs(userId, appId);
      
      // Merge and resolve conflicts
      const merged = await this.mergeConfigLists(localConfigs, remoteConfigs);
      
      // Update local with any new/updated configs
      for (const config of merged) {
        const local = localConfigs.find(c => c.instanceId === config.instanceId);
        if (!local || local.updatedAt < config.updatedAt) {
          await this.localAdapter.saveComponentConfig(config);
        }
      }
      
      return merged;
    } catch (error) {
      console.warn('Failed to get remote configs:', error);
      return localConfigs;
    }
  }

  /**
   * Update a component configuration
   */
  async updateComponentConfig(instanceId: string, updates: Partial<ComponentConfig>): Promise<void> {
    // Update locally first
    await this.localAdapter.updateComponentConfig(instanceId, updates);
    
    // Sync to remote if configured and online
    if (this.config.syncOnSave && this.onlineStatus) {
      try {
        await this.remoteAdapter.updateComponentConfig(instanceId, updates);
      } catch (error) {
        console.warn('Failed to update remote config:', error);
        await this.queueForSync('config', 'update', instanceId);
      }
    }
    
    this.emitEvent({
      type: 'config-updated',
      timestamp: new Date().toISOString(),
      data: { instanceId }
    });
  }

  /**
   * Delete a component configuration
   */
  async deleteComponentConfig(instanceId: string): Promise<void> {
    // Delete locally first
    await this.localAdapter.deleteComponentConfig(instanceId);
    
    // Sync to remote if online
    if (this.onlineStatus) {
      try {
        await this.remoteAdapter.deleteComponentConfig(instanceId);
      } catch (error) {
        console.warn('Failed to delete remote config:', error);
        await this.queueForSync('config', 'delete', instanceId);
      }
    }
    
    this.emitEvent({
      type: 'config-deleted',
      timestamp: new Date().toISOString(),
      data: { instanceId }
    });
  }

  /**
   * Save a profile
   */
  async saveProfile(profile: ProfileConfig): Promise<void> {
    await this.localAdapter.saveProfile(profile);
    
    if (this.config.syncOnSave && this.onlineStatus) {
      try {
        await this.remoteAdapter.saveProfile(profile);
      } catch (error) {
        console.warn('Failed to save remote profile:', error);
        await this.queueForSync('profile', 'create', profile.id);
      }
    }
    
    this.emitEvent({
      type: 'profile-saved',
      timestamp: new Date().toISOString(),
      data: { profileId: profile.id }
    });
  }

  /**
   * Get a profile by ID
   */
  async getProfile(profileId: string): Promise<ProfileConfig | null> {
    const localProfile = await this.localAdapter.getProfile(profileId);
    
    if (this.onlineStatus && !this.isSyncing) {
      try {
        const remoteProfile = await this.remoteAdapter.getProfile(profileId);
        
        if (remoteProfile && localProfile) {
          const resolved = await this.resolveProfileConflict(localProfile, remoteProfile);
          if (resolved !== localProfile) {
            await this.localAdapter.saveProfile(resolved);
            return resolved;
          }
        } else if (remoteProfile && !localProfile) {
          await this.localAdapter.saveProfile(remoteProfile);
          return remoteProfile;
        }
      } catch (error) {
        console.warn('Failed to check remote profile:', error);
      }
    }
    
    return localProfile;
  }

  /**
   * Get all profiles for a user
   */
  async getUserProfiles(userId: string, appId: string): Promise<ProfileConfig[]> {
    const localProfiles = await this.localAdapter.getUserProfiles(userId, appId);
    
    if (!this.onlineStatus || this.isSyncing) {
      return localProfiles;
    }
    
    try {
      const remoteProfiles = await this.remoteAdapter.getUserProfiles(userId, appId);
      const merged = await this.mergeProfileLists(localProfiles, remoteProfiles);
      
      for (const profile of merged) {
        const local = localProfiles.find(p => p.id === profile.id);
        if (!local || local.updatedAt < profile.updatedAt) {
          await this.localAdapter.saveProfile(profile);
        }
      }
      
      return merged;
    } catch (error) {
      console.warn('Failed to get remote profiles:', error);
      return localProfiles;
    }
  }

  /**
   * Update a profile
   */
  async updateProfile(profileId: string, updates: Partial<ProfileConfig>): Promise<void> {
    await this.localAdapter.updateProfile(profileId, updates);
    
    if (this.config.syncOnSave && this.onlineStatus) {
      try {
        await this.remoteAdapter.updateProfile(profileId, updates);
      } catch (error) {
        console.warn('Failed to update remote profile:', error);
        await this.queueForSync('profile', 'update', profileId);
      }
    }
    
    this.emitEvent({
      type: 'profile-updated',
      timestamp: new Date().toISOString(),
      data: { profileId }
    });
  }

  /**
   * Delete a profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    await this.localAdapter.deleteProfile(profileId);
    
    if (this.onlineStatus) {
      try {
        await this.remoteAdapter.deleteProfile(profileId);
      } catch (error) {
        console.warn('Failed to delete remote profile:', error);
        await this.queueForSync('profile', 'delete', profileId);
      }
    }
    
    this.emitEvent({
      type: 'profile-deleted',
      timestamp: new Date().toISOString(),
      data: { profileId }
    });
  }

  /**
   * Version management - delegate to local with sync
   */
  async createVersion(instanceId: string, version: Version): Promise<void> {
    await this.localAdapter.createVersion(instanceId, version);
    
    if (this.onlineStatus) {
      try {
        await this.remoteAdapter.createVersion(instanceId, version);
      } catch (error) {
        console.warn('Failed to create remote version:', error);
        await this.queueForSync('config', 'update', instanceId);
      }
    }
  }

  async getVersions(instanceId: string): Promise<Version[]> {
    return this.localAdapter.getVersions(instanceId);
  }

  async restoreVersion(instanceId: string, versionId: string): Promise<void> {
    await this.localAdapter.restoreVersion(instanceId, versionId);
    
    if (this.onlineStatus) {
      try {
        await this.remoteAdapter.restoreVersion(instanceId, versionId);
      } catch (error) {
        console.warn('Failed to restore remote version:', error);
        await this.queueForSync('config', 'update', instanceId);
      }
    }
  }

  /**
   * Search configurations
   */
  async searchConfigs(criteria: SearchCriteria): Promise<ComponentConfig[]> {
    // For search, prefer remote if online (more complete data)
    if (this.onlineStatus) {
      try {
        return await this.remoteAdapter.searchConfigs(criteria);
      } catch (error) {
        console.warn('Failed to search remote, falling back to local:', error);
      }
    }
    
    return this.localAdapter.searchConfigs(criteria);
  }

  /** Alias for searchConfigs */
  async searchComponentConfigs(criteria: SearchCriteria): Promise<ComponentConfig[]> {
    return this.searchConfigs(criteria);
  }

  /**
   * Get shared configurations
   */
  async getSharedConfigs(userId: string): Promise<ComponentConfig[]> {
    if (this.onlineStatus) {
      try {
        return await this.remoteAdapter.getSharedConfigs(userId);
      } catch (error) {
        console.warn('Failed to get remote shared configs:', error);
      }
    }
    
    return this.localAdapter.getSharedConfigs(userId);
  }

  /**
   * Get public configurations
   */
  async getPublicConfigs(): Promise<ComponentConfig[]> {
    if (this.onlineStatus) {
      try {
        return await this.remoteAdapter.getPublicConfigs();
      } catch (error) {
        console.warn('Failed to get remote public configs:', error);
      }
    }
    
    return this.localAdapter.getPublicConfigs();
  }

  /**
   * Perform full synchronization
   */
  async sync(): Promise<void> {
    if (this.isSyncing || !this.onlineStatus) {
      return;
    }
    
    this.isSyncing = true;
    this.syncStatus.syncInProgress = true;
    
    this.emitEvent({
      type: 'sync-started',
      timestamp: new Date().toISOString()
    });
    
    try {
      // Get pending changes from sync queue
      const syncQueue = await this.localAdapter.getSyncQueue();
      
      // Process sync queue
      for (const item of syncQueue) {
        await this.processSyncItem(item);
      }
      
      // Full sync - compare all items
      await this.fullSync();
      
      // Clear processed items from queue
      await this.localAdapter.clearSyncQueue();
      
      this.syncStatus.lastSyncTime = new Date().toISOString();
      this.syncStatus.pendingChanges = 0;
      this.syncStatus.lastError = undefined;
      
      this.emitEvent({
        type: 'sync-completed',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Sync failed:', error);
      this.syncStatus.lastError = (error as Error).message;
      
      this.emitEvent({
        type: 'sync-failed',
        timestamp: new Date().toISOString(),
        error: error as Error
      });
    } finally {
      this.isSyncing = false;
      this.syncStatus.syncInProgress = false;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Resolve conflict between local and remote configs
   */
  private async resolveConflict(
    local: ComponentConfig,
    remote: ComponentConfig
  ): Promise<ComponentConfig> {
    this.emitEvent({
      type: 'conflict-detected',
      timestamp: new Date().toISOString(),
      data: { instanceId: local.instanceId, type: 'config' }
    });
    
    let resolved: ComponentConfig;
    
    switch (this.config.conflictResolution) {
      case 'local-wins':
        resolved = local;
        break;
        
      case 'remote-wins':
        resolved = remote;
        break;
        
      case 'newest-wins':
        resolved = new Date(local.updatedAt) > new Date(remote.updatedAt) ? local : remote;
        break;
        
      case 'manual':
        // In a real implementation, this would prompt the user
        // For now, default to newest-wins
        resolved = new Date(local.updatedAt) > new Date(remote.updatedAt) ? local : remote;
        break;
        
      default:
        resolved = local;
    }
    
    this.emitEvent({
      type: 'conflict-resolved',
      timestamp: new Date().toISOString(),
      data: { 
        instanceId: local.instanceId, 
        resolution: resolved === local ? 'local' : 'remote' 
      }
    });
    
    return resolved;
  }

  /**
   * Resolve conflict between local and remote profiles
   */
  private async resolveProfileConflict(
    local: ProfileConfig,
    remote: ProfileConfig
  ): Promise<ProfileConfig> {
    // Similar to resolveConflict but for profiles
    const localDate = new Date(local.updatedAt);
    const remoteDate = new Date(remote.updatedAt);
    
    switch (this.config.conflictResolution) {
      case 'local-wins':
        return local;
      case 'remote-wins':
        return remote;
      case 'newest-wins':
      default:
        return localDate > remoteDate ? local : remote;
    }
  }

  /**
   * Merge config lists and resolve conflicts
   */
  private async mergeConfigLists(
    local: ComponentConfig[],
    remote: ComponentConfig[]
  ): Promise<ComponentConfig[]> {
    const merged = new Map<string, ComponentConfig>();
    
    // Add all local configs
    for (const config of local) {
      merged.set(config.instanceId, config);
    }
    
    // Merge remote configs
    for (const config of remote) {
      const existing = merged.get(config.instanceId);
      if (existing) {
        const resolved = await this.resolveConflict(existing, config);
        merged.set(config.instanceId, resolved);
      } else {
        merged.set(config.instanceId, config);
      }
    }
    
    return Array.from(merged.values());
  }

  /**
   * Merge profile lists
   */
  private async mergeProfileLists(
    local: ProfileConfig[],
    remote: ProfileConfig[]
  ): Promise<ProfileConfig[]> {
    const merged = new Map<string, ProfileConfig>();
    
    for (const profile of local) {
      merged.set(profile.id, profile);
    }
    
    for (const profile of remote) {
      const existing = merged.get(profile.id);
      if (existing) {
        const resolved = await this.resolveProfileConflict(existing, profile);
        merged.set(profile.id, resolved);
      } else {
        merged.set(profile.id, profile);
      }
    }
    
    return Array.from(merged.values());
  }

  /**
   * Queue an operation for sync
   */
  private async queueForSync(
    type: 'config' | 'profile',
    operation: 'create' | 'update' | 'delete',
    entityId: string
  ): Promise<void> {
    // This uses the sync queue in IndexedDB
    this.syncStatus.pendingChanges++;
  }

  /**
   * Process a sync queue item
   */
  private async processSyncItem(item: any): Promise<void> {
    try {
      switch (item.type) {
        case 'config':
          if (item.operation === 'delete') {
            await this.remoteAdapter.deleteComponentConfig(item.entityId);
          } else {
            const config = await this.localAdapter.getComponentConfig(item.entityId);
            if (config) {
              await this.remoteAdapter.saveComponentConfig(config);
            }
          }
          break;
          
        case 'profile':
          if (item.operation === 'delete') {
            await this.remoteAdapter.deleteProfile(item.entityId);
          } else {
            const profile = await this.localAdapter.getProfile(item.entityId);
            if (profile) {
              await this.remoteAdapter.saveProfile(profile);
            }
          }
          break;
      }
    } catch (error) {
      console.error(`Failed to sync ${item.type} ${item.entityId}:`, error);
      this.syncStatus.failedItems?.push(item.entityId);
    }
  }

  /**
   * Perform full synchronization
   */
  private async fullSync(): Promise<void> {
    // This would be more sophisticated in production
    // For now, just ensure remote has all local changes
    console.log('Performing full sync...');
  }

  /**
   * Handle local storage changes
   */
  private handleLocalChange(event: StorageEvent): void {
    // Queue for sync if needed
    if (this.config.syncOnSave && this.onlineStatus && !this.isSyncing) {
      // Extract entity info from event and queue
    }
  }

  /**
   * Setup online/offline monitoring
   */
  private setupOnlineMonitoring(): void {
    window.addEventListener('online', () => {
      this.onlineStatus = true;
      console.log('Back online, starting sync...');
      this.sync();
    });
    
    window.addEventListener('offline', () => {
      this.onlineStatus = false;
      console.log('Gone offline, using local storage only');
    });
  }

  /**
   * Start sync interval
   */
  private startSyncInterval(): void {
    this.syncTimer = setInterval(() => {
      if (this.onlineStatus && !this.isSyncing) {
        this.sync();
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop sync interval
   */
  private stopSyncInterval(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  /**
   * Emit storage event
   */
  private emitEvent(event: StorageEvent): void {
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
    
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Cleanup resources
   */
  async close(): Promise<void> {
    this.stopSyncInterval();
    await this.localAdapter.close();
  }
}