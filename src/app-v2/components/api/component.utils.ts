/**
 * Component API Utilities
 * 
 * Utility functions for working with component settings and configurations.
 */

import { get, set, cloneDeep, merge, isEqual } from 'lodash-es';
import { Config } from '../../services/config';
import { ComponentMetadata, SettingsSchema, SchemaProperty } from './component.types';

/**
 * Merge settings with defaults
 */
export function mergeSettings<T = any>(
  settings: Partial<T>,
  defaults: T,
  deep = true
): T {
  if (deep) {
    return merge(cloneDeep(defaults), settings);
  }
  return { ...defaults, ...settings };
}

/**
 * Extract changed settings
 */
export function getChangedSettings<T = any>(
  current: T,
  previous: T
): Partial<T> {
  const changes: Partial<T> = {};

  for (const key in current) {
    if (!isEqual(current[key], previous[key])) {
      changes[key] = current[key];
    }
  }

  return changes;
}

/**
 * Apply setting overrides
 */
export function applySettingOverrides<T extends object = any>(
  settings: T,
  overrides: Record<string, any>
): T {
  const result = cloneDeep(settings);

  for (const [path, value] of Object.entries(overrides)) {
    set(result as any, path, value);
  }

  return result;
}

/**
 * Extract setting paths from schema
 */
export function getSettingPaths(
  schema: SettingsSchema,
  prefix = ''
): string[] {
  const paths: string[] = [];

  for (const [key, prop] of Object.entries(schema.properties)) {
    const path = prefix ? `${prefix}.${key}` : key;
    paths.push(path);

    // Recurse into nested objects
    if (prop.type === 'object' && prop.properties) {
      paths.push(...getSettingPaths({ type: 'object', properties: prop.properties }, path));
    }
  }

  return paths;
}

/**
 * Get default values from schema
 */
export function getDefaultsFromSchema(schema: SettingsSchema): any {
  const defaults: any = {};

  for (const [key, prop] of Object.entries(schema.properties)) {
    if (prop.default !== undefined) {
      defaults[key] = prop.default;
    } else if (prop.type === 'object' && prop.properties) {
      defaults[key] = getDefaultsFromSchema({ type: 'object', properties: prop.properties });
    } else if (prop.type === 'array') {
      defaults[key] = [];
    }
  }

  return defaults;
}

/**
 * Create component metadata
 */
export function createComponentMetadata(options: {
  description?: string;
  category?: string;
  tags?: string[];
  icon?: string;
  author?: string;
  documentationUrl?: string;
  supportsProfiles?: boolean;
  supportsTemplates?: boolean;
  capabilities?: ComponentMetadata['capabilities'];
}): ComponentMetadata {
  return {
    description: options.description,
    category: options.category,
    tags: options.tags,
    icon: options.icon,
    author: options.author,
    documentationUrl: options.documentationUrl,
    supportsProfiles: options.supportsProfiles ?? true,
    supportsTemplates: options.supportsTemplates ?? true,
    capabilities: {
      canExport: true,
      canImport: true,
      canShare: true,
      ...options.capabilities,
    },
  };
}

/**
 * Export settings to JSON
 */
export function exportSettings<T = any>(
  settings: T,
  metadata?: {
    name?: string;
    description?: string;
    version?: string;
    timestamp?: number;
  }
): string {
  const exportData = {
    version: '1.0',
    timestamp: metadata?.timestamp || Date.now(),
    name: metadata?.name,
    description: metadata?.description,
    componentVersion: metadata?.version,
    settings,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import settings from JSON
 */
export function importSettings<T = any>(
  json: string,
  validate?: (settings: any) => boolean
): T {
  try {
    const data = JSON.parse(json);
    
    if (!data.settings) {
      throw new Error('Invalid import data: missing settings');
    }

    if (validate && !validate(data.settings)) {
      throw new Error('Invalid import data: validation failed');
    }

    return data.settings;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw error;
  }
}

/**
 * Create setting getter with type safety
 */
export function createSettingGetter<T = any>(settings: T) {
  return function getSetting<V = any>(path: string, defaultValue?: V): V {
    return get(settings, path, defaultValue) as V;
  };
}

/**
 * Create setting setter with validation
 */
export function createSettingSetter<T extends object = any>(
  settings: T,
  onChange: (newSettings: T) => void,
  validate?: (path: string, value: any) => boolean
) {
  return function setSetting(path: string, value: any): void {
    if (validate && !validate(path, value)) {
      throw new Error(`Invalid value for setting "${path}"`);
    }

    const newSettings = cloneDeep(settings);
    set(newSettings as any, path, value);
    onChange(newSettings);
  };
}

/**
 * Flatten nested settings to dot notation
 */
export function flattenSettings(
  settings: any,
  prefix = ''
): Record<string, any> {
  const flattened: Record<string, any> = {};

  for (const [key, value] of Object.entries(settings)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenSettings(value, path));
    } else {
      flattened[path] = value;
    }
  }

  return flattened;
}

/**
 * Unflatten dot notation to nested object
 */
export function unflattenSettings(
  flattened: Record<string, any>
): any {
  const result: any = {};

  for (const [path, value] of Object.entries(flattened)) {
    set(result, path, value);
  }

  return result;
}

/**
 * Compare two settings objects and get differences
 */
export function diffSettings<T = any>(
  current: T,
  previous: T
): Array<{
  path: string;
  oldValue: any;
  newValue: any;
}> {
  const differences: Array<{
    path: string;
    oldValue: any;
    newValue: any;
  }> = [];

  const currentFlat = flattenSettings(current);
  const previousFlat = flattenSettings(previous);

  // Check for changes and additions
  for (const [path, value] of Object.entries(currentFlat)) {
    if (!isEqual(value, previousFlat[path])) {
      differences.push({
        path,
        oldValue: previousFlat[path],
        newValue: value,
      });
    }
  }

  // Check for deletions
  for (const [path, value] of Object.entries(previousFlat)) {
    if (!(path in currentFlat)) {
      differences.push({
        path,
        oldValue: value,
        newValue: undefined,
      });
    }
  }

  return differences;
}

/**
 * Create a profile from current settings
 */
export function createProfileFromSettings<T = any>(
  componentType: string,
  settings: T,
  metadata: {
    name: string;
    description?: string;
    tags?: string[];
    isTemplate?: boolean;
    isGlobal?: boolean;
  }
): Omit<Config, 'configId' | 'createdBy' | 'creationTime'> {
  return {
    appId: 'app',
    userId: 'current-user',
    componentType: `${componentType}.Profile`,
    name: metadata.name,
    description: metadata.description,
    tags: metadata.tags,
    settings,
    isTemplate: metadata.isTemplate,
    isGlobal: metadata.isGlobal,
  };
}