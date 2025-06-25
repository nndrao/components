/**
 * Configuration Service Implementation
 * 
 * This service provides all configuration management operations using IndexedDB.
 * It implements the ConfigService interface with full CRUD support and querying capabilities.
 */

import { IDBPDatabase } from 'idb';
import {
  Config,
  ConfigFilter,
  ConfigService,
  ConfigValidationResult,
  isConfig,
  ConfigEvent,
  ConfigEventType
} from './config.types';
import { ConfigDBSchema, getDB, STORE_NAME } from './config.db';

// Extend ConfigService interface to include event methods
export interface ConfigServiceWithEvents extends ConfigService {
  on(eventType: ConfigEventType, listener: (event: ConfigEvent) => void): () => void;
  off(eventType: ConfigEventType, listener: (event: ConfigEvent) => void): void;
}

/**
 * Configuration service implementation
 */
export class ConfigServiceImpl implements ConfigServiceWithEvents {
  private db: IDBPDatabase<ConfigDBSchema> | null = null;
  private eventListeners: Map<ConfigEventType, Set<(event: ConfigEvent) => void>> = new Map();
  
  constructor(db?: IDBPDatabase<ConfigDBSchema>) {
    if (db) {
      this.db = db;
    }
  }
  
  /**
   * Ensure database connection is available
   */
  private async ensureDB(): Promise<IDBPDatabase<ConfigDBSchema>> {
    if (!this.db) {
      this.db = await getDB();
    }
    return this.db;
  }
  
  /**
   * Emit configuration events
   */
  private emitEvent(event: ConfigEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }
  
  /**
   * Subscribe to configuration events
   */
  on(eventType: ConfigEventType, listener: (event: ConfigEvent) => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    
    this.eventListeners.get(eventType)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.eventListeners.get(eventType)?.delete(listener);
    };
  }
  
  /**
   * Unsubscribe from configuration events
   */
  off(eventType: ConfigEventType, listener: (event: ConfigEvent) => void): void {
    this.eventListeners.get(eventType)?.delete(listener);
  }
  
  /**
   * Validate configuration object
   */
  private validateConfig(config: Partial<Config>): ConfigValidationResult {
    const errors: string[] = [];
    
    if (!config.configId) errors.push('configId is required');
    if (!config.appId) errors.push('appId is required');
    if (!config.userId) errors.push('userId is required');
    if (!config.componentType) errors.push('componentType is required');
    if (!config.name) errors.push('name is required');
    if (!config.createdBy) errors.push('createdBy is required');
    if (typeof config.creationTime !== 'number') errors.push('creationTime must be a number');
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  /**
   * Save a configuration
   */
  async save(config: Config): Promise<void> {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors?.join(', ')}`);
    }
    
    const db = await this.ensureDB();
    
    // Add timestamp
    config.lastUpdated = Date.now();
    
    // Save to database
    await db.put(STORE_NAME, config);
    
    // Emit event
    this.emitEvent({
      type: 'config:created',
      config,
      configId: config.configId,
      timestamp: Date.now()
    });
  }
  
  /**
   * Get a configuration by ID
   */
  async get(id: string): Promise<Config | null> {
    const db = await this.ensureDB();
    const config = await db.get(STORE_NAME, id);
    return config || null;
  }
  
  /**
   * Update a configuration
   */
  async update(id: string, updates: Partial<Config>): Promise<void> {
    const db = await this.ensureDB();
    
    // Get existing config
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Configuration not found: ${id}`);
    }
    
    // Merge updates
    const updated: Config = {
      ...existing,
      ...updates,
      configId: existing.configId, // Prevent ID change
      createdBy: existing.createdBy, // Preserve original creator
      creationTime: existing.creationTime, // Preserve creation time
      lastUpdated: Date.now(),
      updatedBy: updates.updatedBy || existing.updatedBy
    };
    
    // Validate merged config
    const validation = this.validateConfig(updated);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors?.join(', ')}`);
    }
    
    // Save to database
    await db.put(STORE_NAME, updated);
    
    // Emit event
    this.emitEvent({
      type: 'config:updated',
      config: updated,
      configId: id,
      timestamp: Date.now()
    });
  }
  
  /**
   * Delete a configuration
   */
  async delete(id: string): Promise<void> {
    const db = await this.ensureDB();
    
    // Check if exists
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Configuration not found: ${id}`);
    }
    
    // Delete from database
    await db.delete(STORE_NAME, id);
    
    // Emit event
    this.emitEvent({
      type: 'config:deleted',
      configId: id,
      timestamp: Date.now()
    });
  }
  
  /**
   * List configurations with optional filtering
   */
  async list(filter?: ConfigFilter): Promise<Config[]> {
    const db = await this.ensureDB();
    let configs: Config[] = [];
    
    // If we have specific filters that match indexes, use them
    if (filter?.userId && filter?.componentType && !Array.isArray(filter.componentType)) {
      // Use compound index
      const tx = db.transaction(STORE_NAME, 'readonly');
      const index = tx.store.index('by-user-type');
      configs = await index.getAll([filter.userId, filter.componentType]);
    } else if (filter?.userId) {
      // Use user index
      const tx = db.transaction(STORE_NAME, 'readonly');
      const index = tx.store.index('by-user');
      configs = await index.getAll(filter.userId);
    } else if (filter?.componentType && !Array.isArray(filter.componentType)) {
      // Use type index
      const tx = db.transaction(STORE_NAME, 'readonly');
      const index = tx.store.index('by-type');
      configs = await index.getAll(filter.componentType);
    } else {
      // Get all and filter in memory
      configs = await db.getAll(STORE_NAME);
    }
    
    // Apply additional filters in memory
    if (filter) {
      configs = configs.filter(config => {
        // User filter
        if (filter.userId && config.userId !== filter.userId) return false;
        
        // Component type filter (supports array)
        if (filter.componentType) {
          if (Array.isArray(filter.componentType)) {
            if (!filter.componentType.includes(config.componentType)) return false;
          } else {
            if (config.componentType !== filter.componentType) return false;
          }
        }
        
        // Other filters
        if (filter.subComponentType && config.subComponentType !== filter.subComponentType) return false;
        if (filter.parentId && config.parentId !== filter.parentId) return false;
        if (filter.ownerId && config.ownerId !== filter.ownerId) return false;
        if (filter.isPublic !== undefined && config.isPublic !== filter.isPublic) return false;
        if (filter.isTemplate !== undefined && config.isTemplate !== filter.isTemplate) return false;
        
        // Tag filter
        if (filter.tags && filter.tags.length > 0) {
          if (!config.tags || !filter.tags.some(tag => config.tags!.includes(tag))) {
            return false;
          }
        }
        
        // Date filters
        if (filter.createdAfter && config.creationTime < filter.createdAfter) return false;
        if (filter.createdBefore && config.creationTime > filter.createdBefore) return false;
        if (filter.updatedAfter && config.lastUpdated && config.lastUpdated < filter.updatedAfter) return false;
        if (filter.updatedBefore && config.lastUpdated && config.lastUpdated > filter.updatedBefore) return false;
        
        return true;
      });
    }
    
    // Sort by last updated or creation time (newest first)
    configs.sort((a, b) => {
      const aTime = a.lastUpdated || a.creationTime;
      const bTime = b.lastUpdated || b.creationTime;
      return bTime - aTime;
    });
    
    return configs;
  }
  
  /**
   * Count configurations matching filter
   */
  async count(filter?: ConfigFilter): Promise<number> {
    if (!filter) {
      const db = await this.ensureDB();
      return db.count(STORE_NAME);
    }
    
    // For filtered counts, we need to list and count
    const configs = await this.list(filter);
    return configs.length;
  }
  
  /**
   * Check if a configuration exists
   */
  async exists(id: string): Promise<boolean> {
    const config = await this.get(id);
    return config !== null;
  }
  
  /**
   * Save multiple configurations
   */
  async saveMany(configs: Config[]): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    
    // Validate all configs
    for (const config of configs) {
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration ${config.configId}: ${validation.errors?.join(', ')}`);
      }
      
      // Add timestamp
      config.lastUpdated = Date.now();
      
      // Add to transaction
      await tx.store.put(config);
    }
    
    // Wait for transaction to complete
    await tx.done;
    
    // Emit event
    this.emitEvent({
      type: 'config:bulk-created',
      configs,
      configIds: configs.map(c => c.configId),
      timestamp: Date.now()
    });
  }
  
  /**
   * Delete multiple configurations
   */
  async deleteMany(ids: string[]): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    
    // Delete all
    for (const id of ids) {
      await tx.store.delete(id);
    }
    
    // Wait for transaction to complete
    await tx.done;
    
    // Emit event
    this.emitEvent({
      type: 'config:bulk-deleted',
      configIds: ids,
      timestamp: Date.now()
    });
  }
  
  /**
   * Get all child configurations
   */
  async getChildren(parentId: string): Promise<Config[]> {
    const db = await this.ensureDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.store.index('by-parent');
    const configs = await index.getAll(parentId);
    
    // Sort by name
    configs.sort((a, b) => a.name.localeCompare(b.name));
    
    return configs;
  }
  
  /**
   * Get all profiles for a component
   */
  async getProfiles(ownerId: string): Promise<Config[]> {
    const db = await this.ensureDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.store.index('by-owner');
    const configs = await index.getAll(ownerId);
    
    // Sort by last updated
    configs.sort((a, b) => {
      const aTime = a.lastUpdated || a.creationTime;
      const bTime = b.lastUpdated || b.creationTime;
      return bTime - aTime;
    });
    
    return configs;
  }
  
  /**
   * Get all templates for a component type
   */
  async getTemplates(componentType: string): Promise<Config[]> {
    // Get all configs of the specified type and filter for templates
    const configs = await this.list({ 
      componentType,
      isTemplate: true 
    });
    
    // Sort by name
    configs.sort((a, b) => a.name.localeCompare(b.name));
    
    return configs;
  }
  
  /**
   * Create a new configuration from a template
   */
  async createFromTemplate(templateId: string, overrides: Partial<Config>): Promise<Config> {
    // Get template
    const template = await this.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    if (!template.isTemplate) {
      throw new Error(`Configuration is not a template: ${templateId}`);
    }
    
    // Create new config from template
    const newConfig: Config = {
      ...template,
      ...overrides,
      configId: overrides.configId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isTemplate: false, // New config is not a template
      createdBy: overrides.createdBy || template.createdBy,
      creationTime: Date.now(),
      lastUpdated: Date.now()
    };
    
    // Remove template-specific fields
    delete newConfig.sharedWith;
    delete newConfig.permissions;
    
    // Save new config
    await this.save(newConfig);
    
    return newConfig;
  }
}

/**
 * Create a new config service instance
 */
export async function createConfigService(): Promise<ConfigServiceWithEvents> {
  const db = await getDB();
  return new ConfigServiceImpl(db);
}