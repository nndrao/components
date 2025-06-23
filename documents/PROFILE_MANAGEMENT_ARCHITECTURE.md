# Profile Management Architecture

## Executive Summary

This document outlines a comprehensive profile management system for UI components, addressing multi-instance support, remote storage, and standardized user interfaces. The architecture enables consistent configuration management across all components while maintaining flexibility and performance.

### Key Goals
- Support multiple instances of components with isolated configurations
- Enable remote storage (MongoDB) for enterprise deployments
- Provide standardized UI for profile management
- Maintain backward compatibility with existing localStorage implementation
- Support collaborative features and version control

## Table of Contents
1. [Current State Analysis](#current-state-analysis)
2. [Proposed Universal Schema](#proposed-universal-schema)
3. [Component Container Architecture](#component-container-architecture)
4. [Standardized Profile Management UI](#standardized-profile-management-ui)
5. [Storage Layer Design](#storage-layer-design)
6. [Implementation Examples](#implementation-examples)
7. [Migration Strategy](#migration-strategy)
8. [Future Enhancements](#future-enhancements)

## Current State Analysis

### Existing LocalStorage Schema

The current implementation uses multiple localStorage keys with inconsistent naming:

```javascript
// Current Storage Keys (Confusing)
'grid-profile-storage'          // Profiles with grid state
'column-template-store'         // Reusable column templates
'datatable-datasources'         // Data source configurations
'column-formatting-store'       // UI preferences (misleading name)
'column-dialog-sound-enabled'   // Single preference (too granular)
```

### Problems with Current Implementation

1. **No Multi-Instance Support**: All datatable instances share the same storage
2. **Inconsistent Naming**: Mix of "storage" vs "store", unclear semantics
3. **No User Isolation**: No support for multi-user scenarios
4. **Limited Remote Storage**: Designed only for localStorage
5. **No Audit Trail**: No tracking of who changed what and when

### Current Profile Structure

```typescript
interface GridProfile {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
  description?: string;
  columnSettings?: {
    columnCustomizations?: Record<string, ColumnCustomization>;
    baseColumnDefs?: ColDef[];
  };
  gridState?: {
    columnState: ColumnState[];
    filterModel: FilterModel;
    sortModel: SortModelItem[];
  };
  gridOptions?: {
    rowHeight?: number;
    headerHeight?: number;
    // ... other options
  };
}
```

## Proposed Universal Schema

Based on the `ui_component_settings.json` structure, we propose a universal schema that works for all components:

### Schema Structure

```typescript
interface ComponentConfig {
  // Identity
  instanceId: string;              // Unique component instance ID
  componentType: string;           // "DataGrid", "Chart", etc.
  subcomponentType?: string;       // "AdvancedTable", "LineChart", etc.
  displayName?: string;            // User-friendly name
  
  // Ownership & Access
  appId: string;
  userId: string;
  ownerId: string;
  permissions: {
    isPublic: boolean;
    canEdit: string[];
    canView: string[];
    allowSharing: boolean;
    editableByOthers: boolean;
  };
  
  // Settings with Versioning
  settings: {
    activeVersionId: string;
    versions: Record<string, Version>;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  metadata: {
    tags: string[];
    category: string;
    lastAccessed: string;
    accessCount: number;
    favorited: boolean;
    notes: string;
  };
  
  // Sharing
  sharing: {
    isShared: boolean;
    shareId?: string;
    shareUrl?: string;
    sharedWith: SharedUser[];
    publicAccess: PublicAccessConfig;
  };
}

interface Version {
  versionId: string;
  versionNumber: number;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  config: any; // Component-specific configuration
  audit: AuditInfo;
}
```

### Benefits of Universal Schema

1. **Multi-Instance Ready**: Each component has unique `instanceId`
2. **Version Control**: Built-in version history with rollback
3. **Access Control**: Fine-grained permissions
4. **Audit Trail**: Complete change tracking
5. **Sharing**: Built-in collaboration features
6. **Metadata**: Rich categorization and search

## Component Container Architecture

### Overview

A container-based architecture where:
1. Container fetches all configurations at startup
2. Provides configuration context to child components
3. Each component self-loads its configuration using instanceId

### AppContainer Implementation

```typescript
interface AppContainerProps {
  appId: string;
  userId: string;
  children: React.ReactNode;
  storageAdapter?: StorageAdapter;
}

const AppContainer: React.FC<AppContainerProps> = ({ 
  appId, 
  userId, 
  children,
  storageAdapter = new LocalStorageAdapter()
}) => {
  const [configs, setConfigs] = useState<ComponentConfigMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    // Fetch all configs for this user/app on mount
    loadAllConfigurations();
  }, [appId, userId]);
  
  const loadAllConfigurations = async () => {
    try {
      setLoading(true);
      const allConfigs = await storageAdapter.fetchAllConfigs(appId, userId);
      setConfigs(allConfigs);
    } catch (err) {
      setError(err as Error);
      // Fallback to component-level loading
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorBoundary error={error} retry={loadAllConfigurations} />;
  
  return (
    <ComponentConfigProvider 
      configs={configs}
      appId={appId}
      userId={userId}
      storageAdapter={storageAdapter}
    >
      {children}
    </ComponentConfigProvider>
  );
};
```

### Component Config Provider

```typescript
const ComponentConfigContext = createContext<ComponentConfigContextValue | null>(null);

interface ComponentConfigContextValue {
  configs: ComponentConfigMap;
  getConfig: (instanceId: string) => ComponentConfig | null;
  updateConfig: (instanceId: string, updates: Partial<ComponentConfig>) => Promise<void>;
  reloadConfig: (instanceId: string) => Promise<void>;
  createConfig: (config: Omit<ComponentConfig, 'createdAt' | 'updatedAt'>) => Promise<ComponentConfig>;
  deleteConfig: (instanceId: string) => Promise<void>;
  appId: string;
  userId: string;
  storageAdapter: StorageAdapter;
}

const ComponentConfigProvider: React.FC<ComponentConfigProviderProps> = ({ 
  configs: initialConfigs,
  appId,
  userId,
  storageAdapter,
  children 
}) => {
  const [configs, setConfigs] = useState(initialConfigs);
  const configCache = useRef(new Map<string, ComponentConfig>());
  
  const getConfig = useCallback((instanceId: string) => {
    return configs[instanceId] || configCache.current.get(instanceId) || null;
  }, [configs]);
  
  const updateConfig = useCallback(async (instanceId: string, updates: Partial<ComponentConfig>) => {
    try {
      // Optimistic update
      setConfigs(prev => ({
        ...prev,
        [instanceId]: { ...prev[instanceId], ...updates, updatedAt: new Date().toISOString() }
      }));
      
      // Persist to storage
      await storageAdapter.updateConfig(instanceId, updates);
      
      // Update cache
      configCache.current.set(instanceId, { ...configs[instanceId], ...updates });
    } catch (error) {
      // Rollback on error
      setConfigs(prev => ({ ...prev, [instanceId]: configs[instanceId] }));
      throw error;
    }
  }, [configs, storageAdapter]);
  
  const reloadConfig = useCallback(async (instanceId: string) => {
    const freshConfig = await storageAdapter.fetchConfig(instanceId);
    if (freshConfig) {
      setConfigs(prev => ({ ...prev, [instanceId]: freshConfig }));
      configCache.current.set(instanceId, freshConfig);
    }
  }, [storageAdapter]);
  
  const value = useMemo(() => ({
    configs,
    getConfig,
    updateConfig,
    reloadConfig,
    createConfig,
    deleteConfig,
    appId,
    userId,
    storageAdapter
  }), [configs, getConfig, updateConfig, reloadConfig, appId, userId, storageAdapter]);
  
  return (
    <ComponentConfigContext.Provider value={value}>
      {children}
    </ComponentConfigContext.Provider>
  );
};
```

### Self-Loading Component Pattern

```typescript
// Higher-Order Component for config-aware components
function withComponentConfig<P extends { instanceId: string }>(
  Component: React.ComponentType<P & { config: ComponentConfig }>,
  componentType: string
) {
  return React.forwardRef<any, P>((props, ref) => {
    const context = useContext(ComponentConfigContext);
    const [localConfig, setLocalConfig] = useState<ComponentConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    
    useEffect(() => {
      loadConfiguration();
    }, [props.instanceId]);
    
    const loadConfiguration = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try context first
        let config = context?.getConfig(props.instanceId);
        
        if (!config && context?.storageAdapter) {
          // Fallback to direct loading
          config = await context.storageAdapter.fetchConfig(props.instanceId);
          if (config) {
            // Update context with loaded config
            await context.updateConfig(props.instanceId, config);
          }
        }
        
        if (!config) {
          // Create default config if none exists
          config = await createDefaultConfig(props.instanceId, componentType);
        }
        
        setLocalConfig(config);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    if (loading) return <ComponentSkeleton type={componentType} />;
    if (error) return <ConfigError error={error} retry={loadConfiguration} />;
    if (!localConfig) return <ConfigNotFound instanceId={props.instanceId} />;
    
    return <Component {...props} config={localConfig} ref={ref} />;
  });
}
```

## Standardized Profile Management UI

### ProfileManager Component

A universal profile management interface that all components can use:

```typescript
interface ProfileManagerProps {
  componentType: string;
  instanceId: string;
  config: ComponentConfig;
  onProfileChange?: (versionId: string) => void;
  onConfigUpdate?: (config: ComponentConfig) => void;
  className?: string;
  variant?: 'inline' | 'dialog' | 'drawer';
}

const ProfileManager: React.FC<ProfileManagerProps> = ({
  componentType,
  instanceId,
  config,
  onProfileChange,
  onConfigUpdate,
  className,
  variant = 'inline'
}) => {
  const [showManager, setShowManager] = useState(false);
  const { updateConfig } = useComponentConfig();
  
  const versions = Object.values(config.settings.versions).sort(
    (a, b) => b.versionNumber - a.versionNumber
  );
  
  const activeVersion = config.settings.versions[config.settings.activeVersionId];
  
  const handleCreateVersion = async (name: string, description: string) => {
    const newVersion = createNewVersion(config, name, description);
    const updatedConfig = {
      ...config,
      settings: {
        ...config.settings,
        versions: {
          ...config.settings.versions,
          [newVersion.versionId]: newVersion
        },
        activeVersionId: newVersion.versionId
      }
    };
    
    await updateConfig(instanceId, updatedConfig);
    onConfigUpdate?.(updatedConfig);
  };
  
  const handleActivateVersion = async (versionId: string) => {
    const updatedConfig = {
      ...config,
      settings: {
        ...config.settings,
        activeVersionId: versionId
      }
    };
    
    await updateConfig(instanceId, updatedConfig);
    onProfileChange?.(versionId);
    onConfigUpdate?.(updatedConfig);
  };
  
  if (variant === 'inline') {
    return (
      <div className={cn("profile-manager-inline", className)}>
        <ProfileSelector
          versions={versions}
          activeVersionId={config.settings.activeVersionId}
          onSelect={handleActivateVersion}
          onManageClick={() => setShowManager(true)}
        />
        
        <ProfileManagerDialog
          open={showManager}
          onClose={() => setShowManager(false)}
          config={config}
          onCreateVersion={handleCreateVersion}
          onActivateVersion={handleActivateVersion}
          onUpdateVersion={handleUpdateVersion}
          onDeleteVersion={handleDeleteVersion}
        />
      </div>
    );
  }
  
  // Other variants (dialog, drawer) implementation...
};
```

### Profile Selector UI

```typescript
const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  versions,
  activeVersionId,
  onSelect,
  onManageClick
}) => {
  return (
    <div className="flex items-center gap-2">
      <Select value={activeVersionId} onValueChange={onSelect}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select profile" />
        </SelectTrigger>
        <SelectContent>
          {versions.map(version => (
            <SelectItem key={version.versionId} value={version.versionId}>
              <div className="flex items-center justify-between w-full">
                <span>{version.name}</span>
                {version.isActive && (
                  <Badge variant="secondary" className="ml-2">Active</Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button
        variant="outline"
        size="icon"
        onClick={onManageClick}
        title="Manage profiles"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
};
```

### Profile Management Dialog

```
┌─────────────────────────────────────────────────┐
│              Manage Profiles                     │
├─────────────────────────────────────────────────┤
│ Search: [_____________________________] [+ New] │
│                                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ ◉ Production Settings              v3   ⋮  ││
│ │   Last updated: 2 hours ago by John         ││
│ │   "Stable configuration for production"      ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ ○ Development Settings             v2   ⋮  ││
│ │   Last updated: 1 day ago by Jane           ││
│ │   "Testing new features"                     ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ ○ Default Configuration            v1   🔒  ││
│ │   Created: 1 week ago by System             ││
│ │   "Initial configuration"                    ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ [Import] [Export All]              [Close]      │
└─────────────────────────────────────────────────┘
```

## Storage Layer Design

### Storage Adapter Interface

```typescript
interface StorageAdapter {
  // Configuration CRUD
  fetchAllConfigs(appId: string, userId: string): Promise<ComponentConfigMap>;
  fetchConfig(instanceId: string): Promise<ComponentConfig | null>;
  createConfig(config: ComponentConfig): Promise<ComponentConfig>;
  updateConfig(instanceId: string, updates: Partial<ComponentConfig>): Promise<ComponentConfig>;
  deleteConfig(instanceId: string): Promise<void>;
  
  // Bulk operations
  importConfigs(configs: ComponentConfig[]): Promise<void>;
  exportConfigs(instanceIds: string[]): Promise<ComponentConfig[]>;
  
  // Versioning
  createVersion(instanceId: string, version: Version): Promise<Version>;
  activateVersion(instanceId: string, versionId: string): Promise<void>;
  deleteVersion(instanceId: string, versionId: string): Promise<void>;
  
  // Sharing
  shareConfig(instanceId: string, userIds: string[], permissions: string[]): Promise<void>;
  unshareConfig(instanceId: string, userId: string): Promise<void>;
}
```

### LocalStorage Adapter

```typescript
class LocalStorageAdapter implements StorageAdapter {
  private readonly storageKey = 'component-configs';
  
  async fetchAllConfigs(appId: string, userId: string): Promise<ComponentConfigMap> {
    const stored = localStorage.getItem(`${this.storageKey}-${appId}-${userId}`);
    return stored ? JSON.parse(stored) : {};
  }
  
  async fetchConfig(instanceId: string): Promise<ComponentConfig | null> {
    // Search across all stored configs
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this.storageKey));
    
    for (const key of keys) {
      const configs = JSON.parse(localStorage.getItem(key) || '{}');
      if (configs[instanceId]) {
        return configs[instanceId];
      }
    }
    
    return null;
  }
  
  async updateConfig(instanceId: string, updates: Partial<ComponentConfig>): Promise<ComponentConfig> {
    const config = await this.fetchConfig(instanceId);
    if (!config) throw new Error('Config not found');
    
    const updated = {
      ...config,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Save back to storage
    const key = `${this.storageKey}-${config.appId}-${config.userId}`;
    const allConfigs = JSON.parse(localStorage.getItem(key) || '{}');
    allConfigs[instanceId] = updated;
    localStorage.setItem(key, JSON.stringify(allConfigs));
    
    return updated;
  }
  
  // ... other methods
}
```

### MongoDB Adapter

```typescript
class MongoDBAdapter implements StorageAdapter {
  constructor(
    private apiEndpoint: string,
    private authToken: string
  ) {}
  
  async fetchAllConfigs(appId: string, userId: string): Promise<ComponentConfigMap> {
    const response = await fetch(`${this.apiEndpoint}/configs`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'X-App-Id': appId,
        'X-User-Id': userId
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch configs');
    
    const configs = await response.json();
    return configs.reduce((map, config) => {
      map[config.instanceId] = config;
      return map;
    }, {} as ComponentConfigMap);
  }
  
  async updateConfig(instanceId: string, updates: Partial<ComponentConfig>): Promise<ComponentConfig> {
    const response = await fetch(`${this.apiEndpoint}/configs/${instanceId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) throw new Error('Failed to update config');
    
    return response.json();
  }
  
  // ... other methods
}
```

### Remote Storage Schema (MongoDB)

```javascript
// MongoDB Collection: component_configs
{
  // Identity
  _id: ObjectId,
  instanceId: String,
  appId: String,
  tenantId: String,
  userId: String,
  ownerId: String,
  
  // Component Info
  componentType: String,
  subcomponentType: String,
  displayName: String,
  
  // Settings with Versions
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
        config: Object, // Component-specific
        audit: Object
      }
    }
  },
  
  // Access Control
  permissions: {
    isPublic: Boolean,
    canEdit: [String],
    canView: [String],
    allowSharing: Boolean,
    editableByOthers: Boolean
  },
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  lastAccessedAt: Date,
  accessCount: Number,
  size: Number,
  tags: [String],
  category: String,
  
  // Sharing
  sharing: {
    isShared: Boolean,
    shareId: String,
    shareUrl: String,
    sharedWith: [{
      userId: String,
      sharedAt: Date,
      permissions: [String],
      sharedBy: String
    }],
    publicAccess: {
      enabled: Boolean,
      accessLevel: String,
      requiresAuth: Boolean
    }
  },
  
  // Sync Status
  syncStatus: {
    lastSyncedAt: Date,
    syncVersion: String,
    localChanges: Boolean,
    conflicts: [Object]
  }
}

// Indexes
db.component_configs.createIndex({ appId: 1, userId: 1, instanceId: 1 }, { unique: true });
db.component_configs.createIndex({ appId: 1, "permissions.isPublic": 1 });
db.component_configs.createIndex({ appId: 1, "sharing.sharedWith.userId": 1 });
db.component_configs.createIndex({ tags: 1 });
db.component_configs.createIndex({ category: 1 });
db.component_configs.createIndex({ updatedAt: -1 });
```

## Implementation Examples

### DataTable with Profile Management

```typescript
interface DataTableProps {
  instanceId: string;
  data?: any[];
  columns?: ColDef[];
  showProfileManager?: boolean;
  onConfigChange?: (config: ComponentConfig) => void;
}

const DataTable: React.FC<DataTableProps> = ({ 
  instanceId, 
  data, 
  columns,
  showProfileManager = true,
  onConfigChange
}) => {
  const { config } = useComponentConfig(instanceId);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  
  // Get active version configuration
  const activeVersion = config.settings.versions[config.settings.activeVersionId];
  const versionConfig = activeVersion.config;
  
  // Apply configuration to grid
  useEffect(() => {
    if (gridApi && versionConfig) {
      // Apply column state
      if (versionConfig.columnState) {
        gridApi.applyColumnState({
          state: versionConfig.columnState,
          applyOrder: true
        });
      }
      
      // Apply filters
      if (versionConfig.filterModel) {
        gridApi.setFilterModel(versionConfig.filterModel);
      }
      
      // Apply sorts
      if (versionConfig.sortModel) {
        gridApi.setSortModel(versionConfig.sortModel);
      }
    }
  }, [gridApi, versionConfig]);
  
  const handleGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
  };
  
  const handleStateChange = useDebounce(() => {
    if (!gridApi) return;
    
    // Capture current state
    const currentState = {
      columnState: gridApi.getColumnState(),
      filterModel: gridApi.getFilterModel(),
      sortModel: gridApi.getSortModel()
    };
    
    // Update active version config
    updateVersionConfig(config, config.settings.activeVersionId, {
      ...versionConfig,
      ...currentState
    });
  }, 1000);
  
  return (
    <div className="datatable-container">
      {showProfileManager && (
        <div className="datatable-toolbar">
          <ProfileManager
            componentType="DataGrid"
            instanceId={instanceId}
            config={config}
            onConfigUpdate={onConfigChange}
            variant="inline"
          />
        </div>
      )}
      
      <div className="ag-theme-alpine" style={{ height: '100%', width: '100%' }}>
        <AgGridReact
          columnDefs={versionConfig.columns || columns}
          rowData={data}
          onGridReady={handleGridReady}
          onColumnMoved={handleStateChange}
          onColumnResized={handleStateChange}
          onColumnVisible={handleStateChange}
          onSortChanged={handleStateChange}
          onFilterChanged={handleStateChange}
          // Apply other config
          rowHeight={versionConfig.gridOptions?.rowHeight}
          headerHeight={versionConfig.gridOptions?.headerHeight}
          pagination={versionConfig.gridOptions?.pagination}
          paginationPageSize={versionConfig.gridOptions?.paginationPageSize}
        />
      </div>
    </div>
  );
};

// Export with config awareness
export default withComponentConfig(DataTable, 'DataGrid');
```

### Usage in Application

```typescript
function MyApp() {
  const currentUser = useAuth();
  
  return (
    <AppContainer appId="my-app" userId={currentUser.id}>
      <Dashboard />
    </AppContainer>
  );
}

function Dashboard() {
  return (
    <div className="dashboard-grid">
      <div className="widget">
        <h2>Sales Data</h2>
        <DataTable 
          instanceId="sales-table-main"
          data={salesData}
        />
      </div>
      
      <div className="widget">
        <h2>Inventory</h2>
        <DataTable 
          instanceId="inventory-table"
          data={inventoryData}
          showProfileManager={false} // Hide profile UI
        />
      </div>
      
      <div className="widget">
        <h2>Revenue Chart</h2>
        <Chart 
          instanceId="revenue-chart"
          data={revenueData}
        />
      </div>
    </div>
  );
}
```

### Programmatic Profile Management

```typescript
// Get profile manager for a component
const profileManager = useProfileManager('sales-table-main');

// Create new profile
const newProfile = await profileManager.createVersion(
  'Q4 Analysis View',
  'Special configuration for Q4 analysis'
);

// Switch profiles programmatically
await profileManager.activateVersion(newProfile.versionId);

// Export configuration
const exportData = await profileManager.exportConfig();
console.log('Exported config:', exportData);

// Import configuration
await profileManager.importConfig(importedData);

// Share with team
await profileManager.shareConfig(['user123', 'user456'], ['view', 'edit']);
```

## Migration Strategy

### Phase 1: Adapter Pattern Implementation
1. Create StorageAdapter interface
2. Implement LocalStorageAdapter (current functionality)
3. Add adapter support to existing stores
4. No breaking changes

### Phase 2: Schema Migration
1. Create migration utilities
2. Map old schema to new schema
3. Provide migration UI for users
4. Maintain backward compatibility

### Phase 3: Remote Storage
1. Implement MongoDBAdapter
2. Add authentication layer
3. Implement sync mechanisms
4. Add offline support

### Phase 4: Enhanced Features
1. Add sharing capabilities
2. Implement version control UI
3. Add collaborative features
4. Performance optimizations

### Migration Code Example

```typescript
// Migrate from old to new schema
async function migrateToUniversalSchema(
  oldStorage: OldStorageFormat,
  userId: string,
  appId: string
): Promise<ComponentConfig[]> {
  const configs: ComponentConfig[] = [];
  
  // Migrate profiles
  for (const profile of oldStorage.profiles) {
    const config: ComponentConfig = {
      instanceId: `migrated-${profile.id}`,
      componentType: 'DataGrid',
      subcomponentType: 'AdvancedTable',
      displayName: profile.name,
      appId,
      userId,
      ownerId: userId,
      permissions: {
        isPublic: false,
        canEdit: [],
        canView: [],
        allowSharing: false,
        editableByOthers: false
      },
      settings: {
        activeVersionId: 'v1',
        versions: {
          'v1': {
            versionId: 'v1',
            versionNumber: 1,
            name: profile.name,
            description: profile.description || 'Migrated profile',
            isActive: true,
            createdAt: new Date(profile.createdAt).toISOString(),
            createdBy: userId,
            config: {
              columnState: profile.gridState?.columnState,
              filterModel: profile.gridState?.filterModel,
              sortModel: profile.gridState?.sortModel,
              columns: profile.columnSettings?.baseColumnDefs,
              gridOptions: profile.gridOptions
            },
            audit: {
              createdBy: userId,
              createdAt: new Date(profile.createdAt).toISOString(),
              lastModifiedBy: userId,
              lastModifiedAt: new Date(profile.updatedAt).toISOString(),
              changeHistory: []
            }
          }
        }
      },
      createdAt: new Date(profile.createdAt).toISOString(),
      updatedAt: new Date(profile.updatedAt).toISOString(),
      metadata: {
        tags: ['migrated'],
        category: 'DataVisualization',
        lastAccessed: new Date().toISOString(),
        accessCount: 0,
        favorited: profile.isDefault || false,
        notes: 'Migrated from legacy profile system'
      },
      sharing: {
        isShared: false,
        sharedWith: [],
        publicAccess: {
          enabled: false,
          accessLevel: 'none',
          requiresAuth: true
        }
      }
    };
    
    configs.push(config);
  }
  
  return configs;
}
```

## Future Enhancements

### 1. Collaborative Profiles
- Real-time collaboration on configurations
- Conflict resolution for simultaneous edits
- Change notifications
- Commenting system

### 2. Profile Templates
- Organization-wide template library
- Template inheritance
- Template marketplace
- Auto-apply templates based on data patterns

### 3. Advanced Version Control
- Branch and merge configurations
- Diff viewer for versions
- Rollback with preview
- A/B testing support

### 4. Performance Optimizations
- Lazy loading of configurations
- Delta sync for large configs
- Compression for storage
- CDN support for shared configs

### 5. AI-Powered Features
- Smart configuration suggestions
- Anomaly detection in settings
- Auto-optimization based on usage
- Natural language configuration

### 6. Enhanced Security
- Encryption at rest
- Field-level permissions
- Audit log compliance
- GDPR compliance tools

### 7. Integration Ecosystem
- REST API for external access
- Webhooks for config changes
- Import from popular tools
- Export to various formats

## Conclusion

This architecture provides a robust, scalable solution for profile management across all UI components. The design prioritizes:

- **Flexibility**: Works with any component type
- **Scalability**: From localStorage to enterprise MongoDB
- **User Experience**: Consistent UI across all components
- **Developer Experience**: Simple integration with existing components
- **Future-Proof**: Extensible for new features and requirements

The phased migration approach ensures smooth transition without breaking existing functionality, while the standardized interfaces enable consistent behavior across the entire application ecosystem.