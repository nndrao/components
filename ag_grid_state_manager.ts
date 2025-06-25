import { 
  GridApi, 
  GridState, 
  ColDef, 
  GridOptions,
  ColumnState,
  ColumnGroupState
} from 'ag-grid-community';

/**
 * Enhanced GridState interface with all possible state properties for ag-grid v33+
 */
export interface ExtractedGridState extends GridState {
  // Core state properties
  version?: string;
  
  // Column-related state
  columnState?: ColumnState[];
  columnGroupState?: ColumnGroupState[];
  columnVisibility?: {
    hiddenColIds: string[];
  };
  
  // Filter state
  filter?: {
    filterModel?: any;
    advancedFilterModel?: any;
    quickFilterText?: string;
  };
  
  // Sort state
  sort?: {
    sortModel?: any[];
  };
  
  // Row grouping state
  rowGroup?: {
    groupColIds: string[];
    openGroupIds?: string[];
  };
  
  // Pivot state
  pivot?: {
    pivotMode?: boolean;
    pivotColIds?: string[];
    valueColIds?: string[];
  };
  
  // Row selection state
  rowSelection?: {
    selectAll?: boolean;
    toggledNodes?: string[];
    mode?: 'singleRow' | 'multiRow';
  };
  
  // Pagination state
  pagination?: {
    currentPage?: number;
    pageSize?: number;
  };
  
  // Sidebar state
  sideBar?: {
    visible?: boolean;
    position?: 'left' | 'right';
    defaultToolPanel?: string;
    toolPanels?: any[];
  };
  
  // Range selection state
  rangeSelection?: {
    cellRanges?: any[];
  };
  
  // Focus state
  focusedCell?: {
    rowIndex?: number;
    rowPinned?: 'top' | 'bottom' | null;
    colId?: string;
  };
  
  // Scroll state
  scroll?: {
    top?: number;
    left?: number;
  };
  
  // Row pinning state
  rowPinning?: {
    pinnedTopRowData?: any[];
    pinnedBottomRowData?: any[];
  };
  
  // Expansion state (for master-detail and tree data)
  expansion?: {
    expandedGroupIds?: string[];
    expandedMasterIds?: string[];
  };
  
  // Custom state for application-specific data
  custom?: Record<string, any>;
}

/**
 * Configuration options for state extraction
 */
export interface StateExtractionOptions {
  includeColumnState?: boolean;
  includeFilterState?: boolean;
  includeSortState?: boolean;
  includeRowGroupState?: boolean;
  includePivotState?: boolean;
  includeRowSelectionState?: boolean;
  includePaginationState?: boolean;
  includeSideBarState?: boolean;
  includeRangeSelectionState?: boolean;
  includeFocusState?: boolean;
  includeScrollState?: boolean;
  includeRowPinningState?: boolean;
  includeExpansionState?: boolean;
  includeCustomState?: boolean;
  customStateExtractor?: (api: GridApi) => Record<string, any>;
}

/**
 * Configuration options for state application
 */
export interface StateApplicationOptions {
  suppressEvents?: boolean;
  applyOrder?: ('columns' | 'filters' | 'sort' | 'rowGroup' | 'pivot' | 'selection' | 'pagination' | 'other')[];
  resetBeforeApply?: boolean;
  partialColumnState?: boolean;
  customStateApplier?: (api: GridApi, customState: Record<string, any>) => void;
}

/**
 * Extracts comprehensive state from ag-grid v33+
 * @param api - The grid API instance
 * @param options - Configuration for what state to extract
 * @returns Complete grid state object
 */
export function extractGridState(
  api: GridApi, 
  options: StateExtractionOptions = {}
): ExtractedGridState {
  // Default to extracting all state
  const {
    includeColumnState = true,
    includeFilterState = true,
    includeSortState = true,
    includeRowGroupState = true,
    includePivotState = true,
    includeRowSelectionState = true,
    includePaginationState = true,
    includeSideBarState = true,
    includeRangeSelectionState = true,
    includeFocusState = true,
    includeScrollState = true,
    includeRowPinningState = true,
    includeExpansionState = true,
    includeCustomState = true,
    customStateExtractor
  } = options;

  try {
    // Get the core grid state using the native API
    const baseState = api.getState();
    
    // Initialize the enhanced state object
    const state: ExtractedGridState = {
      ...baseState,
      version: '33+' // Mark as v33+ compatible
    };

    // Extract column state if requested
    if (includeColumnState) {
      try {
        state.columnState = api.getColumnState();
        state.columnGroupState = api.getColumnGroupState();
      } catch (error) {
        console.warn('Failed to extract column state:', error);
      }
    }

    // Extract filter state if requested
    if (includeFilterState) {
      try {
        const filterModel = api.getFilterModel();
        const quickFilterText = api.getQuickFilter();
        
        state.filter = {
          filterModel,
          quickFilterText: quickFilterText || undefined,
          // Note: advancedFilterModel is included in baseState in v33+
        };
      } catch (error) {
        console.warn('Failed to extract filter state:', error);
      }
    }

    // Extract sort state if requested
    if (includeSortState) {
      try {
        const sortModel = api.getSortModel();
        state.sort = {
          sortModel: sortModel.length > 0 ? sortModel : undefined
        };
      } catch (error) {
        console.warn('Failed to extract sort state:', error);
      }
    }

    // Extract pagination state if requested
    if (includePaginationState) {
      try {
        if (api.paginationIsLastPageFound && api.paginationIsLastPageFound()) {
          state.pagination = {
            currentPage: api.paginationGetCurrentPage?.() || 0,
            pageSize: api.paginationGetPageSize?.() || 100
          };
        }
      } catch (error) {
        console.warn('Failed to extract pagination state:', error);
      }
    }

    // Extract sidebar state if requested
    if (includeSideBarState) {
      try {
        const sideBarVisible = api.isSideBarVisible?.();
        if (sideBarVisible !== undefined) {
          state.sideBar = {
            visible: sideBarVisible,
            defaultToolPanel: api.getOpenedToolPanel?.() || undefined
          };
        }
      } catch (error) {
        console.warn('Failed to extract sidebar state:', error);
      }
    }

    // Extract range selection state if requested
    if (includeRangeSelectionState) {
      try {
        const cellRanges = api.getCellRanges?.();
        if (cellRanges && cellRanges.length > 0) {
          state.rangeSelection = {
            cellRanges: cellRanges.map(range => ({
              startRow: range.startRow,
              endRow: range.endRow,
              columns: range.columns?.map(col => col.getColId())
            }))
          };
        }
      } catch (error) {
        console.warn('Failed to extract range selection state:', error);
      }
    }

    // Extract focused cell state if requested
    if (includeFocusState) {
      try {
        const focusedCell = api.getFocusedCell();
        if (focusedCell) {
          state.focusedCell = {
            rowIndex: focusedCell.rowIndex,
            rowPinned: focusedCell.rowPinned,
            colId: focusedCell.column?.getColId()
          };
        }
      } catch (error) {
        console.warn('Failed to extract focus state:', error);
      }
    }

    // Extract scroll state if requested
    if (includeScrollState) {
      try {
        const scrollPosition = api.getHorizontalPixelRange?.();
        const verticalScroll = api.getVerticalPixelRange?.();
        
        if (scrollPosition || verticalScroll) {
          state.scroll = {
            left: scrollPosition?.left,
            top: verticalScroll?.top
          };
        }
      } catch (error) {
        console.warn('Failed to extract scroll state:', error);
      }
    }

    // Extract expansion state if requested
    if (includeExpansionState) {
      try {
        const expandedGroups: string[] = [];
        const expandedMaster: string[] = [];
        
        api.forEachNode(node => {
          if (node.group && node.expanded) {
            expandedGroups.push(node.key || node.id || '');
          }
          if (node.master && node.expanded) {
            expandedMaster.push(node.id || '');
          }
        });

        if (expandedGroups.length > 0 || expandedMaster.length > 0) {
          state.expansion = {
            expandedGroupIds: expandedGroups.length > 0 ? expandedGroups : undefined,
            expandedMasterIds: expandedMaster.length > 0 ? expandedMaster : undefined
          };
        }
      } catch (error) {
        console.warn('Failed to extract expansion state:', error);
      }
    }

    // Extract custom state if requested
    if (includeCustomState && customStateExtractor) {
      try {
        state.custom = customStateExtractor(api);
      } catch (error) {
        console.warn('Failed to extract custom state:', error);
      }
    }

    return state;
  } catch (error) {
    console.error('Failed to extract grid state:', error);
    throw error;
  }
}

/**
 * Applies comprehensive state to ag-grid v33+ in an optimized manner
 * @param api - The grid API instance
 * @param state - The state to apply
 * @param options - Configuration for how to apply the state
 */
export function applyGridState(
  api: GridApi, 
  state: ExtractedGridState, 
  options: StateApplicationOptions = {}
): void {
  const {
    suppressEvents = true,
    applyOrder = ['columns', 'filters', 'sort', 'rowGroup', 'pivot', 'selection', 'pagination', 'other'],
    resetBeforeApply = false,
    partialColumnState = false,
    customStateApplier
  } = options;

  if (!state) {
    console.warn('No state provided to apply');
    return;
  }

  try {
    // Batch operations for performance
    api.setGridOption('suppressEvents', suppressEvents);

    // Reset grid state if requested
    if (resetBeforeApply) {
      try {
        api.resetColumnState();
        api.setFilterModel(null);
        api.setSortModel([]);
      } catch (error) {
        console.warn('Failed to reset grid state:', error);
      }
    }

    // Apply state in specified order for optimal performance
    for (const category of applyOrder) {
      try {
        switch (category) {
          case 'columns':
            await applyColumnState(api, state, partialColumnState);
            break;
          case 'filters':
            await applyFilterState(api, state);
            break;
          case 'sort':
            await applySortState(api, state);
            break;
          case 'rowGroup':
            await applyRowGroupState(api, state);
            break;
          case 'pivot':
            await applyPivotState(api, state);
            break;
          case 'selection':
            await applySelectionState(api, state);
            break;
          case 'pagination':
            await applyPaginationState(api, state);
            break;
          case 'other':
            await applyOtherStates(api, state, customStateApplier);
            break;
        }
      } catch (error) {
        console.warn(`Failed to apply ${category} state:`, error);
      }
    }

    // Use the native setState if available for remaining state
    if (state.version !== '33+') {
      try {
        api.setState?.(state);
      } catch (error) {
        console.warn('Failed to apply remaining state via setState:', error);
      }
    }

  } catch (error) {
    console.error('Failed to apply grid state:', error);
    throw error;
  } finally {
    // Re-enable events
    api.setGridOption('suppressEvents', false);
  }
}

/**
 * Apply column state optimally
 */
async function applyColumnState(api: GridApi, state: ExtractedGridState, partialColumnState: boolean): Promise<void> {
  if (state.columnState) {
    api.applyColumnState({
      state: state.columnState,
      applyOrder: true,
      defaultState: partialColumnState ? undefined : { sort: null, sortIndex: null }
    });
  }

  if (state.columnGroupState) {
    api.setColumnGroupState(state.columnGroupState);
  }

  if (state.columnVisibility?.hiddenColIds) {
    const columnDefs = api.getColumnDefs();
    columnDefs?.forEach((colDef: ColDef) => {
      if (colDef.field && state.columnVisibility?.hiddenColIds.includes(colDef.field)) {
        api.setColumnsVisible([colDef.field], false);
      }
    });
  }
}

/**
 * Apply filter state optimally
 */
async function applyFilterState(api: GridApi, state: ExtractedGridState): Promise<void> {
  if (state.filter?.filterModel) {
    api.setFilterModel(state.filter.filterModel);
  }

  if (state.filter?.quickFilterText) {
    api.setGridOption('quickFilterText', state.filter.quickFilterText);
  }

  if (state.filter?.advancedFilterModel) {
    api.setAdvancedFilterModel?.(state.filter.advancedFilterModel);
  }
}

/**
 * Apply sort state optimally
 */
async function applySortState(api: GridApi, state: ExtractedGridState): Promise<void> {
  if (state.sort?.sortModel) {
    api.setSortModel(state.sort.sortModel);
  }
}

/**
 * Apply row group state optimally
 */
async function applyRowGroupState(api: GridApi, state: ExtractedGridState): Promise<void> {
  if (state.rowGroup?.groupColIds) {
    api.setRowGroupColumns(state.rowGroup.groupColIds);
  }

  // Restore group expansion state
  if (state.expansion?.expandedGroupIds) {
    state.expansion.expandedGroupIds.forEach(groupId => {
      const node = api.getRowNode(groupId);
      if (node && node.group) {
        node.setExpanded(true);
      }
    });
  }
}

/**
 * Apply pivot state optimally
 */
async function applyPivotState(api: GridApi, state: ExtractedGridState): Promise<void> {
  if (state.pivot?.pivotMode !== undefined) {
    api.setPivotMode(state.pivot.pivotMode);
  }

  if (state.pivot?.pivotColIds) {
    api.setPivotColumns(state.pivot.pivotColIds);
  }

  if (state.pivot?.valueColIds) {
    api.setValueColumns(state.pivot.valueColIds);
  }
}

/**
 * Apply selection state optimally
 */
async function applySelectionState(api: GridApi, state: ExtractedGridState): Promise<void> {
  if (state.rowSelection) {
    if (state.rowSelection.selectAll) {
      api.selectAll();
    } else if (state.rowSelection.toggledNodes) {
      state.rowSelection.toggledNodes.forEach(nodeId => {
        const node = api.getRowNode(nodeId);
        if (node) {
          node.setSelected(true);
        }
      });
    }
  }
}

/**
 * Apply pagination state optimally
 */
async function applyPaginationState(api: GridApi, state: ExtractedGridState): Promise<void> {
  if (state.pagination?.pageSize) {
    api.paginationSetPageSize?.(state.pagination.pageSize);
  }

  if (state.pagination?.currentPage !== undefined) {
    api.paginationGoToPage?.(state.pagination.currentPage);
  }
}

/**
 * Apply other states (sidebar, focus, scroll, etc.)
 */
async function applyOtherStates(
  api: GridApi, 
  state: ExtractedGridState, 
  customStateApplier?: (api: GridApi, customState: Record<string, any>) => void
): Promise<void> {
  // Apply sidebar state
  if (state.sideBar?.visible !== undefined) {
    if (state.sideBar.visible) {
      api.openToolPanel?.(state.sideBar.defaultToolPanel || 'columns');
    } else {
      api.closeToolPanel?.();
    }
  }

  // Apply focus state
  if (state.focusedCell) {
    try {
      api.setFocusedCell(
        state.focusedCell.rowIndex || 0,
        state.focusedCell.colId || '',
        state.focusedCell.rowPinned || null
      );
    } catch (error) {
      console.warn('Failed to restore focus state:', error);
    }
  }

  // Apply scroll state
  if (state.scroll) {
    try {
      if (state.scroll.left !== undefined) {
        api.ensureColumnVisible?.(api.getAllDisplayedColumns()[0], 'start');
      }
      if (state.scroll.top !== undefined) {
        api.ensureIndexVisible?.(Math.floor(state.scroll.top / 25)); // Estimate row height
      }
    } catch (error) {
      console.warn('Failed to restore scroll state:', error);
    }
  }

  // Apply custom state
  if (state.custom && customStateApplier) {
    try {
      customStateApplier(api, state.custom);
    } catch (error) {
      console.warn('Failed to apply custom state:', error);
    }
  }
}

/**
 * Utility function to serialize state for storage
 */
export function serializeGridState(state: ExtractedGridState): string {
  try {
    return JSON.stringify(state, null, 2);
  } catch (error) {
    console.error('Failed to serialize grid state:', error);
    throw error;
  }
}

/**
 * Utility function to deserialize state from storage
 */
export function deserializeGridState(serializedState: string): ExtractedGridState {
  try {
    return JSON.parse(serializedState);
  } catch (error) {
    console.error('Failed to deserialize grid state:', error);
    throw error;
  }
}

/**
 * Utility function to validate state compatibility
 */
export function validateStateCompatibility(state: ExtractedGridState): boolean {
  return !!(state && (state.version === '33+' || !state.version));
}

/**
 * Example usage and integration helpers
 */
export class AgGridStateManager {
  private api: GridApi;
  private options: StateExtractionOptions;

  constructor(api: GridApi, options: StateExtractionOptions = {}) {
    this.api = api;
    this.options = options;
  }

  /**
   * Extract current state
   */
  extractState(): ExtractedGridState {
    return extractGridState(this.api, this.options);
  }

  /**
   * Apply state
   */
  applyState(state: ExtractedGridState, options?: StateApplicationOptions): void {
    applyGridState(this.api, state, options);
  }

  /**
   * Save state to localStorage
   */
  saveToLocalStorage(key: string): void {
    const state = this.extractState();
    localStorage.setItem(key, serializeGridState(state));
  }

  /**
   * Load state from localStorage
   */
  loadFromLocalStorage(key: string, options?: StateApplicationOptions): boolean {
    try {
      const serializedState = localStorage.getItem(key);
      if (serializedState) {
        const state = deserializeGridState(serializedState);
        if (validateStateCompatibility(state)) {
          this.applyState(state, options);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to load state from localStorage:', error);
      return false;
    }
  }
}