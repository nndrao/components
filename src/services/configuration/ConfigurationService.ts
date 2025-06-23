/**
 * Configuration Service
 * 
 * Manages component configurations including saving, loading,
 * versioning, sharing, and bulk operations. Works with the
 * storage adapter to persist configurations.
 */

import {
  IConfigurationService,
  IStorageAdapter,
  IConfigurableComponent,
  ComponentConfig,
  Version,
  SearchCriteria,
  SharedUser,
  User
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration event types
 */
export type ConfigEventType = 
  | 'config-saved'
  | 'config-loaded'
  | 'config-updated'
  | 'config-deleted'
  | 'version-created'
  | 'version-restored'
  | 'config-shared'
  | 'config-unshared';

/**
 * Configuration event
 */
export interface ConfigEvent {
  type: ConfigEventType;
  componentId: string;
  data?: any;
}

/**
 * Configuration event listener
 */
export type ConfigEventListener = (event: ConfigEvent) => void;

/**
 * Configuration service implementation
 */
export class ConfigurationService implements IConfigurationService {
  private storage: IStorageAdapter;
  private userId: string = '';
  private appId: string = '';
  private eventListeners: ConfigEventListener[] = [];
  private configCache: Map<string, ComponentConfig> = new Map();

  constructor(storage: IStorageAdapter) {
    this.storage = storage;
  }

  /**
   * Initialize the configuration service
   */
  async initialize(storageAdapter: IStorageAdapter): Promise<void> {
    this.storage = storageAdapter;
    
    // Subscribe to storage events only if addEventListener exists
    if (this.storage && typeof this.storage.addEventListener === 'function') {
      this.storage.addEventListener((event) => {
        // Clear cache on updates
        if (event.type === 'config-updated' || event.type === 'config-deleted') {
          const instanceId = event.data?.instanceId;
          if (instanceId) {
            this.configCache.delete(instanceId);
          }
        }
      });
    }
  }

  /**
   * Set user context
   */
  setUserContext(userId: string, appId: string): void {
    this.userId = userId;
    this.appId = appId;
    this.configCache.clear(); // Clear cache when user changes
  }

  /**
   * Save a component configuration
   */
  async saveConfiguration(componentId: string, config: any): Promise<void> {
    // Get existing config or create new
    let componentConfig = await this.storage.getComponentConfig(componentId);
    
    if (!componentConfig) {
      // Create new configuration
      componentConfig = {
        instanceId: componentId,
        componentType: config.componentType || 'custom',
        displayName: config.displayName,
        appId: this.appId,
        userId: this.userId,
        ownerId: this.userId,
        permissions: {
          isPublic: false,
          canEdit: [this.userId],
          canView: [this.userId],
          allowSharing: true,
          editableByOthers: false
        },
        settings: {
          activeVersionId: uuidv4(),
          versions: {}
        },
        metadata: {
          tags: [],
          category: 'custom',
          lastAccessed: new Date().toISOString(),
          accessCount: 0,
          favorited: false,
          notes: ''
        },
        sharing: {
          isShared: false,
          sharedWith: [],
          publicAccess: {
            enabled: false,
            accessLevel: 'view',
            requiresAuth: true
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    
    // Create new version
    const versionId = uuidv4();
    const version: Version = {
      id: versionId,
      name: `Version ${Object.keys(componentConfig.settings.versions).length + 1}`,
      description: 'Auto-saved version',
      configuration: config,
      createdAt: new Date().toISOString(),
      createdBy: this.userId
    };
    
    // Add version and update active
    componentConfig.settings.versions[versionId] = version;
    componentConfig.settings.activeVersionId = versionId;
    componentConfig.updatedAt = new Date().toISOString();
    
    // Save to storage
    await this.storage.saveComponentConfig(componentConfig);
    
    // Update cache
    this.configCache.set(componentId, componentConfig);
    
    // Emit event
    this.emitEvent({
      type: 'config-saved',
      componentId,
      data: { versionId }
    });
  }

  /**
   * Load a component configuration
   */
  async loadConfiguration(componentId: string): Promise<any> {
    // Check cache first
    let componentConfig = this.configCache.get(componentId);
    
    if (!componentConfig) {
      const config = await this.storage.getComponentConfig(componentId);
      
      if (config) {
        componentConfig = config;
        this.configCache.set(componentId, config);
      }
    }
    
    if (!componentConfig) {
      return null;
    }
    
    // Get active version
    const activeVersion = componentConfig.settings.versions[componentConfig.settings.activeVersionId];
    
    if (!activeVersion) {
      return null;
    }
    
    // Emit event
    this.emitEvent({
      type: 'config-loaded',
      componentId
    });
    
    return activeVersion.configuration;
  }

  /**
   * Delete a component configuration
   */
  async deleteConfiguration(componentId: string): Promise<void> {
    await this.storage.deleteComponentConfig(componentId);
    
    // Remove from cache
    this.configCache.delete(componentId);
    
    // Emit event
    this.emitEvent({
      type: 'config-deleted',
      componentId
    });
  }

  /**
   * Get all configurations
   */
  async getAllConfigurations(): Promise<ComponentConfig[]> {
    return this.storage.getUserComponentConfigs(this.userId, this.appId);
  }

  /**
   * Create a new version
   */
  async createVersion(
    componentId: string, 
    versionName: string, 
    description?: string
  ): Promise<Version> {
    const componentConfig = await this.storage.getComponentConfig(componentId);
    
    if (!componentConfig) {
      throw new Error(`Component configuration ${componentId} not found`);
    }
    
    // Get current configuration
    const activeVersion = componentConfig.settings.versions[componentConfig.settings.activeVersionId];
    
    if (!activeVersion) {
      throw new Error('No active version found');
    }
    
    // Create new version
    const version: Version = {
      id: uuidv4(),
      name: versionName,
      description,
      configuration: activeVersion.configuration,
      createdAt: new Date().toISOString(),
      createdBy: this.userId
    };
    
    // Save version
    await this.storage.createVersion(componentId, version);
    
    // Clear cache
    this.configCache.delete(componentId);
    
    // Emit event
    this.emitEvent({
      type: 'version-created',
      componentId,
      data: { versionId: version.id, versionName }
    });
    
    return version;
  }

  /**
   * Get all versions for a component
   */
  async getVersions(componentId: string): Promise<Version[]> {
    return this.storage.getVersions(componentId);
  }

  /**
   * Restore a version
   */
  async restoreVersion(componentId: string, versionId: string): Promise<void> {
    await this.storage.restoreVersion(componentId, versionId);
    
    // Clear cache
    this.configCache.delete(componentId);
    
    // Emit event
    this.emitEvent({
      type: 'version-restored',
      componentId,
      data: { versionId }
    });
  }

  /**
   * Delete a version
   */
  async deleteVersion(componentId: string, versionId: string): Promise<void> {
    const componentConfig = await this.storage.getComponentConfig(componentId);
    
    if (!componentConfig) {
      throw new Error(`Component configuration ${componentId} not found`);
    }
    
    // Can't delete active version
    if (componentConfig.settings.activeVersionId === versionId) {
      throw new Error('Cannot delete active version');
    }
    
    // Can't delete if it's the only version
    if (Object.keys(componentConfig.settings.versions).length <= 1) {
      throw new Error('Cannot delete the only version');
    }
    
    // Delete version
    delete componentConfig.settings.versions[versionId];
    
    // Update configuration
    await this.storage.updateComponentConfig(componentId, {
      settings: componentConfig.settings,
      updatedAt: new Date().toISOString()
    });
    
    // Clear cache
    this.configCache.delete(componentId);
  }

  /**
   * Share a configuration with users
   */
  async shareConfiguration(componentId: string, users: SharedUser[]): Promise<void> {
    const componentConfig = await this.storage.getComponentConfig(componentId);
    
    if (!componentConfig) {
      throw new Error(`Component configuration ${componentId} not found`);
    }
    
    // Check permissions
    if (!componentConfig.permissions.allowSharing) {
      throw new Error('Configuration sharing is not allowed');
    }
    
    // Update sharing info
    componentConfig.sharing.isShared = true;
    componentConfig.sharing.sharedWith = [
      ...componentConfig.sharing.sharedWith,
      ...users
    ];
    
    // Update permissions
    for (const user of users) {
      if (user.permissions === 'edit') {
        componentConfig.permissions.canEdit.push(user.userId);
      }
      componentConfig.permissions.canView.push(user.userId);
    }
    
    // Save updates
    await this.storage.updateComponentConfig(componentId, {
      sharing: componentConfig.sharing,
      permissions: componentConfig.permissions,
      updatedAt: new Date().toISOString()
    });
    
    // Clear cache
    this.configCache.delete(componentId);
    
    // Emit event
    this.emitEvent({
      type: 'config-shared',
      componentId,
      data: { users }
    });
  }

  /**
   * Revoke sharing for a user
   */
  async revokeSharing(componentId: string, userId: string): Promise<void> {
    const componentConfig = await this.storage.getComponentConfig(componentId);
    
    if (!componentConfig) {
      throw new Error(`Component configuration ${componentId} not found`);
    }
    
    // Remove from shared users
    componentConfig.sharing.sharedWith = componentConfig.sharing.sharedWith.filter(
      share => share.userId !== userId
    );
    
    // Update sharing status
    if (componentConfig.sharing.sharedWith.length === 0) {
      componentConfig.sharing.isShared = false;
    }
    
    // Remove permissions
    componentConfig.permissions.canEdit = componentConfig.permissions.canEdit.filter(
      id => id !== userId
    );
    componentConfig.permissions.canView = componentConfig.permissions.canView.filter(
      id => id !== userId
    );
    
    // Save updates
    await this.storage.updateComponentConfig(componentId, {
      sharing: componentConfig.sharing,
      permissions: componentConfig.permissions,
      updatedAt: new Date().toISOString()
    });
    
    // Clear cache
    this.configCache.delete(componentId);
    
    // Emit event
    this.emitEvent({
      type: 'config-unshared',
      componentId,
      data: { userId }
    });
  }

  /**
   * Make a configuration public
   */
  async makePublic(
    componentId: string, 
    accessLevel: 'view' | 'interact' | 'full'
  ): Promise<void> {
    const componentConfig = await this.storage.getComponentConfig(componentId);
    
    if (!componentConfig) {
      throw new Error(`Component configuration ${componentId} not found`);
    }
    
    // Update public access
    componentConfig.permissions.isPublic = true;
    componentConfig.sharing.publicAccess = {
      enabled: true,
      accessLevel,
      requiresAuth: true,
      accessKey: uuidv4() // Generate access key for security
    };
    
    // Save updates
    await this.storage.updateComponentConfig(componentId, {
      permissions: componentConfig.permissions,
      sharing: componentConfig.sharing,
      updatedAt: new Date().toISOString()
    });
    
    // Clear cache
    this.configCache.delete(componentId);
  }

  /**
   * Make a configuration private
   */
  async makePrivate(componentId: string): Promise<void> {
    const componentConfig = await this.storage.getComponentConfig(componentId);
    
    if (!componentConfig) {
      throw new Error(`Component configuration ${componentId} not found`);
    }
    
    // Update public access
    componentConfig.permissions.isPublic = false;
    componentConfig.sharing.publicAccess.enabled = false;
    
    // Save updates
    await this.storage.updateComponentConfig(componentId, {
      permissions: componentConfig.permissions,
      sharing: componentConfig.sharing,
      updatedAt: new Date().toISOString()
    });
    
    // Clear cache
    this.configCache.delete(componentId);
  }

  /**
   * Search configurations
   */
  async searchConfigurations(criteria: SearchCriteria): Promise<ComponentConfig[]> {
    return this.storage.searchConfigs(criteria);
  }

  /**
   * Get shared configurations
   */
  async getSharedConfigurations(): Promise<ComponentConfig[]> {
    return this.storage.getSharedConfigs(this.userId);
  }

  /**
   * Get public configurations
   */
  async getPublicConfigurations(): Promise<ComponentConfig[]> {
    return this.storage.getPublicConfigs();
  }

  /**
   * Save all component configurations
   */
  async saveAllConfigurations(
    componentRefs: React.RefObject<IConfigurableComponent>[]
  ): Promise<void> {
    const savePromises = componentRefs.map(async (ref) => {
      if (ref.current) {
        const component = ref.current;
        const config = component.getConfiguration();
        await this.saveConfiguration(component.componentId, config);
      }
    });
    
    await Promise.all(savePromises);
  }

  /**
   * Load configurations for multiple components
   */
  async loadConfigurations(componentIds: string[]): Promise<Record<string, any>> {
    const configs: Record<string, any> = {};
    
    const loadPromises = componentIds.map(async (id) => {
      const config = await this.loadConfiguration(id);
      if (config) {
        configs[id] = config;
      }
    });
    
    await Promise.all(loadPromises);
    
    return configs;
  }

  /**
   * Export configurations
   */
  async exportConfigurations(componentIds: string[]): Promise<string> {
    const configs: ComponentConfig[] = [];
    
    for (const id of componentIds) {
      const config = await this.storage.getComponentConfig(id);
      if (config) {
        // Remove sensitive data
        const { userId, ownerId, ...configWithoutSensitive } = config;
        const exportConfig: ComponentConfig = {
          ...configWithoutSensitive,
          userId: '', // Empty string instead of undefined
          ownerId: '', // Empty string instead of undefined
          permissions: {
            ...config.permissions,
            canEdit: [],
            canView: []
          }
        };
        configs.push(exportConfig);
      }
    }
    
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      configurations: configs
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import configurations
   */
  async importConfigurations(data: string): Promise<ComponentConfig[]> {
    let importData;
    
    try {
      importData = JSON.parse(data);
    } catch (error) {
      throw new Error('Invalid configuration data format');
    }
    
    if (!importData.configurations || !Array.isArray(importData.configurations)) {
      throw new Error('Invalid configuration export format');
    }
    
    const imported: ComponentConfig[] = [];
    
    for (const config of importData.configurations) {
      // Create new configuration with current user as owner
      const newConfig: ComponentConfig = {
        ...config,
        instanceId: uuidv4(), // Generate new ID
        userId: this.userId,
        ownerId: this.userId,
        appId: this.appId,
        permissions: {
          ...config.permissions,
          canEdit: [this.userId],
          canView: [this.userId]
        },
        metadata: {
          ...config.metadata,
          tags: [...(config.metadata?.tags || []), 'imported']
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await this.storage.saveComponentConfig(newConfig);
      imported.push(newConfig);
    }
    
    return imported;
  }

  /**
   * List all configurations
   */
  async listConfigurations(): Promise<ComponentConfig[]> {
    return this.getAllConfigurations();
  }

  /**
   * Get configuration statistics
   */
  async getConfigurationStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    shared: number;
    public: number;
    favorited: number;
  }> {
    const configs = await this.getAllConfigurations();
    
    const stats = {
      total: configs.length,
      byType: {} as Record<string, number>,
      shared: 0,
      public: 0,
      favorited: 0
    };
    
    for (const config of configs) {
      // Count by type
      stats.byType[config.componentType] = (stats.byType[config.componentType] || 0) + 1;
      
      // Count shared
      if (config.sharing.isShared) {
        stats.shared++;
      }
      
      // Count public
      if (config.permissions.isPublic) {
        stats.public++;
      }
      
      // Count favorited
      if (config.metadata.favorited) {
        stats.favorited++;
      }
    }
    
    return stats;
  }

  /**
   * Emit configuration event
   */
  private emitEvent(event: ConfigEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in configuration event listener:', error);
      }
    });
  }

  /**
   * Add event listener
   */
  addEventListener(listener: ConfigEventListener): () => void {
    this.eventListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }
}