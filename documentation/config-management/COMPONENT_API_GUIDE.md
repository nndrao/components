# Component API Implementation Guide

## Overview

This guide explains how to expose methods from React functional components to enable parent components (like Workspace) to interact with child components programmatically. This is essential for operations like "Save All", "Reset All", or validating all components before saving a workspace.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Standard Component Interface](#standard-component-interface)
3. [Basic Implementation](#basic-implementation)
4. [Workspace Integration](#workspace-integration)
5. [Advanced Patterns](#advanced-patterns)
6. [Best Practices](#best-practices)
7. [Complete Examples](#complete-examples)
8. [Testing](#testing)
9. [Migration Guide](#migration-guide)
10. [Troubleshooting](#troubleshooting)

## Core Concepts

### forwardRef

`forwardRef` allows functional components to receive a ref that can be passed from parent components.

```typescript
const MyComponent = forwardRef((props, ref) => {
  // Component implementation
  return <div>Content</div>;
});
```

### useImperativeHandle

`useImperativeHandle` customizes the instance value that is exposed to parent components when using ref.

```typescript
useImperativeHandle(ref, () => ({
  myMethod: () => {
    console.log('Method called from parent');
  }
}), [dependencies]);
```

## Standard Component Interface

### 1. Type Definitions

```typescript
// types/component-api.types.ts

/**
 * Standard API that all configurable components must implement
 */
export interface ComponentAPI {
  // Identity
  getId: () => string;
  getType: () => string;
  
  // Settings Management
  getCurrentSettings: () => any;
  applySettings: (settings: any) => void;
  
  // Profile Management
  getActiveProfileId: () => string | null;
  setActiveProfile: (profileId: string) => Promise<void>;
  
  // State Management
  isDirty: () => boolean;
  isReady: () => boolean;
  
  // Optional Methods
  validate?: () => ValidationResult;
  reset?: () => void;
  refresh?: () => Promise<void>;
  getMetadata?: () => ComponentMetadata;
}

/**
 * Standard props that all configurable components should accept
 */
export interface ConfigurableComponentProps {
  id: string;
  
  // Lifecycle callbacks
  onReady?: (api: ComponentAPI) => void;
  onSettingsChange?: (settings: any) => void;
  onError?: (error: Error) => void;
  
  // Initial state
  initialSettings?: any;
  initialProfileId?: string;
  
  // Configuration
  readOnly?: boolean;
  autoSave?: boolean;
}

/**
 * Validation result structure
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Component metadata for debugging and display
 */
export interface ComponentMetadata {
  version: string;
  capabilities: string[];
  lastModified?: number;
  [key: string]: any;
}
```

### 2. Generic Component Type

```typescript
// types/component-api.types.ts

/**
 * Generic type for components with API
 */
export type ConfigurableComponent<P = {}> = React.ForwardRefExoticComponent<
  ConfigurableComponentProps & P & React.RefAttributes<ComponentAPI>
>;
```

## Basic Implementation

### 1. Simple Component with API

```typescript
// components/DataTable.tsx
import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ComponentAPI, ConfigurableComponentProps } from '@/types/component-api';

interface DataTableProps extends ConfigurableComponentProps {
  // Additional DataTable-specific props
  dataSource?: string;
  pageSize?: number;
}

export const DataTable = forwardRef<ComponentAPI, DataTableProps>(
  ({ id, onReady, onSettingsChange, initialSettings, readOnly = false }, ref) => {
    // Component state
    const gridRef = useRef<AgGridReact>(null);
    const [isReady, setIsReady] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
    
    // Helper functions
    const getCurrentSettings = () => {
      if (!gridRef.current?.api) return {};
      
      return {
        columnState: gridRef.current.api.getColumnState(),
        filterModel: gridRef.current.api.getFilterModel(),
        sortModel: gridRef.current.api.getSortModel(),
        // Add any other relevant state
      };
    };
    
    const applySettings = (settings: any) => {
      if (!gridRef.current?.api || readOnly) return;
      
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
        // Apply sort model
      }
      
      setIsDirty(false);
    };
    
    // Expose API through ref
    useImperativeHandle(ref, () => ({
      // Identity
      getId: () => id,
      getType: () => 'DataTable',
      
      // Settings
      getCurrentSettings,
      applySettings,
      
      // Profile management
      getActiveProfileId: () => activeProfileId,
      setActiveProfile: async (profileId: string) => {
        // Load and apply profile
        const profile = await config.get(profileId);
        if (profile?.settings) {
          applySettings(profile.settings);
          setActiveProfileId(profileId);
        }
      },
      
      // State
      isDirty: () => isDirty,
      isReady: () => isReady,
      
      // Optional methods
      validate: () => {
        const errors: string[] = [];
        
        // Perform validation
        if (!gridRef.current?.api.getDisplayedRowCount()) {
          errors.push('No data loaded');
        }
        
        return { 
          valid: errors.length === 0, 
          errors 
        };
      },
      
      reset: () => {
        if (initialSettings) {
          applySettings(initialSettings);
        }
      },
      
      refresh: async () => {
        // Refresh data
        await loadData();
      },
      
      getMetadata: () => ({
        version: '1.0.0',
        capabilities: ['sort', 'filter', 'export'],
        rowCount: gridRef.current?.api.getDisplayedRowCount() || 0
      })
    }), [id, isReady, isDirty, activeProfileId, initialSettings]);
    
    // Notify parent when ready
    useEffect(() => {
      if (isReady && onReady && ref && 'current' in ref) {
        onReady(ref.current!);
      }
    }, [isReady, onReady, ref]);
    
    // Apply initial settings
    useEffect(() => {
      if (isReady && initialSettings) {
        applySettings(initialSettings);
      }
    }, [isReady]);
    
    // Track changes
    const handleGridChange = () => {
      if (!readOnly) {
        setIsDirty(true);
        if (onSettingsChange) {
          onSettingsChange(getCurrentSettings());
        }
      }
    };
    
    // Grid ready handler
    const handleGridReady = () => {
      setIsReady(true);
    };
    
    const loadData = async () => {
      // Load data implementation
    };
    
    return (
      <div className="datatable-container h-full flex flex-col">
        <div className="toolbar p-2 border-b">
          <ProfileManager
            componentId={id}
            componentType="DataTable"
            currentSettings={getCurrentSettings()}
            onSettingsChange={applySettings}
            disabled={readOnly}
          />
        </div>
        
        <div className="flex-1">
          <AgGridReact
            ref={gridRef}
            onGridReady={handleGridReady}
            onColumnMoved={handleGridChange}
            onColumnResized={handleGridChange}
            onFilterChanged={handleGridChange}
            onSortChanged={handleGridChange}
            // ... other AG-Grid props
          />
        </div>
      </div>
    );
  }
);

DataTable.displayName = 'DataTable';
```

### 2. Creating Multiple Component Types

```typescript
// components/Chart.tsx
export const Chart = forwardRef<ComponentAPI, ChartProps>(
  ({ id, onReady, onSettingsChange, initialSettings }, ref) => {
    const [chartConfig, setChartConfig] = useState({
      type: 'line',
      dataKey: 'value',
      // ... other chart settings
    });
    
    useImperativeHandle(ref, () => ({
      getId: () => id,
      getType: () => 'Chart',
      
      getCurrentSettings: () => chartConfig,
      
      applySettings: (settings: any) => {
        setChartConfig(settings);
      },
      
      // ... implement other required methods
    }), [id, chartConfig]);
    
    // ... rest of implementation
  }
);

// components/Filter.tsx
export const Filter = forwardRef<ComponentAPI, FilterProps>(
  ({ id, onReady, onSettingsChange }, ref) => {
    // Similar implementation pattern
  }
);
```

## Workspace Integration

### 1. Workspace Component with Ref Management

```typescript
// components/Workspace.tsx
import React, { useRef, useState, useCallback } from 'react';
import { ComponentAPI, ConfigurableComponentProps } from '@/types/component-api';
import { useConfig } from '@/hooks/useConfig';

interface WorkspaceProps {
  workspaceId: string;
}

export function Workspace({ workspaceId }: WorkspaceProps) {
  const config = useConfig();
  const componentRefs = useRef<Map<string, ComponentAPI>>(new Map());
  const [components, setComponents] = useState<Config[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Register component API when ready
  const handleComponentReady = useCallback((componentId: string) => {
    return (api: ComponentAPI) => {
      console.log(`Component ${componentId} ready`);
      componentRefs.current.set(componentId, api);
    };
  }, []);
  
  // Save all components
  const saveWorkspace = async () => {
    setIsSaving(true);
    
    try {
      // Validate all components first
      const validationErrors: Record<string, string[]> = {};
      
      componentRefs.current.forEach((api, id) => {
        if (api.validate) {
          const result = api.validate();
          if (!result.valid && result.errors) {
            validationErrors[id] = result.errors;
          }
        }
      });
      
      if (Object.keys(validationErrors).length > 0) {
        console.error('Validation errors:', validationErrors);
        toast.error('Please fix validation errors before saving');
        return;
      }
      
      // Collect all component settings
      const componentStates: Record<string, any> = {};
      
      componentRefs.current.forEach((api, id) => {
        componentStates[id] = {
          type: api.getType(),
          settings: api.getCurrentSettings(),
          profileId: api.getActiveProfileId(),
          metadata: api.getMetadata?.()
        };
      });
      
      // Save workspace configuration
      await config.update(workspaceId, {
        settings: {
          componentStates,
          layout: getDockviewLayout(), // Get current layout
          savedAt: Date.now()
        }
      });
      
      // Mark all components as clean
      componentRefs.current.forEach(api => {
        if (api.reset) {
          // This should clear the dirty flag
          const currentSettings = api.getCurrentSettings();
          api.applySettings(currentSettings);
        }
      });
      
      toast.success('Workspace saved successfully');
    } catch (error) {
      console.error('Failed to save workspace:', error);
      toast.error('Failed to save workspace');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Check if any component has unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    for (const [_, api] of componentRefs.current) {
      if (api.isDirty()) return true;
    }
    return false;
  }, []);
  
  // Reset all components
  const resetAllComponents = () => {
    componentRefs.current.forEach(api => {
      api.reset?.();
    });
  };
  
  // Refresh all components
  const refreshAllComponents = async () => {
    const refreshPromises: Promise<void>[] = [];
    
    componentRefs.current.forEach(api => {
      if (api.refresh) {
        refreshPromises.push(api.refresh());
      }
    });
    
    await Promise.all(refreshPromises);
  };
  
  // Create component element with ref
  const createComponentElement = (config: Config) => {
    const Component = getComponentByType(config.componentType);
    
    if (!Component) {
      console.error(`Unknown component type: ${config.componentType}`);
      return null;
    }
    
    return (
      <Component
        key={config.configId}
        ref={(api: ComponentAPI | null) => {
          if (api) {
            componentRefs.current.set(config.configId, api);
          } else {
            componentRefs.current.delete(config.configId);
          }
        }}
        id={config.configId}
        onReady={handleComponentReady(config.configId)}
        onSettingsChange={() => {
          // Could trigger auto-save or update UI
          forceUpdate();
        }}
        initialSettings={config.settings}
        initialProfileId={config.activeSettingsId}
      />
    );
  };
  
  // Component registry
  const getComponentByType = (type: string): React.ComponentType<any> | null => {
    switch (type) {
      case 'DataTable':
        return DataTable;
      case 'Chart':
        return Chart;
      case 'Filter':
        return Filter;
      default:
        return null;
    }
  };
  
  // Load workspace configuration
  useEffect(() => {
    loadWorkspace();
  }, [workspaceId]);
  
  const loadWorkspace = async () => {
    const workspace = await config.get(workspaceId);
    if (!workspace) return;
    
    // Load components
    const componentList = await config.list({
      parentId: workspaceId
    });
    
    setComponents(componentList);
  };
  
  // Prevent navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
  
  return (
    <div className="workspace h-full flex flex-col">
      <div className="workspace-header p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold">Workspace</h2>
        
        <div className="flex gap-2">
          <Button
            onClick={refreshAllComponents}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
          
          <Button
            onClick={resetAllComponents}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All
          </Button>
          
          <Button
            onClick={saveWorkspace}
            variant={hasUnsavedChanges() ? "default" : "outline"}
            size="sm"
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Workspace'}
          </Button>
        </div>
      </div>
      
      <div className="workspace-content flex-1">
        <DockviewReact
          onReady={onDockviewReady}
          components={componentMap}
        >
          {components.map(createComponentElement)}
        </DockviewReact>
      </div>
      
      {hasUnsavedChanges() && (
        <div className="workspace-footer p-2 bg-yellow-50 dark:bg-yellow-900/20 border-t">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            You have unsaved changes
          </p>
        </div>
      )}
    </div>
  );
}
```

### 2. Component Factory Pattern

```typescript
// utils/component-factory.ts
import { ComponentType } from 'react';
import { ConfigurableComponent } from '@/types/component-api';
import { DataTable } from '@/components/DataTable';
import { Chart } from '@/components/Chart';
import { Filter } from '@/components/Filter';

// Component registry
const componentRegistry = new Map<string, ConfigurableComponent>();

// Register components
componentRegistry.set('DataTable', DataTable);
componentRegistry.set('Chart', Chart);
componentRegistry.set('Filter', Filter);

// Factory function
export function getComponentByType(type: string): ConfigurableComponent | null {
  return componentRegistry.get(type) || null;
}

// Register new component type
export function registerComponent(type: string, component: ConfigurableComponent) {
  componentRegistry.set(type, component);
}

// Get all registered types
export function getRegisteredTypes(): string[] {
  return Array.from(componentRegistry.keys());
}
```

## Advanced Patterns

### 1. Auto-Save Hook

```typescript
// hooks/useAutoSave.ts
export function useAutoSave(
  componentRefs: React.MutableRefObject<Map<string, ComponentAPI>>,
  saveFunction: () => Promise<void>,
  options: {
    interval?: number;
    enabled?: boolean;
    debounce?: number;
  } = {}
) {
  const { interval = 30000, enabled = true, debounce = 1000 } = options;
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout>();
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  
  // Debounced save
  const debouncedSave = useCallback(() => {
    clearTimeout(debounceTimerRef.current);
    
    debounceTimerRef.current = setTimeout(async () => {
      if (!enabled || isSaving) return;
      
      // Check if any component is dirty
      const hasDirty = Array.from(componentRefs.current.values())
        .some(api => api.isDirty());
      
      if (hasDirty) {
        setIsSaving(true);
        try {
          await saveFunction();
          setLastSaved(new Date());
        } finally {
          setIsSaving(false);
        }
      }
    }, debounce);
  }, [enabled, isSaving, saveFunction, debounce]);
  
  // Periodic save
  useEffect(() => {
    if (!enabled) return;
    
    saveTimerRef.current = setInterval(debouncedSave, interval);
    
    return () => {
      clearInterval(saveTimerRef.current);
      clearTimeout(debounceTimerRef.current);
    };
  }, [enabled, interval, debouncedSave]);
  
  return {
    lastSaved,
    isSaving,
    triggerSave: debouncedSave
  };
}

// Usage in Workspace
function Workspace() {
  const componentRefs = useRef<Map<string, ComponentAPI>>(new Map());
  
  const { lastSaved, isSaving } = useAutoSave(
    componentRefs,
    saveWorkspace,
    { enabled: true, interval: 60000 }
  );
  
  // ... rest of component
}
```

### 2. Bulk Operations Manager

```typescript
// utils/bulk-operations.ts
export class BulkOperationsManager {
  constructor(private componentRefs: Map<string, ComponentAPI>) {}
  
  // Validate all components
  async validateAll(): Promise<Record<string, ValidationResult>> {
    const results: Record<string, ValidationResult> = {};
    
    for (const [id, api] of this.componentRefs) {
      if (api.validate) {
        results[id] = api.validate();
      }
    }
    
    return results;
  }
  
  // Get all dirty components
  getDirtyComponents(): string[] {
    return Array.from(this.componentRefs.entries())
      .filter(([_, api]) => api.isDirty())
      .map(([id, _]) => id);
  }
  
  // Save all dirty components
  async saveAll(
    saveFunction: (id: string, settings: any) => Promise<void>
  ): Promise<void> {
    const dirtyComponents = this.getDirtyComponents();
    
    await Promise.all(
      dirtyComponents.map(id => {
        const api = this.componentRefs.get(id)!;
        return saveFunction(id, api.getCurrentSettings());
      })
    );
  }
  
  // Reset all components
  resetAll(): void {
    this.componentRefs.forEach(api => api.reset?.());
  }
  
  // Export all settings
  exportAll(): Record<string, any> {
    const exports: Record<string, any> = {};
    
    this.componentRefs.forEach((api, id) => {
      exports[id] = {
        type: api.getType(),
        settings: api.getCurrentSettings(),
        metadata: api.getMetadata?.()
      };
    });
    
    return exports;
  }
}
```

### 3. Component Communication

```typescript
// hooks/useComponentCommunication.ts
export function useComponentCommunication() {
  const eventEmitter = useRef(new EventEmitter());
  
  const sendMessage = (
    targetId: string,
    message: { type: string; payload?: any }
  ) => {
    eventEmitter.current.emit(`component:${targetId}`, message);
  };
  
  const broadcast = (message: { type: string; payload?: any }) => {
    eventEmitter.current.emit('component:broadcast', message);
  };
  
  const subscribe = (
    componentId: string,
    handler: (message: any) => void
  ) => {
    eventEmitter.current.on(`component:${componentId}`, handler);
    eventEmitter.current.on('component:broadcast', handler);
    
    return () => {
      eventEmitter.current.off(`component:${componentId}`, handler);
      eventEmitter.current.off('component:broadcast', handler);
    };
  };
  
  return { sendMessage, broadcast, subscribe };
}

// Usage in component
function DataTable({ id, onReady }: DataTableProps) {
  const { subscribe, broadcast } = useComponentCommunication();
  
  useEffect(() => {
    return subscribe(id, (message) => {
      if (message.type === 'refresh') {
        refresh();
      } else if (message.type === 'filter') {
        applyFilter(message.payload);
      }
    });
  }, [id]);
  
  const handleFilterChange = (filter: any) => {
    // Broadcast filter change to other components
    broadcast({
      type: 'filterChanged',
      payload: { componentId: id, filter }
    });
  };
}
```

## Best Practices

### 1. Type Safety

Always define proper TypeScript interfaces:

```typescript
// ❌ Bad - using any
useImperativeHandle(ref, () => ({
  getSettings: () => any
}));

// ✅ Good - properly typed
interface DataTableSettings {
  columns: ColumnState[];
  filters: FilterModel;
}

useImperativeHandle(ref, () => ({
  getSettings: (): DataTableSettings => ({
    columns: getColumnState(),
    filters: getFilterModel()
  })
}));
```

### 2. Dependency Arrays

Include all dependencies in useImperativeHandle:

```typescript
// ❌ Bad - missing dependencies
useImperativeHandle(ref, () => ({
  getCurrentValue: () => value
}), []); // Missing 'value' dependency

// ✅ Good - all dependencies included
useImperativeHandle(ref, () => ({
  getCurrentValue: () => value
}), [value]);
```

### 3. Error Handling

Handle errors gracefully:

```typescript
const applySettings = (settings: any) => {
  try {
    if (!gridRef.current?.api) {
      console.warn('Grid not ready, cannot apply settings');
      return;
    }
    
    // Apply settings
    gridRef.current.api.applyColumnState({ state: settings.columns });
  } catch (error) {
    console.error('Failed to apply settings:', error);
    onError?.(new Error('Failed to apply settings'));
  }
};
```

### 4. Cleanup

Always cleanup refs when components unmount:

```typescript
// In parent component
const setComponentRef = (id: string, api: ComponentAPI | null) => {
  if (api) {
    componentRefs.current.set(id, api);
  } else {
    // Component unmounting, remove ref
    componentRefs.current.delete(id);
  }
};
```

### 5. Performance

Memoize expensive operations:

```typescript
const getCurrentSettings = useMemo(() => {
  return () => {
    // Expensive operation
    return calculateSettings();
  };
}, [dependencies]);

useImperativeHandle(ref, () => ({
  getCurrentSettings
}), [getCurrentSettings]);
```

## Complete Examples

### 1. Full DataTable Implementation

See [DataTable.example.tsx](./examples/DataTable.example.tsx) for a complete implementation.

### 2. Full Workspace Implementation

See [Workspace.example.tsx](./examples/Workspace.example.tsx) for a complete implementation.

## Testing

### 1. Testing Components with Refs

```typescript
// DataTable.test.tsx
import { render, act } from '@testing-library/react';
import { createRef } from 'react';
import { DataTable } from './DataTable';
import type { ComponentAPI } from '@/types/component-api';

describe('DataTable', () => {
  it('should expose component API', () => {
    const ref = createRef<ComponentAPI>();
    
    render(<DataTable ref={ref} id="test-table" />);
    
    expect(ref.current).toBeDefined();
    expect(ref.current?.getId()).toBe('test-table');
    expect(ref.current?.getType()).toBe('DataTable');
  });
  
  it('should handle settings', async () => {
    const ref = createRef<ComponentAPI>();
    const onSettingsChange = jest.fn();
    
    render(
      <DataTable 
        ref={ref} 
        id="test-table"
        onSettingsChange={onSettingsChange}
      />
    );
    
    const testSettings = {
      columns: [{ field: 'test', width: 100 }]
    };
    
    act(() => {
      ref.current?.applySettings(testSettings);
    });
    
    expect(ref.current?.getCurrentSettings()).toEqual(testSettings);
  });
  
  it('should track dirty state', () => {
    const ref = createRef<ComponentAPI>();
    
    render(<DataTable ref={ref} id="test-table" />);
    
    expect(ref.current?.isDirty()).toBe(false);
    
    // Simulate change
    act(() => {
      // Trigger grid change
    });
    
    expect(ref.current?.isDirty()).toBe(true);
  });
});
```

### 2. Testing Workspace Integration

```typescript
// Workspace.test.tsx
describe('Workspace', () => {
  it('should manage multiple components', async () => {
    const { getByText } = render(<Workspace workspaceId="test-ws" />);
    
    // Add components
    fireEvent.click(getByText('Add Table'));
    fireEvent.click(getByText('Add Chart'));
    
    // Wait for components to be ready
    await waitFor(() => {
      expect(screen.getAllByTestId('component')).toHaveLength(2);
    });
    
    // Test save all
    fireEvent.click(getByText('Save Workspace'));
    
    // Verify save was called
    expect(mockConfig.update).toHaveBeenCalledWith('test-ws', expect.any(Object));
  });
});
```

## Migration Guide

### Converting Existing Components

1. **Add forwardRef wrapper**:
```typescript
// Before
export function DataTable(props: DataTableProps) {
  // ...
}

// After
export const DataTable = forwardRef<ComponentAPI, DataTableProps>((props, ref) => {
  // ...
});
```

2. **Implement useImperativeHandle**:
```typescript
useImperativeHandle(ref, () => ({
  // Implement all required methods
  getId: () => props.id,
  getType: () => 'DataTable',
  // ...
}), [dependencies]);
```

3. **Add lifecycle callbacks**:
```typescript
useEffect(() => {
  if (isReady && props.onReady && ref && 'current' in ref) {
    props.onReady(ref.current!);
  }
}, [isReady]);
```

4. **Update parent components**:
```typescript
// Add ref management
const componentRefs = useRef<Map<string, ComponentAPI>>(new Map());

// Update render method
<DataTable
  ref={(api) => {
    if (api) componentRefs.current.set(id, api);
  }}
  id={id}
  onReady={handleComponentReady}
/>
```

## Troubleshooting

### Common Issues

1. **"Cannot read property 'current' of undefined"**
   - Make sure you're using forwardRef
   - Check that ref is being passed correctly

2. **"Methods not available on ref"**
   - Verify useImperativeHandle is implemented
   - Check dependencies array

3. **"Component not re-rendering"**
   - ForwardRef components don't re-render on ref changes
   - Use state or props for reactive updates

4. **"Memory leaks with refs"**
   - Always cleanup refs when components unmount
   - Use weak references for large collections

### Debug Tips

```typescript
// Add debug logging
useImperativeHandle(ref, () => {
  const api = {
    getCurrentSettings: () => {
      console.log('[DataTable] getCurrentSettings called');
      return settings;
    },
    // ... other methods
  };
  
  console.log('[DataTable] API exposed', api);
  return api;
}, [dependencies]);
```

## Conclusion

This pattern provides a clean, type-safe way for parent components to interact with child components while maintaining React's declarative nature. The key benefits are:

1. **Standardization** - All components follow the same pattern
2. **Type Safety** - Full TypeScript support
3. **Flexibility** - Components maintain control over their implementation
4. **Testability** - Easy to mock and test
5. **Performance** - Minimal overhead with proper implementation

Follow these patterns to create a robust, maintainable component system that scales with your application needs.