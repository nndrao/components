/**
 * Configuration Management Types
 * 
 * This file defines all types and interfaces for the configuration management system.
 * All configuration objects (app, workspace, component, profile) share the same Config structure.
 */

/**
 * Main configuration object interface
 * Used for all configuration types (workspace, component, profile, etc.)
 */
export interface Config {
  // Identity
  configId: string;          // Unique identifier
  appId: string;             // Application instance
  userId: string;            // Owner of this config
  
  // Type Information
  componentType: string;     // 'App' | 'Workspace' | 'DataTable' | 'DataTable.Profile' etc.
  subComponentType?: string; // Optional sub-classification
  
  // Relationships
  parentId?: string;         // Parent config ID (for hierarchical relationships)
  ownerId?: string;          // Component that owns this config (for profiles)
  
  // User-Facing Information
  name: string;              // Human-readable name (required)
  description?: string;      // Optional description
  tags?: string[];           // For categorization
  icon?: string;             // Optional icon identifier
  color?: string;            // Optional color for UI
  
  // Configuration Data
  settings: any;             // Actual configuration (structure depends on componentType)
  
  // For components with multiple profiles
  activeSettingsId?: string; // Currently active profile/settings
  
  // Sharing
  isPublic?: boolean;        // Available to all users
  isGlobal?: boolean;        // Available to all users globally (alias for isPublic)
  isTemplate?: boolean;      // Can be used as template
  sharedWith?: string[];     // Specific users who can access
  permissions?: 'read' | 'write' | 'admin';
  
  // Audit Fields
  createdBy: string;         // User who created
  updatedBy?: string;        // Last user to update
  creationTime: number;      // Unix timestamp
  lastUpdated?: number;      // Unix timestamp
}

/**
 * Filter options for querying configurations
 */
export interface ConfigFilter {
  userId?: string;
  componentType?: string | string[];
  subComponentType?: string;
  parentId?: string;
  ownerId?: string;
  tags?: string[];
  isPublic?: boolean;
  isTemplate?: boolean;
  // Date range filters
  createdAfter?: number;
  createdBefore?: number;
  updatedAfter?: number;
  updatedBefore?: number;
}

/**
 * Configuration service interface
 * Defines all operations available for configuration management
 */
export interface ConfigService {
  // Basic CRUD operations
  save: (config: Config) => Promise<void>;
  get: (id: string) => Promise<Config | null>;
  update: (id: string, updates: Partial<Config>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  
  // Query operations
  list: (filter?: ConfigFilter) => Promise<Config[]>;
  count: (filter?: ConfigFilter) => Promise<number>;
  exists: (id: string) => Promise<boolean>;
  
  // Bulk operations
  saveMany: (configs: Config[]) => Promise<void>;
  deleteMany: (ids: string[]) => Promise<void>;
  
  // Relationship operations
  getChildren: (parentId: string) => Promise<Config[]>;
  getProfiles: (ownerId: string) => Promise<Config[]>;
  
  // Template operations
  getTemplates: (componentType: string) => Promise<Config[]>;
  createFromTemplate: (templateId: string, overrides: Partial<Config>) => Promise<Config>;
}

/**
 * Common component types used in the system
 */
export enum ComponentType {
  App = 'App',
  Workspace = 'Workspace',
  DataTable = 'DataTable',
  Chart = 'Chart',
  Filter = 'Filter',
  Layout = 'Layout'
}

/**
 * Profile type suffix for component profiles
 */
export const PROFILE_SUFFIX = '.Profile';

/**
 * Helper type to create profile component types
 */
export type ProfileType<T extends string> = `${T}${typeof PROFILE_SUFFIX}`;

/**
 * Validation result for configuration objects
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Event types emitted by the config service
 */
export type ConfigEventType = 
  | 'config:created'
  | 'config:updated'
  | 'config:deleted'
  | 'config:bulk-created'
  | 'config:bulk-deleted';

/**
 * Event payload for config service events
 */
export interface ConfigEvent {
  type: ConfigEventType;
  configId?: string;
  configIds?: string[];
  config?: Config;
  configs?: Config[];
  timestamp: number;
}

/**
 * Options for config service initialization
 */
export interface ConfigServiceOptions {
  dbName?: string;
  dbVersion?: number;
  autoUpgrade?: boolean;
  onUpgrade?: (oldVersion: number, newVersion: number) => void;
}

/**
 * Type guard to check if a value is a valid Config object
 */
export function isConfig(value: any): value is Config {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.configId === 'string' &&
    typeof value.appId === 'string' &&
    typeof value.userId === 'string' &&
    typeof value.componentType === 'string' &&
    typeof value.name === 'string' &&
    typeof value.createdBy === 'string' &&
    typeof value.creationTime === 'number'
  );
}

/**
 * Type guard to check if a component type is a profile type
 */
export function isProfileType(componentType: string): boolean {
  return componentType.endsWith(PROFILE_SUFFIX);
}

/**
 * Get the base component type from a profile type
 */
export function getBaseComponentType(profileType: string): string {
  if (isProfileType(profileType)) {
    return profileType.slice(0, -PROFILE_SUFFIX.length);
  }
  return profileType;
}

/**
 * Create a profile type from a base component type
 */
export function createProfileType(baseType: string): ProfileType<string> {
  return `${baseType}${PROFILE_SUFFIX}`;
}

/**
 * Get profile type for a component
 */
export function getProfileType(componentType: string): string {
  if (isProfileType(componentType)) {
    return componentType;
  }
  return createProfileType(componentType);
}