import { GridApi, ColDef, ColumnState, FilterModel } from 'ag-grid-community';
import { createLogger } from '../utils/logger';

const logger = createLogger('GridService');

export interface GridState {
  columnState: ColumnState[];
  filterModel: FilterModel;
}

export class GridService {
  /**
   * Apply snapshot data to grid, replacing all existing data
   */
  static applySnapshot(api: GridApi, data: any[], keyColumn: string = 'id'): void {
    if (!api) {
      logger.warn('Grid API not available for snapshot');
      return;
    }
    
    // Clear existing data
    const existingRows: any[] = [];
    api.forEachNode(node => {
      if (node.data) existingRows.push(node.data);
    });
    
    if (existingRows.length > 0) {
      api.applyTransaction({ remove: existingRows });
    }
    
    // Apply new data
    if (data.length > 1000) {
      api.applyTransactionAsync({ add: data, addIndex: 0 });
    } else {
      api.applyTransaction({ add: data, addIndex: 0 });
    }
    
    logger.debug(`Applied snapshot with ${data.length} rows`);
  }
  
  /**
   * Apply incremental updates to grid
   */
  static applyUpdates(
    api: GridApi, 
    updates: any[], 
    deletes: string[] = [], 
    keyColumn: string = 'id'
  ): void {
    if (!api || (updates.length === 0 && deletes.length === 0)) {
      return;
    }
    
    const removeRows = deletes.map(id => ({ [keyColumn]: id }));
    
    api.applyTransactionAsync({
      update: updates,
      remove: removeRows
    });
    
    logger.debug(`Applied ${updates.length} updates and ${deletes.length} deletes`);
  }
  
  /**
   * Get current grid state for persistence
   */
  static getState(api: GridApi): GridState {
    return {
      columnState: api.getColumnState(),
      filterModel: api.getFilterModel()
    };
  }
  
  /**
   * Apply saved grid state
   */
  static applyState(api: GridApi, state: GridState): void {
    if (state.columnState) {
      api.applyColumnState({ state: state.columnState });
    }
    if (state.filterModel) {
      api.setFilterModel(state.filterModel);
    }
  }
  
  /**
   * Clear all data from grid
   */
  static clearGrid(api: GridApi): void {
    const allRows: any[] = [];
    api.forEachNode(node => {
      if (node.data) allRows.push(node.data);
    });
    
    if (allRows.length > 0) {
      api.applyTransaction({ remove: allRows });
    }
  }
  
  /**
   * Get row by key
   */
  static getRowByKey(api: GridApi, key: string, keyColumn: string = 'id'): any {
    let result = null;
    api.forEachNode(node => {
      if (node.data && node.data[keyColumn] === key) {
        result = node.data;
      }
    });
    return result;
  }
}