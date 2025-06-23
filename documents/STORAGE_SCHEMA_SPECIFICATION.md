# Storage Schema Specification

## Overview
This document defines the complete storage schemas for both local (IndexedDB) and remote (MongoDB) persistence, including migration strategies and sync mechanisms.

## Storage Architecture

### Storage Modes
1. **Local Only**: IndexedDB storage for offline-first applications
2. **Remote Only**: MongoDB storage for cloud-based deployments
3. **Hybrid**: Local + Remote with automatic synchronization

### Storage Adapter Interface

```typescript
interface StorageAdapter {
  // Configuration CRUD
  fetchAllConfigs(appId: string, userId: string): Promise<ComponentConfig[]>;
  fetchConfig(instanceId: string): Promise<ComponentConfig | null>;
  createConfig(config: ComponentConfig): Promise<ComponentConfig>;
  updateConfig(instanceId: string, updates: Partial<ComponentConfig>): Promise<ComponentConfig>;
  deleteConfig(instanceId: string): Promise<void>;
  
  // Batch operations
  batchCreateConfigs(configs: ComponentConfig[]): Promise<ComponentConfig[]>;
  batchUpdateConfigs(updates: Array<{instanceId: string; updates: Partial<ComponentConfig>}>): Promise<void>;
  batchDeleteConfigs(instanceIds: string[]): Promise<void>;
  
  // Profile operations
  fetchProfile(profileId: string): Promise<Profile>;
  saveProfile(profile: Profile): Promise<void>;
  listProfiles(appId: string, userId: string): Promise<ProfileSummary[]>;
  
  // Versioning
  createVersion(instanceId: string, version: Version): Promise<Version>;
  activateVersion(instanceId: string, versionId: string): Promise<void>;
  deleteVersion(instanceId: string, versionId: string): Promise<void>;
  rollbackVersion(instanceId: string, versionId: string): Promise<void>;
  
  // Sharing
  shareConfig(instanceId: string, shareRequest: ShareRequest): Promise<ShareResponse>;
  unshareConfig(instanceId: string, userId: string): Promise<void>;
  getSharedConfigs(userId: string): Promise<SharedConfig[]>;
  
  // Sync operations (Hybrid mode only)
  sync?(): Promise<SyncResult>;
  resolveConflicts?(conflicts: Conflict[]): Promise<void>;
  getLocalChanges?(): Promise<LocalChange[]>;
}
```

## Local Storage Schema (IndexedDB)

### Database Structure

```typescript
import { DBSchema } from 'idb';

interface AGV1Schema extends DBSchema {
  // Main configuration store
  componentConfigs: {
    key: string; // instanceId
    value: ComponentConfig;
    indexes: { 
      'by-app-user': [string, string]; // [appId, userId]
      'by-type': string; // componentType
      'by-updated': Date; // updatedAt
      'by-owner': string; // ownerId
      'by-shared': string; // sharing.sharedWith[].userId
    };
  };
  
  // Profile store
  profiles: {
    key: string; // profileId
    value: Profile;
    indexes: {
      'by-app-user': [string, string]; // [appId, userId]
      'by-name': string; // name
      'by-updated': Date; // updatedAt
    };
  };
  
  // Template store
  templates: {
    key: string; // templateId
    value: ConfigTemplate;
    indexes: { 
      'by-type': string; // componentType
      'by-category': string; // category
      'by-public': number; // isPublic ? 1 : 0
    };
  };
  
  // Sync queue for offline changes
  syncQueue: {
    key: string; // operationId
    value: SyncOperation;
    indexes: { 
      'by-timestamp': Date; // timestamp
      'by-status': string; // status
      'by-type': string; // operationType
    };
  };
  
  // Conflict resolution store
  conflicts: {
    key: string; // conflictId
    value: Conflict;
    indexes: {
      'by-instance': string; // instanceId
      'by-timestamp': Date; // detectedAt
    };
  };
  
  // Cache for remote data
  remoteCache: {
    key: string; // cacheKey
    value: CachedData;
    indexes: {
      'by-expiry': Date; // expiresAt
      'by-type': string; // dataType
    };
  };
}
```

### IndexedDB Implementation

```typescript
import { openDB, IDBPDatabase } from 'idb';

export class IDBStorageAdapter implements StorageAdapter {
  private db: IDBPDatabase<AGV1Schema>;
  private readonly DB_NAME = 'agv1-storage';
  private readonly DB_VERSION = 1;
  
  async initialize(): Promise<void> {
    this.db = await openDB<AGV1Schema>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Component configs store
        if (!db.objectStoreNames.contains('componentConfigs')) {
          const configStore = db.createObjectStore('componentConfigs', {
            keyPath: 'instanceId'
          });
          configStore.createIndex('by-app-user', ['appId', 'userId']);
          configStore.createIndex('by-type', 'componentType');
          configStore.createIndex('by-updated', 'updatedAt');
          configStore.createIndex('by-owner', 'ownerId');
          configStore.createIndex('by-shared', 'sharing.sharedWith[].userId', { 
            multiEntry: true 
          });
        }
        
        // Profiles store
        if (!db.objectStoreNames.contains('profiles')) {
          const profileStore = db.createObjectStore('profiles', {
            keyPath: 'id'
          });
          profileStore.createIndex('by-app-user', ['appId', 'userId']);
          profileStore.createIndex('by-name', 'name');
          profileStore.createIndex('by-updated', 'updatedAt');
        }
        
        // Templates store
        if (!db.objectStoreNames.contains('templates')) {
          const templateStore = db.createObjectStore('templates', {
            keyPath: 'id'
          });
          templateStore.createIndex('by-type', 'componentType');
          templateStore.createIndex('by-category', 'category');
          templateStore.createIndex('by-public', 'isPublic');
        }
        
        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', {
            keyPath: 'id',
            autoIncrement: true
          });
          syncStore.createIndex('by-timestamp', 'timestamp');
          syncStore.createIndex('by-status', 'status');
          syncStore.createIndex('by-type', 'operationType');
        }
        
        // Conflicts store
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictStore = db.createObjectStore('conflicts', {
            keyPath: 'id'
          });
          conflictStore.createIndex('by-instance', 'instanceId');
          conflictStore.createIndex('by-timestamp', 'detectedAt');
        }
        
        // Remote cache store
        if (!db.objectStoreNames.contains('remoteCache')) {
          const cacheStore = db.createObjectStore('remoteCache', {
            keyPath: 'key'
          });
          cacheStore.createIndex('by-expiry', 'expiresAt');
          cacheStore.createIndex('by-type', 'dataType');
        }
      }
    });
  }
  
  // Implementation of StorageAdapter methods...
}
```

## Remote Storage Schema (MongoDB)

### Collection: component_configs

```javascript
{
  // Identity
  _id: ObjectId,
  instanceId: String, // Unique identifier
  appId: String, // Application ID
  tenantId: String, // Multi-tenant support
  userId: String, // Owner user ID
  ownerId: String, // Can be different from userId for transferred ownership
  
  // Component Information
  componentType: String, // 'datatable' | 'chart' | etc.
  subcomponentType: String, // 'AdvancedTable' | 'LineChart' | etc.
  displayName: String, // User-friendly name
  description: String, // Optional description
  
  // Configuration with Versioning
  settings: {
    activeVersionId: String,
    versions: {
      [versionId]: {
        versionId: String,
        versionNumber: Number,
        name: String,
        description: String,
        isActive: Boolean,
        createdAt: Date,
        createdBy: String,
        config: Object, // Component-specific configuration
        state: Object, // Component state snapshot
        audit: {
          createdBy: String,
          createdAt: Date,
          lastModifiedBy: String,
          lastModifiedAt: Date,
          changeHistory: [{
            timestamp: Date,
            userId: String,
            action: String, // 'created' | 'updated' | 'activated' | 'deactivated'
            changes: Object, // Diff of changes
            changeReason: String // Optional
          }]
        }
      }
    },
    maxVersions: Number, // Limit number of versions
    retentionDays: Number // Auto-delete old versions
  },
  
  // Access Control
  permissions: {
    isPublic: Boolean,
    canEdit: [String], // User IDs
    canView: [String], // User IDs
    canDelete: [String], // User IDs
    canShare: [String], // User IDs
    allowSharing: Boolean,
    editableByOthers: Boolean,
    inheritFromParent: Boolean, // Inherit from workspace/dashboard
    customRoles: [{
      roleId: String,
      permissions: [String]
    }]
  },
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  lastAccessedAt: Date,
  accessCount: Number,
  size: Number, // Size in bytes
  tags: [String],
  category: String,
  labels: Object, // Key-value pairs for custom metadata
  
  // Relationships
  relationships: {
    parentId: String, // Parent component/workspace
    childIds: [String], // Child components
    dependencies: [{
      componentId: String,
      type: String // 'data' | 'config' | 'visual'
    }],
    linkedComponents: [String] // Related components
  },
  
  // Sharing
  sharing: {
    isShared: Boolean,
    shareId: String, // Unique share identifier
    shareUrl: String, // Public share URL
    sharePassword: String, // Optional password protection
    shareExpiry: Date, // Optional expiry
    sharedWith: [{
      userId: String,
      email: String,
      sharedAt: Date,
      permissions: [String], // 'view' | 'edit' | 'admin'
      sharedBy: String,
      lastAccessed: Date,
      accessCount: Number
    }],
    publicAccess: {
      enabled: Boolean,
      accessLevel: String, // 'view' | 'interact' | 'edit'
      requiresAuth: Boolean,
      allowedDomains: [String], // Email domain restrictions
      accessLog: Boolean // Log anonymous access
    }
  },
  
  // Sync Status
  syncStatus: {
    lastSyncedAt: Date,
    syncVersion: String,
    localChanges: Boolean,
    remoteChanges: Boolean,
    conflicts: [{
      field: String,
      localValue: Object,
      remoteValue: Object,
      detectedAt: Date
    }],
    syncErrors: [{
      timestamp: Date,
      error: String,
      retry: Number
    }]
  },
  
  // Performance Tracking
  performance: {
    loadTime: Number, // Average load time in ms
    renderTime: Number, // Average render time in ms
    dataFetchTime: Number, // Average data fetch time
    lastOptimized: Date,
    performanceScore: Number // 0-100
  },
  
  // Audit Trail
  auditLog: [{
    timestamp: Date,
    userId: String,
    action: String,
    details: Object,
    ipAddress: String,
    userAgent: String
  }]
}

// Indexes
db.component_configs.createIndex({ instanceId: 1 }, { unique: true });
db.component_configs.createIndex({ appId: 1, userId: 1, componentType: 1 });
db.component_configs.createIndex({ appId: 1, "permissions.isPublic": 1 });
db.component_configs.createIndex({ appId: 1, "sharing.sharedWith.userId": 1 });
db.component_configs.createIndex({ tags: 1 });
db.component_configs.createIndex({ category: 1 });
db.component_configs.createIndex({ updatedAt: -1 });
db.component_configs.createIndex({ "relationships.parentId": 1 });
db.component_configs.createIndex({ "sharing.shareId": 1 }, { sparse: true });

// TTL Index for automatic cleanup
db.component_configs.createIndex(
  { "sharing.shareExpiry": 1 }, 
  { expireAfterSeconds: 0, sparse: true }
);
```

### Collection: profiles

```javascript
{
  _id: ObjectId,
  id: String,
  appId: String,
  userId: String,
  name: String,
  description: String,
  type: String, // 'workspace' | 'dashboard' | 'component-set'
  
  // Configuration snapshot
  configurations: [{
    instanceId: String,
    componentType: String,
    config: Object,
    state: Object,
    version: String
  }],
  
  // Layout information
  layout: {
    type: String, // 'dockview' | 'grid' | 'custom'
    config: Object, // Layout-specific configuration
    responsive: Object // Breakpoint configurations
  },
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  lastUsedAt: Date,
  useCount: Number,
  isDefault: Boolean,
  isTemplate: Boolean,
  tags: [String],
  
  // Sharing
  sharing: Object, // Same structure as component sharing
  
  // Audit
  audit: Object // Same structure as component audit
}

// Indexes
db.profiles.createIndex({ appId: 1, userId: 1, name: 1 }, { unique: true });
db.profiles.createIndex({ isTemplate: 1, "sharing.isPublic": 1 });
```

### Collection: sync_operations

```javascript
{
  _id: ObjectId,
  operationId: String,
  appId: String,
  userId: String,
  timestamp: Date,
  
  // Operation details
  operation: {
    type: String, // 'create' | 'update' | 'delete' | 'batch'
    target: String, // 'component' | 'profile' | 'template'
    instanceId: String,
    data: Object,
    previousData: Object // For updates
  },
  
  // Sync status
  status: String, // 'pending' | 'syncing' | 'completed' | 'failed'
  attempts: Number,
  lastAttempt: Date,
  error: String,
  
  // Conflict resolution
  hasConflict: Boolean,
  conflictResolution: String, // 'local-wins' | 'remote-wins' | 'merge'
  resolvedBy: String,
  resolvedAt: Date
}

// Indexes
db.sync_operations.createIndex({ appId: 1, userId: 1, status: 1 });
db.sync_operations.createIndex({ timestamp: -1 });
```

## Data Types

### ComponentConfig Type

```typescript
interface ComponentConfig {
  // Identity
  instanceId: string;
  componentType: ComponentType;
  subcomponentType?: string;
  displayName?: string;
  description?: string;
  
  // Ownership
  appId: string;
  tenantId?: string;
  userId: string;
  ownerId: string;
  
  // Permissions
  permissions: Permissions;
  
  // Settings with versioning
  settings: {
    activeVersionId: string;
    versions: Record<string, Version>;
    maxVersions?: number;
    retentionDays?: number;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  metadata: Metadata;
  
  // Relationships
  relationships?: Relationships;
  
  // Sharing
  sharing: SharingConfig;
  
  // Sync status (for hybrid mode)
  syncStatus?: SyncStatus;
  
  // Performance metrics
  performance?: PerformanceMetrics;
}

interface Version {
  versionId: string;
  versionNumber: number;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  config: any; // Component-specific
  state?: any; // Component state
  audit: AuditInfo;
}

interface SharingConfig {
  isShared: boolean;
  shareId?: string;
  shareUrl?: string;
  sharePassword?: string;
  shareExpiry?: string;
  sharedWith: SharedUser[];
  publicAccess: PublicAccessConfig;
}
```

## Migration Strategies

### Schema Migration

```typescript
interface Migration {
  version: number;
  name: string;
  up: (data: any) => any;
  down: (data: any) => any;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'add-versioning',
    up: (config) => ({
      ...config,
      settings: {
        activeVersionId: 'v1',
        versions: {
          v1: {
            versionId: 'v1',
            versionNumber: 1,
            name: 'Initial',
            config: config.settings || {},
            createdAt: config.createdAt,
            createdBy: config.userId
          }
        }
      }
    }),
    down: (config) => ({
      ...config,
      settings: config.settings.versions[config.settings.activeVersionId].config
    })
  }
];

class MigrationService {
  async migrateConfig(config: any, targetVersion: number): Promise<any> {
    let currentVersion = config.schemaVersion || 0;
    let migratedConfig = { ...config };
    
    while (currentVersion < targetVersion) {
      const migration = migrations.find(m => m.version === currentVersion + 1);
      if (!migration) break;
      
      migratedConfig = migration.up(migratedConfig);
      currentVersion++;
    }
    
    migratedConfig.schemaVersion = currentVersion;
    return migratedConfig;
  }
}
```

## Sync Mechanisms

### Conflict Resolution

```typescript
interface ConflictResolver {
  resolve(local: any, remote: any, strategy: ConflictStrategy): any;
}

type ConflictStrategy = 'local-wins' | 'remote-wins' | 'merge' | 'manual';

class DefaultConflictResolver implements ConflictResolver {
  resolve(local: any, remote: any, strategy: ConflictStrategy): any {
    switch (strategy) {
      case 'local-wins':
        return local;
      
      case 'remote-wins':
        return remote;
      
      case 'merge':
        return this.deepMerge(local, remote);
      
      case 'manual':
        throw new ConflictError('Manual resolution required', { local, remote });
    }
  }
  
  private deepMerge(local: any, remote: any): any {
    // Smart merge based on timestamps and field types
    // Prefer newer values, handle arrays specially
  }
}
```

### Sync Protocol

```typescript
interface SyncProtocol {
  // Get changes since last sync
  getLocalChanges(lastSyncTime: Date): Promise<Change[]>;
  getRemoteChanges(lastSyncTime: Date): Promise<Change[]>;
  
  // Apply changes
  applyLocalChanges(changes: Change[]): Promise<void>;
  applyRemoteChanges(changes: Change[]): Promise<void>;
  
  // Conflict detection
  detectConflicts(localChanges: Change[], remoteChanges: Change[]): Conflict[];
  
  // Sync execution
  performSync(): Promise<SyncResult>;
}
```

## Performance Considerations

### Indexing Strategy
- Index frequently queried fields
- Compound indexes for common query patterns
- Sparse indexes for optional fields
- TTL indexes for automatic cleanup

### Data Optimization
- Compress large configuration objects
- Implement pagination for list operations
- Use projection to fetch only needed fields
- Cache frequently accessed data

### Sync Optimization
- Batch sync operations
- Use delta sync for large configurations
- Implement exponential backoff for retries
- Queue operations when offline

This storage schema provides a robust foundation for both local and remote persistence with full support for versioning, sharing, and synchronization.