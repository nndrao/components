/**
 * Component Interfaces for AGV1 React Components
 * 
 * This file defines the core interfaces that all AGV1 components must implement.
 * These interfaces ensure consistency across components and enable the app container
 * to manage component lifecycle through refs.
 */

import { GridApi, ColDef } from 'ag-grid-community';

/**
 * Base component types supported by the AGV1 system
 */
export type ComponentType = 'datatable' | 'chart' | 'datasource' | 'filter' | 'custom' | 'profile-config' | 'profile-selection';

/**
 * Export format options for data export functionality
 */
export type ExportFormat = 'csv' | 'excel' | 'json' | 'pdf';

/**
 * Component state that can be persisted and restored
 */
export interface ComponentState {
  version: string;
  timestamp: string;
  data: Record<string, any>;
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validation result for configuration validation
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

/**
 * Base interface that all configurable components must implement
 * This interface is exposed via forwardRef and useImperativeHandle
 */
export interface IConfigurableComponent<TConfig = any> {
  /** Unique identifier for this component instance */
  componentId: string;
  
  /** Type of component */
  componentType: ComponentType;
  
  /**
   * Configuration Management
   */
  
  /** Get the current configuration */
  getConfiguration(): TConfig;
  
  /** Set a new configuration */
  setConfiguration(config: TConfig): void;
  
  /** Reset configuration to defaults */
  resetConfiguration(): void;
  
  /**
   * State Persistence
   */
  
  /** Get the current component state for persistence */
  getState(): ComponentState;
  
  /** Restore component state */
  setState(state: ComponentState): void;
  
  /**
   * Lifecycle Hooks (Optional)
   */
  
  /** Called before saving configuration */
  onBeforeSave?(): Promise<void>;
  
  /** Called after loading configuration */
  onAfterLoad?(config: TConfig): Promise<void>;
  
  /** Called when component is about to be destroyed */
  onDestroy?(): void;
  
  /**
   * Validation (Optional)
   */
  
  /** Validate a configuration before applying */
  validateConfiguration?(config: TConfig): ValidationResult;
}

/**
 * Data source interface for components that consume data
 */
export interface IDataSource {
  id: string;
  name: string;
  type: 'websocket' | 'rest' | 'static' | 'custom' | 'dummy';
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  
  /** Connect to the data source */
  connect(): Promise<void>;
  
  /** Disconnect from the data source */
  disconnect(): Promise<void>;
  
  /** Subscribe to data updates */
  subscribe(callback: (data: any) => void): () => void;
  
  /** Get current data snapshot */
  getData(): Promise<any[]>;
}

/**
 * DataTable specific configuration
 */
export interface DataTableConfig {
  /** Column definitions for AG-Grid */
  columns: ColDef[];
  
  /** Enable sorting functionality */
  enableSorting: boolean;
  
  /** Enable filtering functionality */
  enableFiltering: boolean;
  
  /** Enable grouping functionality */
  enableGrouping: boolean;
  
  /** Row selection mode */
  rowSelection: 'single' | 'multiple' | false;
  
  /** Pagination settings */
  pagination?: {
    enabled: boolean;
    pageSize: number;
    pageSizes: number[];
  };
  
  /** Row height in pixels */
  rowHeight: number;
  
  /** Header height in pixels */
  headerHeight: number;
  
  /** Grid theme */
  theme: 'quartz' | 'dark' | 'alpine' | 'material';
  
  /** Auto-size columns on load */
  autoSizeColumns?: boolean;
  
  /** Data source configuration */
  dataSource?: {
    id: string;
    type: string;
    settings: Record<string, any>;
  };
  
  /** Additional grid options */
  gridOptions?: {
    theme?: 'light' | 'dark' | 'auto';
    density?: 'compact' | 'normal' | 'comfortable';
    fontSize?: number;
    showRowNumbers?: boolean;
    alternatingRowColors?: boolean;
    showGridLines?: 'none' | 'horizontal' | 'vertical' | 'both';
    checkboxSelection?: boolean;
    headerCheckboxSelection?: boolean;
    suppressRowClickSelection?: boolean;
    exportAllColumns?: boolean;
    exportSelectedRowsOnly?: boolean;
    [key: string]: any;
  };
  
  /** Export settings */
  exportSettings?: {
    defaultFormat: ExportFormat;
    includeHeaders: boolean;
    fileName: string;
  };
}

/**
 * DataTable component interface extending the base interface
 */
export interface IDataTableComponent extends IConfigurableComponent<DataTableConfig> {
  /** Set the data source for the table */
  setDataSource(source: IDataSource): void;
  
  /** Refresh data from the current data source */
  refreshData(): Promise<void>;
  
  /** Get the AG-Grid API instance */
  getGridApi(): GridApi | null;
  
  /** Export data in specified format */
  exportData(format: ExportFormat): Promise<void>;
  
  /** Get current column definitions */
  getColumnDefinitions(): ColDef[];
  
  /** Update column definitions */
  updateColumnDefinitions(columns: ColDef[]): void;
  
  /** Apply a filter to the grid */
  applyFilter(filter: any): void;
  
  /** Clear all filters */
  clearFilters(): void;
  
  /** Get selected rows */
  getSelectedRows(): any[];
}

/**
 * Chart component configuration
 */
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
  dataSource?: {
    id: string;
    type: string;
    settings: Record<string, any>;
  };
  series: Array<{
    name: string;
    dataKey: string;
    color?: string;
  }>;
  axes?: {
    xAxis?: any;
    yAxis?: any;
  };
  legend?: {
    show: boolean;
    position: 'top' | 'right' | 'bottom' | 'left';
  };
}

/**
 * Chart component interface
 */
export interface IChartComponent extends IConfigurableComponent<ChartConfig> {
  /** Set the data source for the chart */
  setDataSource(source: IDataSource): void;
  
  /** Refresh chart data */
  refreshData(): Promise<void>;
  
  /** Export chart as image */
  exportImage(format: 'png' | 'svg' | 'jpeg'): Promise<Blob>;
  
  /** Update chart type */
  setChartType(type: ChartConfig['type']): void;
}

/**
 * Filter component configuration
 */
export interface FilterConfig {
  targetComponents: string[];
  filterType: 'basic' | 'advanced' | 'custom';
  fields: Array<{
    name: string;
    type: 'text' | 'number' | 'date' | 'select' | 'range';
    operators: string[];
  }>;
}

/**
 * Filter component interface
 */
export interface IFilterComponent extends IConfigurableComponent<FilterConfig> {
  /** Get current filter values */
  getFilterValues(): Record<string, any>;
  
  /** Set filter values */
  setFilterValues(values: Record<string, any>): void;
  
  /** Clear all filters */
  clearFilters(): void;
  
  /** Apply filters to target components */
  applyFilters(): void;
}

/**
 * Component factory function type
 */
export type ComponentFactory<T extends IConfigurableComponent = IConfigurableComponent> = (
  instanceId: string,
  initialConfig?: any
) => React.ReactElement;

/**
 * Component registry entry
 */
export interface ComponentRegistryEntry {
  instanceId: string;
  componentType: ComponentType;
  ref: React.RefObject<IConfigurableComponent>;
  metadata?: {
    displayName?: string;
    created: string;
    lastModified: string;
  };
}

/**
 * Props for components that implement IConfigurableComponent
 */
export interface ConfigurableComponentProps<TConfig = any> {
  /** Unique instance ID for this component */
  instanceId: string;
  
  /** Initial configuration */
  initialConfig?: TConfig;
  
  /** Optional display name */
  displayName?: string;
  
  /** Optional CSS class names */
  className?: string;
  
  /** Optional inline styles */
  style?: React.CSSProperties;
}