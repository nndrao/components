/**
 * IndexedDB Storage Adapter
 * 
 * Implements local storage using IndexedDB for offline-first functionality.
 * This adapter provides full CRUD operations for component configurations
 * and profiles with support for versioning and search.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  IStorageAdapter,
  ComponentConfig,
  ProfileConfig,
  Version,
  SearchCriteria,
  IndexedDBSchema,
  StorageEvent,
  StorageEventListener
} from '@/types';

/**
 * IndexedDB database schema
 */
interface AGV1DBSchema extends DBSchema {
  componentConfigs: {
    key: string;
    value: ComponentConfig;
    indexes: {
      'by-user': string;
      'by-app': string;
      'by-type': string;
      'by-user-app': [string, string];
      'by-tags': string[];
      'by-category': string;
      'by-updated': string;
    };
  };
  profiles: {
    key: string;
    value: ProfileConfig;
    indexes: {
      'by-user': string;
      'by-app': string;
      'by-user-app': [string, string];
      'by-default': number;
    };
  };
  syncQueue: {
    key: number;
    value: {
      id?: number;
      operation: 'create' | 'update' | 'delete';
      type: 'config' | 'profile';
      entityId: string;
      timestamp: string;
      data?: any;
      retryCount: number;
    };
    autoIncrement: true;
  };
}

export class IndexedDBAdapter implements IStorageAdapter {
  private db: IDBPDatabase<AGV1DBSchema> | null = null;
  private readonly dbName = 'agv1-storage';
  private readonly dbVersion = 1;
  private eventListeners: StorageEventListener[] = [];

  /**
   * Initialize the IndexedDB database
   */
  async initialize(): Promise<void> {
    try {
      this.db = await openDB<AGV1DBSchema>(this.dbName, this.dbVersion, {
        upgrade(db) {
          // Create componentConfigs store
          if (!db.objectStoreNames.contains('componentConfigs')) {
            const configStore = db.createObjectStore('componentConfigs', {
              keyPath: 'instanceId'
            });
            configStore.createIndex('by-user', 'userId');
            configStore.createIndex('by-app', 'appId');
            configStore.createIndex('by-type', 'componentType');
            configStore.createIndex('by-user-app', ['userId', 'appId']);
            configStore.createIndex('by-tags', 'metadata.tags', { multiEntry: true });
            configStore.createIndex('by-category', 'metadata.category');
            configStore.createIndex('by-updated', 'updatedAt');
          }

          // Create profiles store
          if (!db.objectStoreNames.contains('profiles')) {
            const profileStore = db.createObjectStore('profiles', {
              keyPath: 'id'
            });
            profileStore.createIndex('by-user', 'userId');
            profileStore.createIndex('by-app', 'appId');
            profileStore.createIndex('by-user-app', ['userId', 'appId']);
            profileStore.createIndex('by-default', 'metadata.isDefault');
          }

          // Create sync queue store
          if (!db.objectStoreNames.contains('syncQueue')) {
            db.createObjectStore('syncQueue', {
              keyPath: 'id',
              autoIncrement: true
            });
          }
        }
      });

      console.log('IndexedDB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Ensure database is initialized
   */
  private ensureDb(): IDBPDatabase<AGV1DBSchema> {
    if (!this.db) {
      console.error('[IndexedDBAdapter] Database not initialized! Call initialize() first.');
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Save a component configuration
   */
  async saveComponentConfig(config: ComponentConfig): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction('componentConfigs', 'readwrite');
    
    try {
      // Check if config exists
      const existing = await tx.store.get(config.instanceId);
      
      if (existing) {
        // Update existing config
        config.updatedAt = new Date().toISOString();
        await tx.store.put(config);
      } else {
        // Create new config
        config.createdAt = config.createdAt || new Date().toISOString();
        config.updatedAt = config.updatedAt || config.createdAt;
        await tx.store.add(config);
      }
      
      await tx.done;
      
      // Add to sync queue if needed
      await this.addToSyncQueue('create', 'config', config.instanceId, config);
      
      // Emit event
      this.emitEvent({
        type: existing ? 'config-updated' : 'config-saved',
        timestamp: new Date().toISOString(),
        data: { instanceId: config.instanceId }
      });
    } catch (error) {
      console.error('Failed to save component config:', error);
      throw error;
    }
  }

  /**
   * Get a component configuration by ID
   */
  async getComponentConfig(instanceId: string): Promise<ComponentConfig | null> {
    const db = this.ensureDb();
    const config = await db.get('componentConfigs', instanceId);
    
    if (config && !config.isDeleted) {
      // Update access metadata
      config.metadata.lastAccessed = new Date().toISOString();
      config.metadata.accessCount = (config.metadata.accessCount || 0) + 1;
      
      // Update in background
      this.updateAccessMetadata(instanceId, config.metadata).catch(console.error);
      
      return config;
    }
    
    return null;
  }

  /**
   * Get all component configurations for a user
   */
  async getUserComponentConfigs(userId: string, appId: string): Promise<ComponentConfig[]> {
    const db = this.ensureDb();
    const configs = await db.getAllFromIndex('componentConfigs', 'by-user-app', [userId, appId]);
    
    return configs.filter(config => !config.isDeleted);
  }

  /**
   * Update a component configuration
   */
  async updateComponentConfig(instanceId: string, updates: Partial<ComponentConfig>): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction('componentConfigs', 'readwrite');
    
    try {
      const existing = await tx.store.get(instanceId);
      if (!existing) {
        throw new Error(`Component config ${instanceId} not found`);
      }
      
      const updated = {
        ...existing,
        ...updates,
        instanceId: existing.instanceId, // Prevent ID change
        updatedAt: new Date().toISOString()
      };
      
      await tx.store.put(updated);
      await tx.done;
      
      // Add to sync queue
      await this.addToSyncQueue('update', 'config', instanceId, updates);
      
      // Emit event
      this.emitEvent({
        type: 'config-updated',
        timestamp: new Date().toISOString(),
        data: { instanceId }
      });
    } catch (error) {
      console.error('Failed to update component config:', error);
      throw error;
    }
  }

  /**
   * Delete a component configuration (soft delete)
   */
  async deleteComponentConfig(instanceId: string): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction('componentConfigs', 'readwrite');
    
    try {
      const existing = await tx.store.get(instanceId);
      if (!existing) {
        throw new Error(`Component config ${instanceId} not found`);
      }
      
      // Soft delete
      existing.isDeleted = true;
      existing.deletedAt = new Date().toISOString();
      existing.updatedAt = existing.deletedAt;
      
      await tx.store.put(existing);
      await tx.done;
      
      // Add to sync queue
      await this.addToSyncQueue('delete', 'config', instanceId);
      
      // Emit event
      this.emitEvent({
        type: 'config-deleted',
        timestamp: new Date().toISOString(),
        data: { instanceId }
      });
    } catch (error) {
      console.error('Failed to delete component config:', error);
      throw error;
    }
  }

  /**
   * Save a profile
   */
  async saveProfile(profile: ProfileConfig): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction('profiles', 'readwrite');
    
    try {
      const existing = await tx.store.get(profile.id);
      
      if (existing) {
        profile.updatedAt = new Date().toISOString();
        await tx.store.put(profile);
      } else {
        profile.createdAt = profile.createdAt || new Date().toISOString();
        profile.updatedAt = profile.updatedAt || profile.createdAt;
        profile.lastAccessedAt = profile.lastAccessedAt || profile.createdAt;
        await tx.store.add(profile);
      }
      
      await tx.done;
      
      // Add to sync queue
      await this.addToSyncQueue('create', 'profile', profile.id, profile);
      
      // Emit event
      this.emitEvent({
        type: existing ? 'profile-updated' : 'profile-saved',
        timestamp: new Date().toISOString(),
        data: { profileId: profile.id }
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
      throw error;
    }
  }

  /**
   * Get a profile by ID
   */
  async getProfile(profileId: string): Promise<ProfileConfig | null> {
    const db = this.ensureDb();
    const profile = await db.get('profiles', profileId);
    
    if (profile) {
      // Update last accessed
      profile.lastAccessedAt = new Date().toISOString();
      
      // Update in background
      db.put('profiles', profile).catch(console.error);
      
      return profile;
    }
    
    return null;
  }

  /**
   * Get all profiles for a user
   */
  async getUserProfiles(userId: string, appId: string): Promise<ProfileConfig[]> {
    const db = this.ensureDb();
    return db.getAllFromIndex('profiles', 'by-user-app', [userId, appId]);
  }

  /**
   * Update a profile
   */
  async updateProfile(profileId: string, updates: Partial<ProfileConfig>): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction('profiles', 'readwrite');
    
    try {
      const existing = await tx.store.get(profileId);
      if (!existing) {
        throw new Error(`Profile ${profileId} not found`);
      }
      
      const updated = {
        ...existing,
        ...updates,
        id: existing.id, // Prevent ID change
        updatedAt: new Date().toISOString()
      };
      
      await tx.store.put(updated);
      await tx.done;
      
      // Add to sync queue
      await this.addToSyncQueue('update', 'profile', profileId, updates);
      
      // Emit event
      this.emitEvent({
        type: 'profile-updated',
        timestamp: new Date().toISOString(),
        data: { profileId }
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  /**
   * Delete a profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction('profiles', 'readwrite');
    
    try {
      await tx.store.delete(profileId);
      await tx.done;
      
      // Add to sync queue
      await this.addToSyncQueue('delete', 'profile', profileId);
      
      // Emit event
      this.emitEvent({
        type: 'profile-deleted',
        timestamp: new Date().toISOString(),
        data: { profileId }
      });
    } catch (error) {
      console.error('Failed to delete profile:', error);
      throw error;
    }
  }

  /**
   * Create a new version for a component
   */
  async createVersion(instanceId: string, version: Version): Promise<void> {
    const config = await this.getComponentConfig(instanceId);
    if (!config) {
      throw new Error(`Component config ${instanceId} not found`);
    }
    
    // Add version to the configuration
    config.settings.versions[version.id] = version;
    
    // Update the configuration
    await this.updateComponentConfig(instanceId, {
      settings: config.settings
    });
  }

  /**
   * Get all versions for a component
   */
  async getVersions(instanceId: string): Promise<Version[]> {
    const config = await this.getComponentConfig(instanceId);
    if (!config) {
      throw new Error(`Component config ${instanceId} not found`);
    }
    
    return Object.values(config.settings.versions);
  }

  /**
   * Restore a specific version
   */
  async restoreVersion(instanceId: string, versionId: string): Promise<void> {
    const config = await this.getComponentConfig(instanceId);
    if (!config) {
      throw new Error(`Component config ${instanceId} not found`);
    }
    
    const version = config.settings.versions[versionId];
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }
    
    // Update active version
    config.settings.activeVersionId = versionId;
    
    await this.updateComponentConfig(instanceId, {
      settings: config.settings
    });
  }

  /**
   * Search component configurations by criteria
   */
  async searchComponentConfigs(criteria: SearchCriteria): Promise<ComponentConfig[]> {
    console.log('[IndexedDBAdapter] searchComponentConfigs called with criteria:', criteria);
    
    const db = this.ensureDb();
    let configs: ComponentConfig[] = [];
    
    // Start with all configs or filtered by user
    if (criteria.userId) {
      configs = await db.getAllFromIndex('componentConfigs', 'by-user', criteria.userId);
      console.log('[IndexedDBAdapter] Found', configs.length, 'configs for user', criteria.userId);
    } else {
      configs = await db.getAll('componentConfigs');
      console.log('[IndexedDBAdapter] Found', configs.length, 'total configs');
    }
    
    // Filter out deleted configs
    configs = configs.filter(config => !config.isDeleted);
    
    // Apply filters
    if (criteria.componentType) {
      configs = configs.filter(c => c.componentType === criteria.componentType);
    }
    
    if (criteria.tags && criteria.tags.length > 0) {
      configs = configs.filter(c => 
        criteria.tags!.some(tag => c.metadata.tags.includes(tag))
      );
    }
    
    if (criteria.category) {
      configs = configs.filter(c => c.metadata.category === criteria.category);
    }
    
    if (criteria.isPublic !== undefined) {
      configs = configs.filter(c => c.permissions.isPublic === criteria.isPublic);
    }
    
    if (criteria.isShared !== undefined) {
      configs = configs.filter(c => c.sharing.isShared === criteria.isShared);
    }
    
    if (criteria.favorited !== undefined) {
      configs = configs.filter(c => c.metadata.favorited === criteria.favorited);
    }
    
    if (criteria.query) {
      const query = criteria.query.toLowerCase();
      configs = configs.filter(c => 
        c.displayName?.toLowerCase().includes(query) ||
        c.metadata.notes?.toLowerCase().includes(query) ||
        c.metadata.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply date range filter
    if (criteria.dateRange) {
      const start = new Date(criteria.dateRange.start).getTime();
      const end = new Date(criteria.dateRange.end).getTime();
      
      configs = configs.filter(c => {
        const date = new Date(c.updatedAt).getTime();
        return date >= start && date <= end;
      });
    }
    
    // Sort results
    if (criteria.sortBy) {
      configs.sort((a, b) => {
        let valueA: any, valueB: any;
        
        switch (criteria.sortBy) {
          case 'name':
            valueA = a.displayName || '';
            valueB = b.displayName || '';
            break;
          case 'created':
            valueA = new Date(a.createdAt).getTime();
            valueB = new Date(b.createdAt).getTime();
            break;
          case 'modified':
            valueA = new Date(a.updatedAt).getTime();
            valueB = new Date(b.updatedAt).getTime();
            break;
          case 'accessed':
            valueA = new Date(a.metadata.lastAccessed).getTime();
            valueB = new Date(b.metadata.lastAccessed).getTime();
            break;
          default:
            return 0;
        }
        
        const order = criteria.sortOrder === 'desc' ? -1 : 1;
        return valueA < valueB ? -order : valueA > valueB ? order : 0;
      });
    }
    
    // Apply pagination
    if (criteria.limit) {
      const offset = criteria.offset || 0;
      configs = configs.slice(offset, offset + criteria.limit);
    }
    
    console.log('[IndexedDBAdapter] Returning', configs.length, 'configs after filtering');
    return configs;
  }

  /**
   * Get shared configurations
   */
  async getSharedConfigs(userId: string): Promise<ComponentConfig[]> {
    const db = this.ensureDb();
    const allConfigs = await db.getAll('componentConfigs');
    
    return allConfigs.filter(config => 
      !config.isDeleted &&
      config.sharing.isShared &&
      config.sharing.sharedWith.some(share => share.userId === userId)
    );
  }

  /**
   * Get public configurations
   */
  async getPublicConfigs(): Promise<ComponentConfig[]> {
    const db = this.ensureDb();
    const allConfigs = await db.getAll('componentConfigs');
    
    return allConfigs.filter(config => 
      !config.isDeleted &&
      config.permissions.isPublic
    );
  }

  /**
   * Add operation to sync queue
   */
  private async addToSyncQueue(
    operation: 'create' | 'update' | 'delete',
    type: 'config' | 'profile',
    entityId: string,
    data?: any
  ): Promise<void> {
    const db = this.ensureDb();
    
    await db.add('syncQueue', {
      operation,
      type,
      entityId,
      timestamp: new Date().toISOString(),
      data,
      retryCount: 0
    });
  }

  /**
   * Get pending sync items
   */
  async getSyncQueue(): Promise<any[]> {
    const db = this.ensureDb();
    return db.getAll('syncQueue');
  }

  /**
   * Clear sync queue
   */
  async clearSyncQueue(): Promise<void> {
    const db = this.ensureDb();
    await db.clear('syncQueue');
  }

  /**
   * Update access metadata in background
   */
  private async updateAccessMetadata(instanceId: string, metadata: any): Promise<void> {
    const db = this.ensureDb();
    const config = await db.get('componentConfigs', instanceId);
    
    if (config) {
      config.metadata = metadata;
      await db.put('componentConfigs', config);
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
    
    // Return unsubscribe function
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async searchConfigs(criteria: SearchCriteria): Promise<ComponentConfig[]> {
    return this.searchComponentConfigs(criteria);
  }
}