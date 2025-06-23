# Component Interface Architecture

## Overview
This document defines the complete interface architecture for the AGV1 React component system. All components follow a standardized pattern using `forwardRef` and `useImperativeHandle` to expose methods to parent containers.

## Core Principles

1. **Uniform Interface**: All components implement `IConfigurableComponent`
2. **Ref-Based API**: Components expose methods via `forwardRef`
3. **Type Safety**: Full TypeScript support with strict typing
4. **Lifecycle Management**: Consistent hooks for save/load operations
5. **Multi-Instance**: Each component instance is isolated

## Base Interfaces

### IConfigurableComponent
The base interface that all components must implement:

```typescript
interface IConfigurableComponent<TConfig = any> {
  // Component identification
  componentId: string;
  componentType: ComponentType;
  
  // Configuration management
  getConfiguration(): TConfig;
  setConfiguration(config: TConfig): void;
  resetConfiguration(): void;
  
  // State persistence
  getState(): ComponentState;
  setState(state: ComponentState): void;
  
  // Lifecycle hooks
  onBeforeSave?(): Promise<void>;
  onAfterLoad?(config: TConfig): Promise<void>;
  onDestroy?(): Promise<void>;
  
  // Validation
  validateConfiguration?(config: TConfig): ValidationResult;
  
  // UI State
  isVisible?(): boolean;
  setVisible?(visible: boolean): void;
  
  // Resize handling
  onResize?(width: number, height: number): void;
}

type ComponentType = 'datatable' | 'chart' | 'datasource' | 'filter' | 'custom';

interface ComponentState {
  scrollPosition?: { top: number; left: number };
  selectedItems?: any[];
  expandedItems?: string[];
  focusedElement?: string;
  customState?: Record<string, any>;
}

interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}
```

## Component-Specific Interfaces

### IDataTableComponent
Extended interface for data table components:

```typescript
interface IDataTableComponent extends IConfigurableComponent<DataTableConfig> {
  // Data management
  setDataSource(source: IDataSource): void;
  getDataSource(): IDataSource | null;
  refreshData(): Promise<void>;
  clearData(): void;
  
  // Grid API access
  getGridApi(): GridApi | null;
  getColumnApi(): ColumnApi | null;
  
  // Export capabilities
  exportData(format: ExportFormat): Promise<Blob>;
  exportConfig(includeData?: boolean): Promise<ExportedConfig>;
  
  // Column management
  getColumnDefinitions(): ColDef[];
  updateColumnDefinitions(columns: ColDef[]): void;
  getVisibleColumns(): Column[];
  setColumnVisibility(colId: string, visible: boolean): void;
  
  // Row operations
  getSelectedRows(): any[];
  selectRows(rowIds: string[]): void;
  deselectAllRows(): void;
  
  // Filtering
  getFilterModel(): FilterModel;
  setFilterModel(model: FilterModel): void;
  clearFilters(): void;
  
  // Sorting
  getSortModel(): SortModelItem[];
  setSortModel(model: SortModelItem[]): void;
  clearSort(): void;
  
  // Advanced features
  enableRangeSelection(enabled: boolean): void;
  getChartRanges(): CellRange[];
  createChart(config: ChartConfig): void;
}

interface DataTableConfig {
  // Grid configuration
  columnDefs: ColDef[];
  defaultColDef?: ColDef;
  
  // Data options
  rowData?: any[];
  datasourceId?: string;
  
  // State
  filterModel?: FilterModel;
  sortModel?: SortModelItem[];
  columnState?: ColumnState[];
  
  // Visual settings
  theme: 'light' | 'dark' | 'custom';
  rowHeight: number;
  headerHeight: number;
  
  // Features
  enableRangeSelection: boolean;
  enableCharts: boolean;
  enableStatusBar: boolean;
  showToolbar: boolean;
  
  // Pagination
  pagination: boolean;
  paginationPageSize: number;
  
  // Custom settings
  columnCustomizations: Record<string, ColumnCustomization>;
  conditionalStyles: ConditionalStyle[];
  customToolbarActions?: ToolbarAction[];
}
```

### IChartComponent
Interface for chart components:

```typescript
interface IChartComponent extends IConfigurableComponent<ChartConfig> {
  // Data management
  setData(data: ChartData): void;
  updateData(data: Partial<ChartData>): void;
  clearData(): void;
  
  // Chart operations
  setChartType(type: ChartType): void;
  refresh(): void;
  
  // Export
  exportImage(format: 'png' | 'svg' | 'jpg'): Promise<Blob>;
  exportData(format: 'csv' | 'json'): Promise<Blob>;
  
  // Interaction
  setZoom(level: number): void;
  resetZoom(): void;
  
  // Theming
  updateTheme(theme: ChartTheme): void;
}

interface ChartConfig {
  type: ChartType;
  data: ChartData;
  options: ChartOptions;
  theme: ChartTheme;
  interactive: boolean;
  animations: boolean;
}
```

### IDataSourceComponent
Interface for data source configuration:

```typescript
interface IDataSourceComponent extends IConfigurableComponent<DataSourceConfig> {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<ConnectionTestResult>;
  getConnectionStatus(): ConnectionStatus;
  
  // Data operations
  fetchData(query?: DataQuery): Promise<any[]>;
  getSchema(): Promise<DataSchema>;
  
  // Real-time
  subscribe(callback: DataUpdateCallback): Subscription;
  unsubscribe(subscription: Subscription): void;
  
  // Configuration
  updateConnectionString(connectionString: string): void;
  setPollingInterval(interval: number): void;
}
```

## Implementation Pattern

### Component Implementation with forwardRef

```typescript
import { forwardRef, useImperativeHandle, useState, useRef } from 'react';

interface MyComponentProps {
  instanceId: string;
  initialConfig?: Partial<MyComponentConfig>;
  onConfigChange?: (config: MyComponentConfig) => void;
}

export const MyComponent = forwardRef<IMyComponent, MyComponentProps>(
  ({ instanceId, initialConfig, onConfigChange }, ref) => {
    // Internal state
    const [config, setConfig] = useState<MyComponentConfig>({
      ...defaultConfig,
      ...initialConfig
    });
    
    // Refs for internal elements
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Expose component interface
    useImperativeHandle(ref, () => ({
      // IConfigurableComponent implementation
      componentId: instanceId,
      componentType: 'custom' as const,
      
      getConfiguration: () => config,
      
      setConfiguration: (newConfig: MyComponentConfig) => {
        setConfig(newConfig);
        onConfigChange?.(newConfig);
      },
      
      resetConfiguration: () => {
        setConfig(defaultConfig);
        onConfigChange?.(defaultConfig);
      },
      
      getState: () => ({
        scrollPosition: getScrollPosition(),
        customState: { /* component specific */ }
      }),
      
      setState: (state: ComponentState) => {
        if (state.scrollPosition) {
          setScrollPosition(state.scrollPosition);
        }
        // Apply other state
      },
      
      // Lifecycle hooks
      onBeforeSave: async () => {
        // Prepare for save
        console.log(`Saving component ${instanceId}`);
      },
      
      onAfterLoad: async (loadedConfig: MyComponentConfig) => {
        // Post-load initialization
        console.log(`Loaded component ${instanceId}`, loadedConfig);
      },
      
      // Component-specific methods
      customMethod: () => {
        // Implementation
      }
    }), [instanceId, config]);
    
    // Component render
    return (
      <div ref={containerRef} className="my-component">
        {/* Component UI */}
      </div>
    );
  }
);

MyComponent.displayName = 'MyComponent';
```

## Component Registration

### Registration Hook

```typescript
function useComponentRegistration(
  ref: React.RefObject<IConfigurableComponent>,
  instanceId: string
) {
  const appContainer = useAppContainer();
  
  useEffect(() => {
    if (ref.current) {
      appContainer.registerComponent(ref.current);
      
      return () => {
        appContainer.unregisterComponent(instanceId);
      };
    }
  }, [ref, instanceId, appContainer]);
}
```

## Service Integration

### Using Services in Components

```typescript
export const DataTableWithServices = forwardRef<IDataTableComponent, DataTableProps>(
  (props, ref) => {
    const services = useServices();
    const { dataSourceService, exportService, profileService } = services;
    
    // Use services in implementation
    const handleExport = async (format: ExportFormat) => {
      const gridApi = gridRef.current?.api;
      if (!gridApi) return;
      
      return exportService.exportGrid(gridApi, format);
    };
    
    // Rest of implementation
  }
);
```

## Type Guards and Utilities

### Type Guards

```typescript
function isDataTableComponent(
  component: IConfigurableComponent
): component is IDataTableComponent {
  return component.componentType === 'datatable';
}

function isChartComponent(
  component: IConfigurableComponent
): component is IChartComponent {
  return component.componentType === 'chart';
}
```

### Component Factory Types

```typescript
type ComponentFactory<T extends IConfigurableComponent = IConfigurableComponent> = {
  create(instanceId: string, config?: any): {
    ref: React.RefObject<T>;
    element: React.ReactElement;
  };
};

const componentFactories: Record<ComponentType, ComponentFactory> = {
  datatable: {
    create: (instanceId, config) => {
      const ref = createRef<IDataTableComponent>();
      const element = <DataTable ref={ref} instanceId={instanceId} initialConfig={config} />;
      return { ref, element };
    }
  },
  // Other factories...
};
```

## Best Practices

### 1. Always Use forwardRef
All configurable components must use `forwardRef` to expose their interface.

### 2. Implement All Base Methods
Even if empty, implement all methods from `IConfigurableComponent`.

### 3. Handle Cleanup
Implement cleanup in lifecycle hooks and component unmount.

### 4. Type Safety
Use proper TypeScript types for all configurations and method parameters.

### 5. Error Handling
Wrap operations in try-catch and provide meaningful error messages.

### 6. Performance
Memoize expensive operations and use React optimization techniques.

### 7. Documentation
Document all custom methods and configuration options.

## Testing Components

### Testing Interface Implementation

```typescript
describe('DataTable Component Interface', () => {
  it('should implement IDataTableComponent', () => {
    const ref = createRef<IDataTableComponent>();
    render(<DataTable ref={ref} instanceId="test-1" />);
    
    expect(ref.current).toBeDefined();
    expect(ref.current?.componentType).toBe('datatable');
    expect(typeof ref.current?.getConfiguration).toBe('function');
    expect(typeof ref.current?.setDataSource).toBe('function');
  });
  
  it('should handle configuration changes', async () => {
    const ref = createRef<IDataTableComponent>();
    const onConfigChange = jest.fn();
    
    render(
      <DataTable 
        ref={ref} 
        instanceId="test-1" 
        onConfigChange={onConfigChange}
      />
    );
    
    const newConfig = { ...defaultConfig, theme: 'dark' };
    ref.current?.setConfiguration(newConfig);
    
    expect(onConfigChange).toHaveBeenCalledWith(newConfig);
    expect(ref.current?.getConfiguration()).toEqual(newConfig);
  });
});
```

## Migration Guide

### Converting Existing Components

1. Add `forwardRef` wrapper
2. Implement `useImperativeHandle` with all required methods
3. Update props to include `instanceId`
4. Add configuration management
5. Implement state persistence methods
6. Add lifecycle hooks
7. Update parent components to use refs

This architecture ensures consistency across all components while providing flexibility for component-specific features.