import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { GridApi, GridReadyEvent, themeQuartz } from 'ag-grid-community';
import { useAppStore } from '../../store';
import { useTheme } from '../../contexts/ThemeContext';
import { useDataTableSubscription } from '../../hooks/useDataTableSubscription';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataTableToolbar } from './DataTableToolbar';
import { DEFAULT_COLUMNS, DEFAULT_COL_DEF, convertColumnDefinitions } from '../../utils/columnUtils';
import type { Profile } from '../../types';
// Ensure AG-Grid enterprise modules are registered
import '../../../config/agGridModules';

// Unified theme configuration with light and dark modes
const theme = themeQuartz
  .withParams(
    {
      accentColor: "#3b82f6",
      backgroundColor: "#ffffff",
      borderColor: "#e5e7eb",
      browserColorScheme: "light",
      cellTextColor: "#111827",
      chromeBackgroundColor: "#f9fafb",
      columnBorder: true,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 14,
      headerBackgroundColor: "#f3f4f6",
      headerFontWeight: 600,
      headerTextColor: "#111827",
      oddRowBackgroundColor: "#fafafa",
      rowHeight: 42,
      headerHeight: 42,
      cellHorizontalPadding: 16,
      spacing: 8,
    },
    "light"
  )
  .withParams(
    {
      accentColor: "#60a5fa",
      backgroundColor: "#0f172a",
      borderColor: "#334155",
      browserColorScheme: "dark",
      cellTextColor: "#f1f5f9",
      chromeBackgroundColor: {
        ref: "foregroundColor",
        mix: 0.07,
        onto: "backgroundColor",
      },
      columnBorder: true,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 14,
      foregroundColor: "#f1f5f9",
      headerBackgroundColor: "#1e293b",
      headerFontWeight: 600,
      headerTextColor: "#f1f5f9",
      oddRowBackgroundColor: "#1e293b",
      rowHeight: 42,
      headerHeight: 42,
      cellHorizontalPadding: 16,
      spacing: 8,
    },
    "dark"
  );


interface DataTableProps {
  id: string;
}

const emptyProfiles: Profile[] = [];

export function DataTable({ id }: DataTableProps) {
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const { theme: appTheme } = useTheme();
  
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(() => {
    const saved = localStorage.getItem(`datatable-toolbar-${id}`);
    return saved !== 'false'; // Default to expanded
  });
  const [sideBarVisible, setSideBarVisible] = useState<boolean>(() => {
    const saved = localStorage.getItem(`datatable-sidebar-${id}`);
    return saved !== 'false'; // Default to visible
  });
  
  // Component state from store
  const component = useAppStore(state => state.components.get(id));
  const profiles = useAppStore(state => state.profiles.get(id)) || emptyProfiles;
  const activeProfileId = useAppStore(state => state.activeProfiles.get(id));
  const updateProfile = useAppStore(state => state.updateProfile);
  const updateComponent = useAppStore(state => state.updateComponent);
  
  // Data table subscription
  const {
    dataSourceId,
    dataSource: activeDataSource,
    connectionStatus,
    loading,
    snapshotReceived,
    rowCount,
    setDataSource: setDataSourceId,
    refresh
  } = useDataTableSubscription({
    componentId: id,
    initialDataSourceId: component?.config.dataSourceId || null,
    gridApi,
    keyColumn: 'id',
    maxRecords: 50000,
    batchInterval: 100
  });
  
  // Set AG-Grid theme mode on body
  useEffect(() => {
    document.body.dataset.agThemeMode = appTheme;
  }, [appTheme]);
  
  // Find active profile
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  
  // Toggle toolbar
  const toggleToolbar = () => {
    const newState = !isToolbarExpanded;
    setIsToolbarExpanded(newState);
    localStorage.setItem(`datatable-toolbar-${id}`, newState.toString());
  };
  

  // Save data source selection to component config
  const handleDataSourceChange = useCallback((newDataSourceId: string | null) => {
    setDataSourceId(newDataSourceId);
    
    if (component) {
      updateComponent(id, {
        config: {
          ...component.config,
          dataSourceId: newDataSourceId || undefined
        }
      });
    }
  }, [component, id, updateComponent, setDataSourceId]);

  // Get column definitions from active data source or component config
  const columns = useMemo(() => {
    if (activeDataSource?.columnDefs) {
      return convertColumnDefinitions(activeDataSource.columnDefs);
    }
    return component?.config.columns || DEFAULT_COLUMNS;
  }, [activeDataSource?.columnDefs, component?.config.columns]);

  // Status bar configuration
  const statusBar = {
    statusPanels: [
      {
        statusPanel: 'agTotalRowCountComponent',
        align: 'left',
        key: 'totalRowCount',
      },
      {
        statusPanel: 'agFilteredRowCountComponent',
        align: 'left',
        key: 'filteredRowCount',
      },
      {
        statusPanel: 'agSelectedRowCountComponent',
        align: 'center',
        key: 'selectedRowCount',
      },
      {
        statusPanel: 'agAggregationComponent',
        align: 'right',
        key: 'aggregation',
      },
    ],
  };

  // Sidebar configuration with unique IDs per instance
  const sideBar = useMemo(() => ({
    toolPanels: [
      {
        id: `columns-${id}`,
        labelDefault: 'Columns',
        labelKey: 'columns',
        iconKey: 'columns',
        toolPanel: 'agColumnsToolPanel',
        minWidth: 225,
        maxWidth: 300,
        width: 250,
      },
      {
        id: `filters-${id}`,
        labelDefault: 'Filters',
        labelKey: 'filters',
        iconKey: 'filter',
        toolPanel: 'agFiltersToolPanel',
        minWidth: 180,
        maxWidth: 400,
        width: 250,
      },
    ],
    position: 'right' as const,
    defaultToolPanel: `columns-${id}`,
    hiddenByDefault: !sideBarVisible,
  }), [id, sideBarVisible]);

  // Sample data when no data source is connected
  const sampleRowData = [
    { id: 1, name: 'Item 1', value: 100, status: 'Active', date: '2024-01-20' },
    { id: 2, name: 'Item 2', value: 200, status: 'Pending', date: '2024-01-21' },
    { id: 3, name: 'Item 3', value: 300, status: 'Active', date: '2024-01-22' },
    { id: 4, name: 'Item 4', value: 400, status: 'Inactive', date: '2024-01-23' },
    { id: 5, name: 'Item 5', value: 500, status: 'Active', date: '2024-01-24' }
  ];
  
  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
    
    // Apply profile state if exists
    if (activeProfile?.config?.columnState) {
      params.api.applyColumnState({ state: activeProfile.config.columnState });
    }
    
    // Set initial data ONLY if no data source will be set
    // Don't add sample data if we're waiting for a data source
    if (!dataSourceId && !component?.config.dataSourceId) {
      params.api.applyTransaction({ add: sampleRowData });
    }
    
    // Restore sidebar state
    if (!sideBarVisible) {
      params.api.closeToolPanel();
    }
  };
  
  // Handle sidebar visibility changes
  const handleToolPanelVisibleChange = useCallback(() => {
    if (gridApi) {
      const isVisible = gridApi.isSideBarVisible();
      setSideBarVisible(isVisible);
      localStorage.setItem(`datatable-sidebar-${id}`, isVisible.toString());
    }
  }, [gridApi, id]);
  
  // Toggle sidebar manually
  const toggleSidebar = useCallback(() => {
    if (gridApi) {
      const newState = !gridApi.isSideBarVisible();
      if (newState) {
        gridApi.openToolPanel(`columns-${id}`);
      } else {
        gridApi.closeToolPanel();
      }
      setSideBarVisible(newState);
      localStorage.setItem(`datatable-sidebar-${id}`, newState.toString());
    }
  }, [gridApi, id]);
  
  // Save current grid state - only called explicitly by user action
  const saveCurrentState = useCallback(() => {
    if (!gridApi || !activeProfileId) return false;
    
    const state = {
      columnState: gridApi.getColumnState(),
      filterModel: gridApi.getFilterModel()
    };
    
    updateProfile(id, activeProfileId, state);
    return true;
  }, [gridApi, activeProfileId, id, updateProfile]);
  
  // Apply profile when it changes
  useEffect(() => {
    if (!gridApi || !activeProfileId) return;
    
    const profile = profiles.find(p => p.id === activeProfileId);
    if (profile?.config?.columnState) {
      gridApi.applyColumnState({ state: profile.config.columnState });
    }
    if (profile?.config?.filterModel) {
      gridApi.setFilterModel(profile.config.filterModel);
    }
  }, [activeProfileId, gridApi, profiles]);
  
  if (!component) return null;
  
  return (
    <div className="h-full flex flex-col bg-card relative">
      {/* Collapsible Toolbar */}
      <div
        className={cn(
          "border-b bg-muted/50 transition-all duration-300 ease-in-out overflow-hidden",
          isToolbarExpanded ? "h-12" : "h-0 border-0"
        )}
      >
        <DataTableToolbar
          componentId={id}
          dataSourceId={dataSourceId}
          onDataSourceChange={handleDataSourceChange}
          connectionStatus={connectionStatus}
          loading={loading}
          snapshotReceived={snapshotReceived}
          rowCount={rowCount}
          onRefresh={refresh}
          onToggleSidebar={toggleSidebar}
          sideBarVisible={sideBarVisible}
          onSaveProfile={saveCurrentState}
        />
      </div>
      
      {/* Expand/Collapse Pill */}
      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 z-10 transition-all duration-300",
        isToolbarExpanded ? "top-11" : "top-2"
      )}>
        <div
          className="bg-primary/10 backdrop-blur-md border border-primary/20 rounded-full px-3 py-1 cursor-pointer transition-all hover:bg-primary/20 hover:border-primary/30 shadow-sm"
          onClick={toggleToolbar}
        >
          {isToolbarExpanded ? (
            <ChevronUp className="h-4 w-4 text-primary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-primary" />
          )}
        </div>
      </div>
      
      <div className="flex-1 relative min-h-0" style={{ display: 'flex', flexDirection: 'column' }}>
        {loading && dataSourceId && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="text-center space-y-2">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">
                {snapshotReceived ? "Loading data..." : "Waiting for snapshot data..."}
              </p>
            </div>
          </div>
        )}
        <div className="ag-theme-quartz" style={{ flex: 1, minHeight: 0 }}>
          <AgGridReact
            key={`ag-grid-${id}`}
            ref={gridRef}
            columnDefs={columns}
            defaultColDef={DEFAULT_COL_DEF}
            onGridReady={onGridReady}
            onToolPanelVisibleChanged={handleToolPanelVisibleChange}
            // Enterprise features
            statusBar={statusBar}
            sideBar={sideBar}
            animateRows={true}
            rowSelection="multiple"
            enableCharts={true}
            // Performance optimizations
            asyncTransactionWaitMillis={60}
            suppressScrollOnNewData={true}
            // Row tracking
            getRowId={(params) => {
              const keyCol = activeDataSource?.keyColumn || 'id';
              return params.data[keyCol] || params.data.id || params.data._id;
            }}
            // Scrollbar settings
            alwaysShowVerticalScroll={true}
            alwaysShowHorizontalScroll={true}
            domLayout="normal"
          />
        </div>
      </div>
    </div>
  );
}