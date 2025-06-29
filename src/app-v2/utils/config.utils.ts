/**
 * Configuration Utilities
 * 
 * Helper functions for working with configurations.
 */

import { Config, ComponentType, ProfileType, PROFILE_SUFFIX } from '../services/config/config.types';

/**
 * Generate a unique configuration ID
 */
export function generateConfigId(prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

/**
 * Generate a unique ID with a more readable format
 */
export function generateReadableId(type: string): string {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${type}-${timestamp}-${random}`;
}

/**
 * Create a default configuration object
 */
export function createDefaultConfig(
  type: string,
  userId: string,
  appId: string,
  name: string
): Config {
  return {
    configId: generateConfigId(type.toLowerCase()),
    appId,
    userId,
    componentType: type,
    name,
    settings: {},
    createdBy: userId,
    creationTime: Date.now()
  };
}

/**
 * Create a profile configuration from a base component
 */
export function createProfileConfig(
  baseConfig: Config,
  profileName: string,
  settings: any
): Config {
  const profileType = `${baseConfig.componentType}${PROFILE_SUFFIX}` as ProfileType<string>;
  
  return {
    configId: generateConfigId('prof'),
    appId: baseConfig.appId,
    userId: baseConfig.userId,
    componentType: profileType,
    ownerId: baseConfig.configId,
    name: profileName,
    settings,
    createdBy: baseConfig.userId,
    creationTime: Date.now()
  };
}

/**
 * Clone a configuration with a new ID
 */
export function cloneConfig(
  config: Config,
  overrides?: Partial<Config>
): Config {
  const clone: Config = {
    ...config,
    ...overrides,
    configId: generateConfigId(config.componentType.toLowerCase()),
    creationTime: Date.now(),
    lastUpdated: Date.now()
  };
  
  // Remove fields that shouldn't be cloned
  delete clone.activeSettingsId;
  delete clone.sharedWith;
  delete clone.permissions;
  
  return clone;
}

/**
 * Get default settings for a component type
 */
export function getDefaultSettings(componentType: string): any {
  switch (componentType) {
    case ComponentType.Workspace:
      return {
        layout: null,
        theme: 'light',
        autoSave: true,
        refreshInterval: 30000
      };
      
    case ComponentType.DataTable:
      return {
        pageSize: 100,
        enableSorting: true,
        enableFiltering: true,
        enableColumnResize: true,
        enableColumnReorder: true
      };
      
    case ComponentType.Chart:
      return {
        type: 'line',
        showLegend: true,
        showGrid: true,
        animated: true
      };
      
    case ComponentType.Filter:
      return {
        layout: 'horizontal',
        submitOnChange: true,
        resetButton: true
      };
      
    default:
      return {};
  }
}

/**
 * Validate configuration name
 */
export function validateConfigName(name: string): { valid: boolean; error?: string } {
  if (!name || !name.trim()) {
    return { valid: false, error: 'Name is required' };
  }
  
  if (name.length < 3) {
    return { valid: false, error: 'Name must be at least 3 characters' };
  }
  
  if (name.length > 100) {
    return { valid: false, error: 'Name must be less than 100 characters' };
  }
  
  // Check for invalid characters
  const invalidChars = /[<>:"\/\\|?*]/;
  if (invalidChars.test(name)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }
  
  return { valid: true };
}

/**
 * Sort configurations by various criteria
 */
export function sortConfigs(
  configs: Config[],
  sortBy: 'name' | 'created' | 'updated' | 'type' = 'updated',
  order: 'asc' | 'desc' = 'desc'
): Config[] {
  const sorted = [...configs];
  
  sorted.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
        
      case 'created':
        comparison = a.creationTime - b.creationTime;
        break;
        
      case 'updated':
        const aTime = a.lastUpdated || a.creationTime;
        const bTime = b.lastUpdated || b.creationTime;
        comparison = aTime - bTime;
        break;
        
      case 'type':
        comparison = a.componentType.localeCompare(b.componentType);
        if (comparison === 0) {
          comparison = a.name.localeCompare(b.name);
        }
        break;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
}

/**
 * Group configurations by a property
 */
export function groupConfigs<K extends keyof Config>(
  configs: Config[],
  groupBy: K
): Map<Config[K], Config[]> {
  const groups = new Map<Config[K], Config[]>();
  
  configs.forEach(config => {
    const key = config[groupBy];
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(config);
  });
  
  return groups;
}

/**
 * Filter configurations by search term
 */
export function searchConfigs(
  configs: Config[],
  searchTerm: string,
  searchFields: (keyof Config)[] = ['name', 'description', 'tags']
): Config[] {
  if (!searchTerm || !searchTerm.trim()) {
    return configs;
  }
  
  const term = searchTerm.toLowerCase().trim();
  
  return configs.filter(config => {
    return searchFields.some(field => {
      const value = config[field];
      
      if (typeof value === 'string') {
        return value.toLowerCase().includes(term);
      }
      
      if (Array.isArray(value)) {
        return value.some(item => 
          typeof item === 'string' && item.toLowerCase().includes(term)
        );
      }
      
      return false;
    });
  });
}

/**
 * Export configuration to JSON
 */
export function exportConfig(config: Config, pretty = true): string {
  const exportData = {
    ...config,
    exportedAt: new Date().toISOString(),
    version: '1.0.0'
  };
  
  return JSON.stringify(exportData, null, pretty ? 2 : 0);
}

/**
 * Import configuration from JSON
 */
export function importConfig(
  json: string,
  overrides?: Partial<Config>
): Config {
  try {
    const data = JSON.parse(json);
    
    // Remove export metadata
    delete data.exportedAt;
    delete data.version;
    
    // Apply overrides and generate new ID
    const imported: Config = {
      ...data,
      ...overrides,
      configId: generateConfigId('import'),
      creationTime: Date.now(),
      lastUpdated: Date.now()
    };
    
    return imported;
  } catch (error) {
    throw new Error('Invalid configuration JSON');
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Calculate configuration size in bytes
 */
export function getConfigSize(config: Config): number {
  return new Blob([JSON.stringify(config)]).size;
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}