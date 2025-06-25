# Configuration Management Implementation Guide

## Overview

This guide describes the implementation of a universal configuration management system that supports multiple workspaces, components, and user-specific settings. The system is designed to be simple, flexible, and easy to integrate with any React component.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Configuration Schema](#configuration-schema)
3. [Config Service Implementation](#config-service-implementation)
4. [UI Components](#ui-components)
5. [Component Integration](#component-integration)
6. [Implementation Steps](#implementation-steps)
7. [Usage Examples](#usage-examples)
8. [Best Practices](#best-practices)

## Architecture Overview

### Hierarchy

```
App
└── AppContainer
    ├── Sidebar (workspace selector)
    └── WorkspaceManager
        └── Workspace (active)
            ├── Component A
            │   ├── Profile 1 (active)
            │   ├── Profile 2
            │   └── Profile 3
            └── Component B
                ├── Profile 1
                └── Profile 2 (active)
```

### Key Concepts

1. **Universal Config Schema**: All configuration objects (app, workspace, component, profile) share the same structure
2. **Flat Storage**: Configs are stored as individual objects with relationships via IDs
3. **React Context**: ConfigService is available to all components via React Context
4. **Simple CRUD**: Basic operations without complex abstractions

## Configuration Schema

### Core Config Interface

```typescript
interface Config {
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
  isTemplate?: boolean;      // Can be used as template
  sharedWith?: string[];     // Specific users who can access
  permissions?: 'read' | 'write' | 'admin';
  
  // Audit Fields
  createdBy: string;         // User who created
  updatedBy?: string;        // Last user to update
  creationTime: number;      // Unix timestamp
  lastUpdated?: number;      // Unix timestamp
}
```

### Example Configurations

#### Workspace Config
```typescript
{
  configId: "ws-001",
  appId: "app-main",
  userId: "user-123",
  componentType: "Workspace",
  name: "Trading Dashboard",
  description: "Main trading workspace with positions and charts",
  settings: {
    layout: { /* Dockview layout */ },
    theme: "dark",
    autoSave: true,
    refreshInterval: 5000
  },
  tags: ["trading", "main"],
  createdBy: "user-123",
  creationTime: 1703001234567
}
```

#### DataTable Component Config
```typescript
{
  configId: "dt-001",
  appId: "app-main",
  userId: "user-123",
  componentType: "DataTable",
  parentId: "ws-001",  // Belongs to workspace
  name: "Positions Table",
  activeSettingsId: "prof-001",  // Currently active profile
  settings: {
    dataSource: "positions-api",
    refreshRate: 1000,
    enableExport: true
  },
  createdBy: "user-123",
  creationTime: 1703001234567
}
```

#### DataTable Profile Config
```typescript
{
  configId: "prof-001",
  appId: "app-main",
  userId: "user-123",
  componentType: "DataTable.Profile",
  ownerId: "dt-001",  // Belongs to DataTable component
  name: "Compact View",
  description: "Minimal columns for quick overview",
  settings: {
    columnDefs: [
      { field: "symbol", width: 100 },
      { field: "position", width: 120 },
      { field: "pnl", cellClass: "pnl-cell" }
    ],
    rowHeight: 28,
    pagination: false
  },
  isTemplate: true,  // Can be used by others
  createdBy: "user-123",
  creationTime: 1703001234567
}
```

## Config Service Implementation

### TypeScript Interfaces

```typescript
// config-service.types.ts
interface ConfigFilter {
  userId?: string;
  componentType?: string;
  subComponentType?: string;
  parentId?: string;
  ownerId?: string;
  tags?: string[];
  isPublic?: boolean;
  isTemplate?: boolean;
}

interface ConfigService {
  // Basic CRUD
  save: (config: Config) => Promise<void>;
  get: (id: string) => Promise<Config | null>;
  update: (id: string, updates: Partial<Config>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  
  // Queries
  list: (filter?: ConfigFilter) => Promise<Config[]>;
  
  // Bulk operations
  saveMany: (configs: Config[]) => Promise<void>;
  deleteMany: (ids: string[]) => Promise<void>;
}
```

### React Context Setup

```typescript
// config-context.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

const ConfigContext = createContext<ConfigService | null>(null);

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
};

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  
  // Initialize IndexedDB
  useEffect(() => {
    const request = indexedDB.open('ConfigDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('configs')) {
        const store = db.createObjectStore('configs', { keyPath: 'configId' });
        
        // Create indexes for efficient queries
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('componentType', 'componentType', { unique: false });
        store.createIndex('parentId', 'parentId', { unique: false });
        store.createIndex('ownerId', 'ownerId', { unique: false });
        store.createIndex('userComponent', ['userId', 'componentType'], { unique: false });
      }
    };
    
    request.onsuccess = () => {
      setDb(request.result);
    };
    
    request.onerror = () => {
      console.error('Failed to open IndexedDB');
    };
  }, []);
  
  // Service implementation
  const service: ConfigService = {
    save: async (config) => {
      if (!db) throw new Error('Database not initialized');
      
      const tx = db.transaction(['configs'], 'readwrite');
      const store = tx.objectStore('configs');
      
      // Add timestamp
      config.lastUpdated = Date.now();
      
      await store.put(config);
      await tx.complete;
    },
    
    get: async (id) => {
      if (!db) return null;
      
      const tx = db.transaction(['configs'], 'readonly');
      const store = tx.objectStore('configs');
      
      return store.get(id);
    },
    
    update: async (id, updates) => {
      if (!db) throw new Error('Database not initialized');
      
      const existing = await service.get(id);
      if (!existing) throw new Error('Config not found');
      
      const updated = {
        ...existing,
        ...updates,
        lastUpdated: Date.now()
      };
      
      await service.save(updated);
    },
    
    delete: async (id) => {
      if (!db) throw new Error('Database not initialized');
      
      const tx = db.transaction(['configs'], 'readwrite');
      const store = tx.objectStore('configs');
      
      await store.delete(id);
      await tx.complete;
    },
    
    list: async (filter) => {
      if (!db) return [];
      
      const tx = db.transaction(['configs'], 'readonly');
      const store = tx.objectStore('configs');
      
      // Get all configs and filter in memory
      // (IndexedDB doesn't support complex queries)
      const allConfigs = await store.getAll();
      
      if (!filter) return allConfigs;
      
      return allConfigs.filter(config => {
        if (filter.userId && config.userId !== filter.userId) return false;
        if (filter.componentType && config.componentType !== filter.componentType) return false;
        if (filter.parentId && config.parentId !== filter.parentId) return false;
        if (filter.ownerId && config.ownerId !== filter.ownerId) return false;
        if (filter.isPublic !== undefined && config.isPublic !== filter.isPublic) return false;
        if (filter.isTemplate !== undefined && config.isTemplate !== filter.isTemplate) return false;
        if (filter.tags && !filter.tags.some(tag => config.tags?.includes(tag))) return false;
        
        return true;
      });
    },
    
    saveMany: async (configs) => {
      if (!db) throw new Error('Database not initialized');
      
      const tx = db.transaction(['configs'], 'readwrite');
      const store = tx.objectStore('configs');
      
      for (const config of configs) {
        config.lastUpdated = Date.now();
        await store.put(config);
      }
      
      await tx.complete;
    },
    
    deleteMany: async (ids) => {
      if (!db) throw new Error('Database not initialized');
      
      const tx = db.transaction(['configs'], 'readwrite');
      const store = tx.objectStore('configs');
      
      for (const id of ids) {
        await store.delete(id);
      }
      
      await tx.complete;
    }
  };
  
  if (!db) {
    return <div>Loading configuration service...</div>;
  }
  
  return (
    <ConfigContext.Provider value={service}>
      {children}
    </ConfigContext.Provider>
  );
};
```

## UI Components

### ProfileManager Component

```typescript
// components/ProfileManager.tsx
import React, { useState, useEffect } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Save, MoreVertical, Copy, Edit, Trash } from 'lucide-react';
import { useConfig } from '../config-context';
import { SaveProfileDialog } from './SaveProfileDialog';

interface ProfileManagerProps {
  componentId: string;
  componentType: string;
  currentSettings: any;
  onSettingsChange: (settings: any) => void;
  renderPreview?: (settings: any) => React.ReactNode;
}

export function ProfileManager({
  componentId,
  componentType,
  currentSettings,
  onSettingsChange,
  renderPreview
}: ProfileManagerProps) {
  const config = useConfig();
  const [profiles, setProfiles] = useState<Config[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load profiles
  useEffect(() => {
    loadProfiles();
  }, [componentId]);
  
  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      const profileList = await config.list({
        ownerId: componentId,
        componentType: `${componentType}.Profile`
      });
      setProfiles(profileList);
      
      // Set active profile from component config
      const componentConfig = await config.get(componentId);
      if (componentConfig?.activeSettingsId) {
        setActiveProfileId(componentConfig.activeSettingsId);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleProfileChange = async (profileId: string) => {
    const profile = profiles.find(p => p.configId === profileId);
    if (!profile) return;
    
    // Update component's active profile
    await config.update(componentId, {
      activeSettingsId: profileId
    });
    
    setActiveProfileId(profileId);
    onSettingsChange(profile.settings);
  };
  
  const handleSaveProfile = async (name: string, description?: string) => {
    const newProfile: Config = {
      configId: `prof-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      appId: 'app-main', // Should come from context
      userId: 'current-user', // Should come from auth context
      componentType: `${componentType}.Profile`,
      ownerId: componentId,
      name,
      description,
      settings: currentSettings,
      createdBy: 'current-user',
      creationTime: Date.now()
    };
    
    await config.save(newProfile);
    await loadProfiles();
    
    // Auto-select new profile
    await handleProfileChange(newProfile.configId);
    setShowSaveDialog(false);
  };
  
  const handleDuplicate = async () => {
    const activeProfile = profiles.find(p => p.configId === activeProfileId);
    if (!activeProfile) return;
    
    const duplicate: Config = {
      ...activeProfile,
      configId: `prof-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${activeProfile.name} (Copy)`,
      creationTime: Date.now(),
      createdBy: 'current-user'
    };
    
    await config.save(duplicate);
    await loadProfiles();
  };
  
  const handleRename = async () => {
    // In real implementation, show a rename dialog
    const newName = prompt('Enter new name:');
    if (!newName) return;
    
    await config.update(activeProfileId, { name: newName });
    await loadProfiles();
  };
  
  const handleDelete = async () => {
    if (!confirm('Delete this profile?')) return;
    
    await config.delete(activeProfileId);
    await loadProfiles();
    
    // Select first available profile
    if (profiles.length > 1) {
      const remaining = profiles.filter(p => p.configId !== activeProfileId);
      await handleProfileChange(remaining[0].configId);
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <Select 
        value={activeProfileId} 
        onValueChange={handleProfileChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select profile" />
        </SelectTrigger>
        <SelectContent>
          {profiles.map(profile => (
            <SelectItem key={profile.configId} value={profile.configId}>
              <div>
                <div className="font-medium">{profile.name}</div>
                {profile.description && (
                  <div className="text-xs text-muted-foreground">
                    {profile.description}
                  </div>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button 
        size="icon" 
        variant="ghost"
        onClick={() => setShowSaveDialog(true)}
        title="Save current settings as new profile"
      >
        <Save className="h-4 w-4" />
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRename}>
            <Edit className="mr-2 h-4 w-4" />
            Rename Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleDelete}
            className="text-destructive"
            disabled={profiles.length <= 1}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete Profile
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <SaveProfileDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleSaveProfile}
        preview={renderPreview?.(currentSettings)}
      />
    </div>
  );
}
```

### SaveProfileDialog Component

```typescript
// components/SaveProfileDialog.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SaveProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, description?: string) => void;
  preview?: React.ReactNode;
}

export function SaveProfileDialog({
  open,
  onOpenChange,
  onSave,
  preview
}: SaveProfileDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  const handleSave = () => {
    if (!name.trim()) return;
    
    onSave(name.trim(), description.trim() || undefined);
    
    // Reset form
    setName('');
    setDescription('');
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Profile</DialogTitle>
          <DialogDescription>
            Save the current configuration as a reusable profile.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">
              Profile Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Trading Desk View"
              autoFocus
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when to use this profile..."
              rows={3}
            />
          </div>
          
          {preview && (
            <div className="rounded-md border p-3 bg-muted/50">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Preview
              </Label>
              {preview}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Component Integration

### Making a Component Profile-Enabled

To integrate the configuration system with your components, follow this pattern:

```typescript
// Example: DataTable Integration
import React, { useRef, useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ProfileManager } from '@/components/ProfileManager';
import { useConfig } from '@/config-context';

interface DataTableProps {
  id: string;
}

export function DataTable({ id }: DataTableProps) {
  const gridRef = useRef<AgGridReact>(null);
  const config = useConfig();
  const [isReady, setIsReady] = useState(false);
  
  // Get current settings from AG-Grid
  const getCurrentSettings = () => {
    if (!gridRef.current?.api) return {};
    
    return {
      columnState: gridRef.current.api.getColumnState(),
      filterModel: gridRef.current.api.getFilterModel(),
      sortModel: gridRef.current.api.getSortModel(),
      // Add any other AG-Grid state you want to save
    };
  };
  
  // Apply settings to AG-Grid
  const applySettings = (settings: any) => {
    if (!gridRef.current?.api) return;
    
    if (settings.columnState) {
      gridRef.current.api.applyColumnState({ 
        state: settings.columnState,
        applyOrder: true
      });
    }
    
    if (settings.filterModel) {
      gridRef.current.api.setFilterModel(settings.filterModel);
    }
    
    if (settings.sortModel) {
      gridRef.current.api.applyColumnState({
        state: settings.columnState,
        defaultState: { sort: null }
      });
    }
  };
  
  // Load initial configuration
  useEffect(() => {
    loadInitialConfig();
  }, [id]);
  
  const loadInitialConfig = async () => {
    const componentConfig = await config.get(id);
    if (!componentConfig) return;
    
    // If there's an active profile, load it
    if (componentConfig.activeSettingsId) {
      const profile = await config.get(componentConfig.activeSettingsId);
      if (profile) {
        applySettings(profile.settings);
      }
    }
  };
  
  const onGridReady = () => {
    setIsReady(true);
    loadInitialConfig();
  };
  
  // Preview for save dialog
  const renderSettingsPreview = (settings: any) => (
    <div className="text-sm space-y-1">
      <div>Columns: {settings.columnState?.length || 0}</div>
      <div>Filters: {Object.keys(settings.filterModel || {}).length}</div>
      <div>Sorts: {settings.sortModel?.length || 0}</div>
    </div>
  );
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <h3 className="font-semibold">Data Table</h3>
        
        {isReady && (
          <ProfileManager
            componentId={id}
            componentType="DataTable"
            currentSettings={getCurrentSettings()}
            onSettingsChange={applySettings}
            renderPreview={renderSettingsPreview}
          />
        )}
      </div>
      
      <div className="flex-1">
        <AgGridReact
          ref={gridRef}
          onGridReady={onGridReady}
          // ... other AG-Grid props
        />
      </div>
    </div>
  );
}
```

### Workspace Integration

```typescript
// Example: Workspace with multiple components
import React, { useEffect, useState } from 'react';
import { useConfig } from '@/config-context';
import { DataTable } from './DataTable';
import { Chart } from './Chart';

interface WorkspaceProps {
  workspaceId: string;
}

export function Workspace({ workspaceId }: WorkspaceProps) {
  const config = useConfig();
  const [components, setComponents] = useState<Config[]>([]);
  
  useEffect(() => {
    loadComponents();
  }, [workspaceId]);
  
  const loadComponents = async () => {
    const componentList = await config.list({
      parentId: workspaceId,
      componentType: ['DataTable', 'Chart'] // Load multiple types
    });
    setComponents(componentList);
  };
  
  const addComponent = async (type: string) => {
    const newComponent: Config = {
      configId: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      appId: 'app-main',
      userId: 'current-user',
      componentType: type,
      parentId: workspaceId,
      name: `New ${type}`,
      settings: {},
      createdBy: 'current-user',
      creationTime: Date.now()
    };
    
    await config.save(newComponent);
    
    // Create default profile
    const defaultProfile: Config = {
      configId: `prof-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      appId: 'app-main',
      userId: 'current-user',
      componentType: `${type}.Profile`,
      ownerId: newComponent.configId,
      name: 'Default',
      settings: getDefaultSettings(type),
      createdBy: 'current-user',
      creationTime: Date.now()
    };
    
    await config.save(defaultProfile);
    
    // Update component with active profile
    await config.update(newComponent.configId, {
      activeSettingsId: defaultProfile.configId
    });
    
    await loadComponents();
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b flex gap-2">
        <button onClick={() => addComponent('DataTable')}>
          Add Table
        </button>
        <button onClick={() => addComponent('Chart')}>
          Add Chart
        </button>
      </div>
      
      <div className="flex-1 grid grid-cols-2 gap-4 p-4">
        {components.map(component => {
          switch (component.componentType) {
            case 'DataTable':
              return <DataTable key={component.configId} id={component.configId} />;
            case 'Chart':
              return <Chart key={component.configId} id={component.configId} />;
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
```

## Implementation Steps

### Phase 1: Core Infrastructure (Week 1)

1. **Set up Config types and interfaces**
   ```bash
   src/config/
   ├── types.ts          # Config interface and related types
   ├── context.tsx       # ConfigContext and Provider
   └── utils.ts          # Helper functions (generateId, etc.)
   ```

2. **Implement ConfigService with IndexedDB**
   - Basic CRUD operations
   - Query functionality
   - Error handling

3. **Create test harness**
   - Unit tests for ConfigService
   - Integration tests with IndexedDB

### Phase 2: UI Components (Week 2)

1. **Build reusable components**
   ```bash
   src/components/config/
   ├── ProfileManager.tsx
   ├── SaveProfileDialog.tsx
   ├── ProfileSelector.tsx
   └── SettingsEditor.tsx
   ```

2. **Create Storybook stories**
   - Document component props
   - Show usage examples

### Phase 3: Component Integration (Week 3)

1. **Update DataTable**
   - Add ProfileManager
   - Implement getCurrentSettings/applySettings
   - Test profile switching

2. **Update other components**
   - Follow same pattern
   - Ensure consistency

3. **Update Workspace**
   - Add component management
   - Implement layout persistence

### Phase 4: Advanced Features (Week 4)

1. **Sharing functionality**
   - Add share dialog
   - Implement permissions

2. **Template system**
   - Create template library
   - Add import/export

3. **Performance optimization**
   - Add caching layer
   - Optimize queries

## Usage Examples

### Creating a New Workspace

```typescript
const createWorkspace = async (name: string) => {
  const workspace: Config = {
    configId: generateId(),
    appId: 'app-main',
    userId: currentUser.id,
    componentType: 'Workspace',
    name,
    settings: {
      layout: null,
      theme: 'light',
      autoSave: true
    },
    createdBy: currentUser.id,
    creationTime: Date.now()
  };
  
  await config.save(workspace);
  return workspace.configId;
};
```

### Sharing a Profile

```typescript
const shareProfile = async (profileId: string, userIds: string[]) => {
  await config.update(profileId, {
    isPublic: false,
    sharedWith: userIds,
    permissions: 'read'
  });
};
```

### Finding Templates

```typescript
const getTemplates = async (componentType: string) => {
  return config.list({
    componentType: `${componentType}.Profile`,
    isTemplate: true
  });
};
```

### Duplicating a Workspace

```typescript
const duplicateWorkspace = async (workspaceId: string) => {
  // Get workspace and all its components
  const workspace = await config.get(workspaceId);
  const components = await config.list({ parentId: workspaceId });
  
  // Create new workspace
  const newWorkspace = {
    ...workspace,
    configId: generateId(),
    name: `${workspace.name} (Copy)`,
    creationTime: Date.now()
  };
  
  await config.save(newWorkspace);
  
  // Copy all components
  for (const component of components) {
    const profiles = await config.list({ ownerId: component.configId });
    
    // Create new component
    const newComponent = {
      ...component,
      configId: generateId(),
      parentId: newWorkspace.configId,
      creationTime: Date.now()
    };
    
    await config.save(newComponent);
    
    // Copy profiles
    for (const profile of profiles) {
      const newProfile = {
        ...profile,
        configId: generateId(),
        ownerId: newComponent.configId,
        creationTime: Date.now()
      };
      
      await config.save(newProfile);
      
      // Update active profile reference
      if (component.activeSettingsId === profile.configId) {
        await config.update(newComponent.configId, {
          activeSettingsId: newProfile.configId
        });
      }
    }
  }
  
  return newWorkspace.configId;
};
```

## Best Practices

### 1. ID Generation
```typescript
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
```

### 2. Type Safety
```typescript
// Use type guards
const isWorkspaceConfig = (config: Config): boolean => {
  return config.componentType === 'Workspace';
};

// Use enums for component types
enum ComponentType {
  App = 'App',
  Workspace = 'Workspace',
  DataTable = 'DataTable',
  Chart = 'Chart'
}
```

### 3. Error Handling
```typescript
const safeConfigOperation = async (operation: () => Promise<void>) => {
  try {
    await operation();
  } catch (error) {
    console.error('Config operation failed:', error);
    toast.error('Failed to save configuration');
  }
};
```

### 4. Performance
- Use indexes for common queries
- Batch operations when possible
- Implement pagination for large lists
- Cache frequently accessed configs

### 5. Security
- Validate user permissions before operations
- Sanitize user input in names/descriptions
- Don't expose internal IDs to users
- Implement proper access control

## Migration Strategy

If you have existing configurations:

```typescript
const migrateOldConfigs = async () => {
  // Get old configs from localStorage
  const oldWorkspace = localStorage.getItem('workspace-v2');
  if (!oldWorkspace) return;
  
  const data = JSON.parse(oldWorkspace);
  
  // Convert to new format
  const workspace: Config = {
    configId: generateId(),
    appId: 'app-main',
    userId: 'current-user',
    componentType: 'Workspace',
    name: 'Migrated Workspace',
    settings: data,
    createdBy: 'migration',
    creationTime: Date.now()
  };
  
  await config.save(workspace);
  
  // Mark as migrated
  localStorage.setItem('workspace-migrated', 'true');
};
```

## Conclusion

This configuration management system provides:

1. **Flexibility**: Any component can save any structure
2. **Consistency**: Unified schema across all configs
3. **Simplicity**: No complex abstractions
4. **Scalability**: Works for single user or enterprise
5. **Shareability**: Built-in sharing and templates

The key is keeping the service simple while allowing components to manage their own complexity.