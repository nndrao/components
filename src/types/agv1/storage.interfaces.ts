/**
 * Storage Interfaces for AGV1 React Components
 * 
 * This file defines the storage schemas and interfaces for local (IndexedDB)
 * and remote (MongoDB) storage, including the universal component configuration schema.
 */

/**
 * User information for sharing and permissions
 */
export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
}

/**
 * Shared user configuration
 */
export interface SharedUser {
  userId: string;
  username: string;
  permissions: 'view' | 'edit';
  sharedAt: string;
  sharedBy: string;
}

/**
 * Public access configuration
 */
export interface PublicAccessConfig {
  enabled: boolean;
  accessLevel: 'view' | 'interact' | 'full';
  requiresAuth: boolean;
  expiresAt?: string;
  accessKey?: string;
}

/**
 * Version information for configuration versioning
 */
export interface Version {
  id: string;
  name: string;
  description?: string;
  configuration: any;
  createdAt: string;
  createdBy: string;
  isLocked?: boolean;
  tags?: string[];
}

/**
 * Permission settings for a component configuration
 */
export interface Permissions {
  isPublic: boolean;
  canEdit: string[];
  canView: string[];
  allowSharing: boolean;
  editableByOthers: boolean;
}

/**
 * Settings with version management
 */
export interface Settings {
  activeVersionId: string;
  versions: Record<string, Version>;
}

/**
 * Metadata for component configurations
 */
export interface Metadata {
  tags: string[];
  category: string;
  lastAccessed: string;
  accessCount: number;
  favorited: boolean;
  notes: string;
  customFields?: Record<string, any>;
}

/**
 * Sharing configuration
 */
export interface Sharing {
  isShared: boolean;
  sharedWith: SharedUser[];
  publicAccess: PublicAccessConfig;
  shareHistory?: Array<{
    action: 'shared' | 'revoked';
    userId: string;
    timestamp: string;
  }>;
}

/**
 * Component state for runtime persistence
 */
export interface ComponentState {
  instanceId: string;
  componentType: string;
  config: any;
  runtime?: {
    [key: string]: any;
  };
}

/**
 * Universal Component Configuration Schema
 * This is the main schema for storing component configurations
 */
export interface ComponentConfig {
  /** Unique identifier for this configuration */
  instanceId: string;
  
  /** Type of component */
  componentType: string;
  
  /** Optional display name */
  displayName?: string;
  
  /** Application ID this component belongs to */
  appId: string;
  
  /** User ID who created this configuration */
  userId: string;
  
  /** Owner ID (can be different from userId if ownership transferred) */
  ownerId: string;
  
  /** Permission settings */
  permissions: Permissions;
  
  /** Configuration versions and settings */
  settings: Settings;
  
  /** Component configuration data */
  configuration?: any;
  
  /** Metadata for categorization and search */
  metadata: Metadata;
  
  /** Sharing configuration */
  sharing: Sharing;
  
  /** Creation timestamp */
  createdAt: string;
  
  /** Last update timestamp */
  updatedAt: string;
  
  /** Soft delete flag */
  isDeleted?: boolean;
  
  /** Deletion timestamp */
  deletedAt?: string;
}

/**
 * Profile configuration for saving complete workspace states
 */
export interface ProfileConfig {
  id: string;
  name: string;
  description?: string;
  userId: string;
  appId: string;
  
  /** List of component configurations in this profile */
  components: ComponentConfig[];
  
  /** Layout state (Dockview serialized state) */
  layout: any;
  
  /** Global settings for the profile */
  globalSettings?: {
    theme?: 'light' | 'dark' | 'auto';
    language?: string;
    timezone?: string;
    [key: string]: any;
  };
  
  /** Profile metadata */
  metadata: {
    isDefault: boolean;
    isProtected: boolean;
    tags: string[];
    category: string;
    icon?: string;
  };
  
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
}

/**
 * Storage adapter interface that all storage implementations must follow
 */
export interface IStorageAdapter {
  /** Initialize the storage adapter */
  initialize(): Promise<void>;
  
  /**
   * Component Configuration CRUD
   */
  
  /** Save a component configuration */
  saveComponentConfig(config: ComponentConfig): Promise<void>;
  
  /** Get a component configuration by ID */
  getComponentConfig(instanceId: string): Promise<ComponentConfig | null>;
  
  /** Get all component configurations for a user */
  getUserComponentConfigs(userId: string, appId: string): Promise<ComponentConfig[]>;
  
  /** Update a component configuration */
  updateComponentConfig(instanceId: string, updates: Partial<ComponentConfig>): Promise<void>;
  
  /** Delete a component configuration (soft delete) */
  deleteComponentConfig(instanceId: string): Promise<void>;
  
  /**
   * Profile CRUD
   */
  
  /** Save a profile */
  saveProfile(profile: ProfileConfig): Promise<void>;
  
  /** Get a profile by ID */
  getProfile(profileId: string): Promise<ProfileConfig | null>;
  
  /** Get all profiles for a user */
  getUserProfiles(userId: string, appId: string): Promise<ProfileConfig[]>;
  
  /** Update a profile */
  updateProfile(profileId: string, updates: Partial<ProfileConfig>): Promise<void>;
  
  /** Delete a profile */
  deleteProfile(profileId: string): Promise<void>;
  
  /**
   * Version Management
   */
  
  /** Create a new version for a component */
  createVersion(instanceId: string, version: Version): Promise<void>;
  
  /** Get all versions for a component */
  getVersions(instanceId: string): Promise<Version[]>;
  
  /** Restore a specific version */
  restoreVersion(instanceId: string, versionId: string): Promise<void>;
  
  /**
   * Search and Query
   */
  
  /** Search configurations by criteria */
  searchConfigs(criteria: SearchCriteria): Promise<ComponentConfig[]>;
  
  /** Search component configurations by criteria (alias for searchConfigs) */
  searchComponentConfigs(criteria: SearchCriteria): Promise<ComponentConfig[]>;
  
  /** Get shared configurations */
  getSharedConfigs(userId: string): Promise<ComponentConfig[]>;
  
  /** Get public configurations */
  getPublicConfigs(): Promise<ComponentConfig[]>;
  
  /**
   * Event Management
   */
  
  /** Add event listener for storage events */
  addEventListener(listener: StorageEventListener): () => void;
}

/**
 * Search criteria for querying configurations
 */
export interface SearchCriteria {
  query?: string;
  componentType?: string;
  tags?: string[];
  category?: string;
  userId?: string;
  appId?: string;
  isPublic?: boolean;
  isShared?: boolean;
  favorited?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  sortBy?: 'name' | 'created' | 'modified' | 'accessed';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Sync status for hybrid storage
 */
export interface SyncStatus {
  lastSyncTime: string;
  pendingChanges: number;
  syncInProgress: boolean;
  lastError?: string;
  failedItems?: string[];
}

/**
 * Conflict resolution strategy
 */
export type ConflictResolution = 'local-wins' | 'remote-wins' | 'newest-wins' | 'manual';

/**
 * Hybrid storage configuration
 */
export interface HybridStorageConfig {
  /** Conflict resolution strategy */
  conflictResolution: ConflictResolution;
  
  /** Auto-sync interval in milliseconds */
  syncInterval: number;
  
  /** Whether to sync on startup */
  syncOnStartup: boolean;
  
  /** Whether to sync on save */
  syncOnSave: boolean;
  
  /** Maximum retry attempts for failed syncs */
  maxRetries: number;
  
  /** Retry delay in milliseconds */
  retryDelay: number;
}

/**
 * Storage event types for monitoring
 */
export type StorageEventType = 
  | 'config-saved'
  | 'config-updated'
  | 'config-deleted'
  | 'profile-saved'
  | 'profile-updated'
  | 'profile-deleted'
  | 'sync-started'
  | 'sync-completed'
  | 'sync-failed'
  | 'conflict-detected'
  | 'conflict-resolved';

/**
 * Storage event data
 */
export interface StorageEvent {
  type: StorageEventType;
  timestamp: string;
  data?: any;
  error?: Error;
}

/**
 * Storage event listener
 */
export type StorageEventListener = (event: StorageEvent) => void;

/**
 * IndexedDB schema definition
 */
export interface IndexedDBSchema {
  version: number;
  stores: {
    componentConfigs: {
      keyPath: 'instanceId';
      indexes: Array<{
        name: string;
        keyPath: string | string[];
        unique?: boolean;
        multiEntry?: boolean;
      }>;
    };
    profiles: {
      keyPath: 'id';
      indexes: Array<{
        name: string;
        keyPath: string | string[];
        unique?: boolean;
      }>;
    };
    syncQueue: {
      keyPath: 'id';
      autoIncrement: true;
    };
  };
}

/**
 * MongoDB connection configuration
 */
export interface MongoDBConfig {
  connectionString: string;
  database: string;
  collections: {
    componentConfigs: string;
    profiles: string;
    users: string;
  };
  options?: {
    useNewUrlParser?: boolean;
    useUnifiedTopology?: boolean;
    maxPoolSize?: number;
  };
}