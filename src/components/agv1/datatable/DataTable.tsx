import React, { forwardRef, useImperativeHandle, useState, useRef, useCallback, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  GridApi, 
  GridReadyEvent, 
  ColDef,
  SelectionChangedEvent,
  CellValueChangedEvent,
  SortChangedEvent,
  FilterChangedEvent,
  themeQuartz
} from 'ag-grid-community';
// AG Grid v33 uses Theming API instead of CSS files
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useColumnFormat } from '@/hooks/agv1/useColumnFormat';
import { useAppContainer } from '@/hooks/agv1/useAppContainer';
import type { 
  IDataTableComponent, 
  DataTableConfig, 
  IDataSource, 
  ExportFormat,
  ValidationResult,
  ComponentState,
  ComponentType
} from '@/types/agv1/component.interfaces';
import type { DataUpdate, UpdateType } from '@/types/agv1/datasource.types';
import { FormattedCellRenderer } from './renderers/FormattedCellRenderer';
import { DataTableToolbar } from './DataTableToolbar';
import { ColumnVisibilityDialog } from './ColumnVisibilityDialog';
import { ColumnFormattingDialogV2 } from '../dialogs/formatting/ColumnFormattingDialogV2';
import { GridOptionsEditor } from '../dialogs/GridOptionsEditor';
import { ConnectionStatusIndicator } from '../indicators/ConnectionStatus';
import { UpdateIndicator, UpdateStreamIndicator } from '../indicators/UpdateIndicator';
import { ProfileToolbar } from '../components/ProfileToolbar';
import { ProfileManagementDialog } from '../dialogs/ProfileManagementDialog';
import { useTheme } from '@/components/theme-provider';

export interface DataTableProps {
  instanceId: string;
  initialConfig?: Partial<DataTableConfig>;
  className?: string;
  onStateChange?: (state: ComponentState) => void;
  onConfigChange?: (config: DataTableConfig) => void;
  enableRealtime?: boolean;
  showConnectionStatus?: boolean;
  showUpdateIndicators?: boolean;
}

const defaultConfig: DataTableConfig = {
  columns: [],
  enableSorting: true,
  enableFiltering: true,
  enableGrouping: false,
  rowSelection: 'single',
  pagination: {
    enabled: true,
    pageSize: 50,
    pageSizes: [20, 50, 100, 200]
  },
  rowHeight: 32,
  headerHeight: 40,
  theme: 'quartz',
  dataSource: {
    id: '',
    type: '',
    settings: {}
  },
  gridOptions: {},
  exportSettings: {
    defaultFormat: 'csv',
    includeHeaders: true,
    fileName: 'data-export'
  }
};

export const DataTable = forwardRef<IDataTableComponent, DataTableProps>(
  ({ 
    instanceId, 
    initialConfig, 
    className, 
    onStateChange, 
    onConfigChange,
    enableRealtime = false,
    showConnectionStatus = true,
    showUpdateIndicators = true
  }, ref) => {
    console.log('DataTable rendering with instanceId:', instanceId);
    
    // State
    const [config, setConfig] = useState<DataTableConfig>({ 
      ...defaultConfig, 
      ...(initialConfig || {}),
      columns: initialConfig?.columns || []
    });
    const [rowData, setRowData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [showColumnVisibility, setShowColumnVisibility] = useState(false);
    const [showColumnFormatting, setShowColumnFormatting] = useState(false);
    const [selectedColumnForFormatting, setSelectedColumnForFormatting] = useState<ColDef | null>(null);
    const [showGridOptions, setShowGridOptions] = useState(false);
    const [showProfileDialog, setShowProfileDialog] = useState(false);
    const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'error' | 'connecting'>('disconnected');
    const [realtimeStats, setRealtimeStats] = useState<any>(null);
    const [lastUpdate, setLastUpdate] = useState<{ type: UpdateType; timestamp: Date } | null>(null);
    const { theme: appTheme } = useTheme();
    
    // Set theme mode on document body for AG-Grid
    React.useEffect(() => {
      const resolvedTheme = appTheme === 'system' 
        ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        : appTheme;
      
      document.body.dataset.agThemeMode = resolvedTheme;
      
      // Listen for system theme changes
      if (appTheme === 'system') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
          document.body.dataset.agThemeMode = e.matches ? 'dark' : 'light';
        };
        
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }
    }, [appTheme]);
    
    // Determine AG Grid theme based on app theme
    const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
    
    // Update current theme when app theme changes
    React.useEffect(() => {
      const resolvedTheme = appTheme === 'system' 
        ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        : appTheme;
      setCurrentTheme(resolvedTheme);
    }, [appTheme]);
    
    const agGridTheme = React.useMemo(() => {
      // Use quartz theme with dark/light variant
      if (currentTheme === 'dark') {
        return themeQuartz.withParams({
          backgroundColor: 'rgb(9, 9, 11)',  // zinc-950
          foregroundColor: 'rgb(250, 250, 250)',  // zinc-50
          borderColor: 'rgba(63, 63, 70, 0.5)',  // zinc-700 with opacity
          chromeBackgroundColor: {
            ref: 'foregroundColor',
            mix: 0.07,
            onto: 'backgroundColor',
          },
          browserColorScheme: 'dark',
          headerBackgroundColor: 'rgb(24, 24, 27)',  // zinc-900
          oddRowBackgroundColor: 'rgba(39, 39, 42, 0.3)',  // zinc-800 with opacity
          rowHoverColor: 'rgba(63, 63, 70, 0.5)',  // zinc-700 with opacity
        }, 'dark');
      } else {
        return themeQuartz.withParams({
          backgroundColor: 'rgb(255, 255, 255)',  // white
          foregroundColor: 'rgb(9, 9, 11)',  // zinc-950
          borderColor: 'rgba(228, 228, 231, 0.8)',  // zinc-200 with opacity
          browserColorScheme: 'light',
          headerBackgroundColor: 'rgb(250, 250, 250)',  // zinc-50
          oddRowBackgroundColor: 'rgba(250, 250, 250, 0.5)',  // zinc-50 with opacity
          rowHoverColor: 'rgba(244, 244, 245, 0.8)',  // zinc-100 with opacity
        }, 'light');
      }
    }, [currentTheme]);
    
    // Refs
    const gridRef = useRef<AgGridReact>(null);
    const gridApiRef = useRef<GridApi | null>(null);
    const columnApiRef = useRef<any>(null);
    const dataSourceRef = useRef<IDataSource | null>(null);
    
    // AppContainer integration
    const { 
      appContainer, 
      registerComponent,
      saveProfile, 
      loadProfile, 
      getProfiles,
      getActiveProfile,
      connectToDatasource
    } = useAppContainer(instanceId);
    
    // Component registration will be done after function definitions
    const dataSubscriptionRef = useRef<(() => void) | null>(null);
    
    // Hooks
    const { getColumnFormat, setColumnFormat } = useColumnFormat();
    
    // Column definitions with formatting
    const columnDefs = useCallback((): ColDef[] => {
      return config.columns.map((col) => {
        const format = getColumnFormat(col.field || '');
        const baseColDef: ColDef = {
          ...col,
          cellRenderer: format ? FormattedCellRenderer : undefined,
          cellRendererParams: format ? { format } : undefined,
          sortable: config.enableSorting && (col.sortable !== false),
          filter: config.enableFiltering && (col.filter !== false),
          resizable: col.resizable !== false,
        };
        
        return baseColDef;
      });
    }, [config.columns, config.enableSorting, config.enableFiltering, getColumnFormat]);
    
    // Context menu configuration
    const getMainMenuItems = useCallback((params: any) => {
      const column = params.column;
      const defaultItems = params.defaultItems || [];
      
      // Add custom menu item for formatting
      const formatMenuItem = {
        name: 'Format Column',
        icon: '<span class="ag-icon ag-icon-format">🎨</span>',
        action: () => {
          const columns = config.columns || [];
          const colDef = columns.find(col => col.field === column.getColId());
          if (colDef) {
            setSelectedColumnForFormatting(colDef);
            setShowColumnFormatting(true);
          }
        },
      };
      
      // Insert our custom item after the first separator or at the beginning
      const separatorIndex = defaultItems.findIndex((item: any) => item === 'separator');
      if (separatorIndex !== -1) {
        return [
          ...defaultItems.slice(0, separatorIndex + 1),
          formatMenuItem,
          'separator',
          ...defaultItems.slice(separatorIndex + 1)
        ];
      } else {
        return [formatMenuItem, 'separator', ...defaultItems];
      }
    }, [config.columns]);
    
    // Grid event handlers
    const onGridReady = useCallback((params: GridReadyEvent) => {
      gridApiRef.current = params.api;
      columnApiRef.current = (params as any).columnApi;
      
      // Auto-size columns if configured
      if (config.autoSizeColumns) {
        params.api.sizeColumnsToFit();
      }
    }, [config.autoSizeColumns]);
    
    const onSelectionChanged = useCallback((event: SelectionChangedEvent) => {
      const selected = event.api.getSelectedRows();
      setSelectedRows(selected);
    }, []);
    
    const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
      // Handle cell value changes if needed
      console.log('Cell value changed:', event);
    }, []);
    
    const onSortChanged = useCallback((event: SortChangedEvent) => {
      // Handle sort changes if needed
      console.log('Sort changed');
    }, []);
    
    const onFilterChanged = useCallback((event: FilterChangedEvent) => {
      // Handle filter changes if needed
      const filterModel = event.api.getFilterModel();
      console.log('Filter changed:', filterModel);
    }, []);
    
    // Handle real-time updates
    const handleRealtimeUpdate = useCallback((update: DataUpdate) => {
      setLastUpdate({ type: update.type, timestamp: new Date() });
      
      // Clear update indicator after a delay
      setTimeout(() => {
        setLastUpdate(null);
      }, 1000);
    }, []);
    
    // Data source management
    const setDataSource = useCallback((source: IDataSource) => {
      // Unsubscribe from previous data source
      if (dataSubscriptionRef.current) {
        dataSubscriptionRef.current();
        dataSubscriptionRef.current = null;
      }
      
      dataSourceRef.current = source;
      
      // Subscribe to data updates
      const unsubscribe = source.subscribe((data) => {
        console.log('DataTable received data:', data);
        
        if (data.type === 'initial' && data.schema) {
          // Initial data with schema from datasource
          console.log('Received initial data with schema');
          console.log('Columns:', data.schema.columns);
          console.log('Data count:', data.data.length);
          
          // Update columns from schema
          if (data.schema.columns && data.schema.columns.length > 0) {
            setConfig(prev => ({ 
              ...prev, 
              columns: data.schema.columns,
              dataSource: prev.dataSource ? {
                ...prev.dataSource,
                settings: {
                  ...prev.dataSource.settings,
                  keyColumn: data.schema.keyColumn || 'id'
                }
              } : {
                id: '',
                type: '',
                settings: {
                  keyColumn: data.schema.keyColumn || 'id'
                }
              }
            }));
          }
          
          // Set the data
          setRowData(data.data || []);
        } else if (Array.isArray(data)) {
          console.log('Setting row data, count:', data.length);
          setRowData(data);
        } else if (data.type === 'update' && data.metadata?.isBatch) {
          // Handle batch updates
          const updates = data.data;
          setRowData(prev => {
            const newData = [...prev];
            updates.forEach((update: DataUpdate) => {
              const index = newData.findIndex(item => 
                item[config.dataSource?.settings?.keyColumn || 'id'] === update.key
              );
              if (index !== -1) {
                newData[index] = { ...newData[index], ...update.data };
              }
            });
            return newData;
          });
        } else {
          // Handle single updates
          handleRealtimeUpdate(data);
        }
        setError(null);
      });
      
      dataSubscriptionRef.current = unsubscribe;
      
      // Update connection status if data source has status
      if ('status' in source) {
        setRealtimeStatus(source.status);
      }
      
      // Get statistics if available
      if ('getStatistics' in source) {
        const stats = (source as any).getStatistics();
        setRealtimeStats(stats);
      }
      
      // Load initial data
      refreshData();
    }, [handleRealtimeUpdate]);
    
    const refreshData = useCallback(async () => {
      if (!dataSourceRef.current) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await dataSourceRef.current.getData();
        setRowData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }, []);
    
    // Export functionality
    const exportData = useCallback(async (format: ExportFormat): Promise<void> => {
      if (!gridApiRef.current) {
        throw new Error('Grid not initialized');
      }
      
      const api = gridApiRef.current;
      const { includeHeaders, fileName } = config.exportSettings || {};
      let blob: Blob;
      let extension: string;
      
      switch (format) {
        case 'csv':
          const csvContent = api.getDataAsCsv({
            skipColumnHeaders: !includeHeaders,
            fileName: `${fileName}.csv`
          });
          blob = new Blob([csvContent || ''], { type: 'text/csv' });
          extension = 'csv';
          break;
          
        case 'excel':
          // This requires AG-Grid Enterprise
          throw new Error('Excel export requires AG-Grid Enterprise license');
          
        case 'json':
          const jsonData: any[] = [];
          api.forEachNodeAfterFilterAndSort((node) => {
            jsonData.push(node.data);
          });
          blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
          extension = 'json';
          break;
          
        case 'pdf':
          // This would require additional PDF library integration
          throw new Error('PDF export not implemented');
          
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
      
      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName || 'export'}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, [config.exportSettings]);
    
    // Column management
    const updateColumnDefinitions = useCallback((columns: ColDef[]) => {
      setConfig(prev => ({ ...prev, columns }));
    }, []);
    
    const getColumnDefinitions = useCallback((): ColDef[] => {
      return config.columns;
    }, [config.columns]);
    
    // Filter management
    const applyFilter = useCallback((filter: any) => {
      if (gridApiRef.current) {
        gridApiRef.current.setFilterModel(filter);
      }
    }, []);
    
    const clearFilters = useCallback(() => {
      if (gridApiRef.current) {
        gridApiRef.current.setFilterModel(null);
      }
    }, []);
    
    const getSelectedRows = useCallback((): any[] => {
      return selectedRows;
    }, [selectedRows]);
    
    // Configuration management
    const getConfiguration = useCallback((): DataTableConfig => {
      return { ...config };
    }, [config]);
    
    const setConfiguration = useCallback((newConfig: DataTableConfig) => {
      setConfig(newConfig);
      onConfigChange?.(newConfig);
    }, [onConfigChange]);
    
    const resetConfiguration = useCallback(() => {
      const resetConfig = { ...defaultConfig, ...initialConfig };
      setConfig(resetConfig);
      onConfigChange?.(resetConfig);
    }, [initialConfig, onConfigChange]);
    
    // State management
    const getState = useCallback((): ComponentState => {
      const state: ComponentState = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        data: {
          instanceId,
          componentType: 'datatable',
          config,
          runtime: {
            selectedRows: selectedRows.length,
            totalRows: rowData.length,
            hasError: !!error,
            isLoading: loading,
            filterModel: gridApiRef.current?.getFilterModel() || {}
          }
        }
      };
      
      return state;
    }, [instanceId, config, selectedRows, rowData, error, loading]);
    
    const setState = useCallback((state: ComponentState) => {
      if (state.data.config) {
        setConfiguration(state.data.config as DataTableConfig);
      }
      
      if (state.data.runtime && gridApiRef.current) {
        if (state.data.runtime.filterModel) {
          gridApiRef.current.setFilterModel(state.data.runtime.filterModel);
        }
      }
    }, [setConfiguration]);
    
    // Validation
    const validateConfiguration = useCallback((configToValidate: DataTableConfig): ValidationResult => {
      const errors: string[] = [];
      
      if (!configToValidate.columns || configToValidate.columns.length === 0) {
        errors.push('At least one column must be defined');
      }
      
      if (configToValidate.pagination?.pageSize && configToValidate.pagination.pageSize < 1) {
        errors.push('Page size must be greater than 0');
      }
      
      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors.map(message => ({
          field: 'general',
          message,
          severity: 'error' as const
        })) : undefined
      };
    }, []);
    
    // Expose component interface
    useImperativeHandle(ref, () => ({
      // IConfigurableComponent interface
      componentId: instanceId,
      componentType: 'datatable' as ComponentType,
      getConfiguration,
      setConfiguration,
      resetConfiguration,
      getState,
      setState,
      validateConfiguration,
      
      // IDataTableComponent interface
      setDataSource,
      refreshData,
      getGridApi: () => gridApiRef.current,
      exportData,
      getColumnDefinitions,
      updateColumnDefinitions,
      applyFilter,
      clearFilters,
      getSelectedRows
    }), [
      instanceId,
      getConfiguration,
      setConfiguration,
      resetConfiguration,
      getState,
      setState,
      validateConfiguration,
      setDataSource,
      refreshData,
      exportData,
      getColumnDefinitions,
      updateColumnDefinitions,
      applyFilter,
      clearFilters,
      getSelectedRows
    ]);
    
    // Register component with AppContainer
    useEffect(() => {
      if (appContainer && registerComponent) {
        registerComponent(instanceId, {
          componentId: instanceId,
          componentType: 'datatable' as ComponentType,
          getConfiguration,
          setConfiguration,
          resetConfiguration,
          getState,
          setState,
          validateConfiguration
        });
      }
    }, [instanceId, appContainer, registerComponent, getConfiguration, setConfiguration, resetConfiguration, getState, setState, validateConfiguration]);
    
    // Connect to datasource if one is assigned
    useEffect(() => {
      // Small delay to ensure component is registered in AppContainer
      const timer = setTimeout(() => {
        if (appContainer) {
          const state = appContainer.getState();
          console.log('AppContainer state:', state);
          console.log('Looking for component:', instanceId);
          console.log('All components:', Array.from(state.components.keys()));
          
          const component = appContainer.getComponent(instanceId);
          console.log('DataTable component:', component);
          
          if (component?.datasourceId) {
            // Get the active datasource
            const activeDatasources = state.activeDatasources;
            console.log('Active datasources:', activeDatasources);
            const dataSource = activeDatasources.get(component.datasourceId);
            console.log('Found datasource:', dataSource);
            if (dataSource) {
              setDataSource(dataSource);
            }
          } else if (!component) {
            // If component not found, try again
            console.log('Component not found, trying again...');
            setTimeout(() => {
              const retryComponent = appContainer.getComponent(instanceId);
              if (retryComponent?.datasourceId) {
                const retryState = appContainer.getState();
                const dataSource = retryState.activeDatasources.get(retryComponent.datasourceId);
                if (dataSource) {
                  console.log('Found datasource on retry:', dataSource);
                  setDataSource(dataSource);
                }
              }
            }, 500);
          }
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }, [instanceId, appContainer, setDataSource]);
    
    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (dataSubscriptionRef.current) {
          dataSubscriptionRef.current();
        }
      };
    }, []);
    
    // Notify state changes
    useEffect(() => {
      const state = getState();
      onStateChange?.(state);
    }, [config, selectedRows, rowData, error, loading, getState, onStateChange]);
    
    return (
      <div className={cn("flex flex-col h-full bg-background", className)}>
        <div className="flex items-center justify-between border-b bg-background px-4 py-2">
          <div className="flex items-center gap-2">
            <DataTableToolbar
              onRefresh={refreshData}
              onExport={exportData}
              onColumnSettings={() => setShowColumnVisibility(true)}
              onGridSettings={() => setShowGridOptions(true)}
              selectedCount={selectedRows.length}
              loading={loading}
              exportSettings={config.exportSettings}
            />
            
            <Separator orientation="vertical" className="h-6" />
            
            <ProfileToolbar
              profiles={getProfiles(instanceId)}
              activeProfileId={getActiveProfile(instanceId)?.id}
              onSaveProfile={async (name) => {
                await saveProfile(instanceId, name);
              }}
              onLoadProfile={async (profileId) => {
                await loadProfile(instanceId, profileId);
              }}
              onOpenProfileDialog={() => setShowProfileDialog(true)}
              size="sm"
            />
          </div>
          
          {showConnectionStatus && enableRealtime && (
            <div className="flex items-center gap-3">
              {realtimeStats?.updateStats && (
                <UpdateStreamIndicator 
                  updatesPerSecond={realtimeStats.updateStats.received || 0}
                />
              )}
              <ConnectionStatusIndicator
                status={realtimeStatus}
                dataSourceName={config.dataSource?.id}
                statistics={realtimeStats?.connectionStats?.messages}
                showDetails={true}
              />
            </div>
          )}
        </div>
        
        <div className="flex-1 relative">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="text-center">
                <p className="text-destructive font-medium">Error loading data</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          )}
          
          <div className="h-full relative">
            {showUpdateIndicators && lastUpdate && (
              <UpdateIndicator
                type={lastUpdate.type}
                visible={true}
                position="top-right"
                className="z-10 m-2"
              />
            )}
            <AgGridReact
              key={currentTheme} // Force re-render when theme changes
              ref={gridRef}
              theme={agGridTheme as any}
              rowData={rowData}
              columnDefs={columnDefs()}
              onGridReady={onGridReady}
              onSelectionChanged={onSelectionChanged}
              onCellValueChanged={onCellValueChanged}
              onSortChanged={onSortChanged}
              onFilterChanged={onFilterChanged}
              rowSelection={config.rowSelection === false ? undefined : config.rowSelection}
              pagination={config.pagination?.enabled}
              paginationPageSize={config.pagination?.pageSize}
              paginationPageSizeSelector={config.pagination?.pageSizes}
              rowHeight={config.rowHeight}
              headerHeight={config.headerHeight}
              animateRows={true}
              enableCellTextSelection={true}
              ensureDomOrder={true}
              suppressMenuHide={true}
              getMainMenuItems={getMainMenuItems}
              {...config.gridOptions}
            />
          </div>
        </div>
        
        {/* Dialogs */}
        <ColumnVisibilityDialog
          open={showColumnVisibility}
          onOpenChange={setShowColumnVisibility}
          columns={config.columns}
          onApply={(updatedColumns) => {
            updateColumnDefinitions(updatedColumns);
          }}
        />
        
        {selectedColumnForFormatting && (
          <ColumnFormattingDialogV2
            open={showColumnFormatting}
            onOpenChange={setShowColumnFormatting}
            columns={config.columns}
            selectedColumns={[selectedColumnForFormatting.field || '']}
            currentFormats={{
              [selectedColumnForFormatting.field || '']: getColumnFormat(selectedColumnForFormatting.field || '') || {}
            }}
            onApply={(formats) => {
              Object.entries(formats).forEach(([field, format]) => {
                setColumnFormat(field, format);
              });
              // Force grid refresh
              gridApiRef.current?.refreshCells();
              setShowColumnFormatting(false);
              setSelectedColumnForFormatting(null);
            }}
            onCancel={() => {
              setShowColumnFormatting(false);
              setSelectedColumnForFormatting(null);
            }}
          />
        )}
        
        <GridOptionsEditor
          open={showGridOptions}
          onOpenChange={setShowGridOptions}
          config={config}
          onApply={(newConfig) => {
            setConfiguration(newConfig);
            // Apply grid options immediately
            if (gridApiRef.current) {
              // Refresh the grid to apply new settings
              gridApiRef.current.refreshCells();
              gridApiRef.current.redrawRows();
            }
          }}
          onCancel={() => setShowGridOptions(false)}
        />
        
        {showProfileDialog && (
          <ProfileManagementDialog
            open={showProfileDialog}
            onOpenChange={setShowProfileDialog}
            componentInstanceId={instanceId}
            componentType="datatable"
            profiles={getProfiles(instanceId)}
            activeProfileId={getActiveProfile(instanceId)?.id}
            onCreateProfile={async (name, description) => {
              await saveProfile(instanceId, name);
              // Return the created profile
              const profiles = getProfiles(instanceId);
              return profiles[profiles.length - 1];
            }}
            onLoadProfile={async (profileId) => {
              await loadProfile(instanceId, profileId);
            }}
            onUpdateProfile={async (profileId, updates) => {
              // TODO: Implement profile update in useAppContainer
              console.log('Update profile:', profileId, updates);
            }}
            onDeleteProfile={async (profileId) => {
              // TODO: Implement profile delete in useAppContainer
              console.log('Delete profile:', profileId);
            }}
            onDuplicateProfile={async (profileId, newName) => {
              // TODO: Implement profile duplicate in useAppContainer
              console.log('Duplicate profile:', profileId, newName);
              await saveProfile(instanceId, newName);
              const profiles = getProfiles(instanceId);
              return profiles[profiles.length - 1];
            }}
            onExportProfile={(profileId) => {
              // TODO: Implement profile export
              console.log('Export profile:', profileId);
            }}
            onImportProfile={async (data) => {
              // TODO: Implement profile import
              console.log('Import profile:', data);
              const profiles = getProfiles(instanceId);
              return profiles[0];
            }}
            onSetDefault={async (profileId) => {
              // TODO: Implement set default profile
              console.log('Set default profile:', profileId);
            }}
          />
        )}
      </div>
    );
  }
);

DataTable.displayName = 'DataTable';

// Factory function for creating DataTable instances
export function createDataTable(props: DataTableProps) {
  return <DataTable {...props} />;
}