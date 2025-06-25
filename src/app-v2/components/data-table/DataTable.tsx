import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { GridApi, GridReadyEvent, ColDef, themeQuartz } from 'ag-grid-community';
import { useAppStore } from '../../store';
import { ProfileBar } from './ProfileBar';
import { DataSourceSelector } from './DataSourceSelector';
import { useTheme } from '../../contexts/ThemeContext';
import { useDataSourceSubscription } from '../../hooks/useDataSourceSubscription';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Profile } from '../../types';

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
  
  // Get everything from store with stable references
  const component = useAppStore(state => state.components.get(id));
  const profiles = useAppStore(state => state.profiles.get(id)) || emptyProfiles;
  const activeProfileId = useAppStore(state => state.activeProfiles.get(id));
  const updateProfile = useAppStore(state => state.updateProfile);
  const updateComponent = useAppStore(state => state.updateComponent);
  
  // Use local data source subscription
  const { 
    dataSourceId, 
    setDataSource, 
    data, 
    dataSource: activeDataSource 
  } = useDataSourceSubscription({
    componentId: id,
    initialDataSourceId: component?.config.dataSourceId
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
  
  // Sample columns if none configured
  const defaultColumns: ColDef[] = [
    { field: 'id', headerName: 'ID', width: 100 },
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'value', headerName: 'Value', width: 150 },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'date', headerName: 'Date', width: 150 }
  ];

  // Save data source selection to component config
  useEffect(() => {
    // Only update if component exists and the dataSourceId actually changed
    if (component && component.config.dataSourceId !== dataSourceId) {
      updateComponent(id, {
        config: {
          ...component.config,
          dataSourceId: dataSourceId || null // Save null when cleared
        }
      });
    }
  }, [dataSourceId]); // Only depend on dataSourceId to avoid loops

  // Get column definitions from active data source or component config
  const columns = activeDataSource?.columnDefs || component?.config.columns || defaultColumns;
  
  // Use real-time data from data source or sample data
  const rowData = dataSourceId ? data : [
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
  };
  
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
        <div className="flex items-center justify-between px-4 py-2">
          <h3 className="text-sm font-semibold">{component.title}</h3>
          <div className="flex items-center gap-2">
            <DataSourceSelector 
              value={dataSourceId}
              onChange={setDataSource}
            />
            <ProfileBar componentId={id} onSaveState={saveCurrentState} />
          </div>
        </div>
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
      
      <div className="flex-1">
        <AgGridReact
          ref={gridRef}
          theme={theme}
          rowData={rowData}
          columnDefs={columns}
          onGridReady={onGridReady}
          // Grid state is only saved explicitly by user action via ProfileBar
          animateRows={true}
          rowSelection="multiple"
          // Performance optimizations for high-frequency updates
          asyncTransactionWaitMillis={60}
          suppressScrollOnNewData={true}
          // Row tracking for updates
          getRowId={(params) => {
            if (activeDataSource?.keyColumn) {
              return params.data[activeDataSource.keyColumn];
            }
            return params.data.positionId || params.data.id || params.data._id;
          }}
        />
      </div>
    </div>
  );
}