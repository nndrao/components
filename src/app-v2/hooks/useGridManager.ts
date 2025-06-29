import { useCallback, useRef } from 'react';
import { GridApi } from 'ag-grid-community';

interface UseGridManagerOptions {
  gridApi: GridApi | null;
  keyColumn?: string;
  maxRecords?: number;
}

interface UseGridManagerResult {
  applySnapshot: (data: any[]) => void;
  applyUpdates: (updates: any[], deletes?: string[]) => void;
  clearGrid: () => void;
  getRowCount: () => number;
}

/**
 * Hook for managing AG-Grid operations
 */
export function useGridManager({ 
  gridApi, 
  keyColumn = 'id',
  maxRecords = 50000 
}: UseGridManagerOptions): UseGridManagerResult {
  const rowDataMapRef = useRef<Map<string, any>>(new Map());
  
  // Get row key from data
  const getRowKey = useCallback((row: any) => {
    return row[keyColumn] || row.id || row._id;
  }, [keyColumn]);
  
  // Apply snapshot data to grid
  const applySnapshot = useCallback((data: any[]) => {
    if (!gridApi) return;
    
    
    // Clear existing data map
    rowDataMapRef.current.clear();
    
    // Build new data map
    data.forEach(row => {
      const key = getRowKey(row);
      if (key) {
        rowDataMapRef.current.set(key, row);
      }
    });
    
    // Clear existing rows
    const existingRows: any[] = [];
    gridApi.forEachNode(node => {
      if (node.data) existingRows.push(node.data);
    });
    
    
    if (existingRows.length > 0) {
      gridApi.applyTransaction({ remove: existingRows });
    }
    
    // Apply new data
    if (data.length > 1000) {
      // Use async for large datasets
      gridApi.applyTransactionAsync({
        add: data.slice(0, maxRecords),
        addIndex: 0
      });
    } else {
      gridApi.applyTransaction({
        add: data,
        addIndex: 0
      });
    }
    
  }, [gridApi, getRowKey, maxRecords]);
  
  // Apply incremental updates
  const applyUpdates = useCallback((updates: any[], deletes: string[] = []) => {
    if (!gridApi) return;
    
    const updateRows: any[] = [];
    const addRows: any[] = [];
    
    // Process updates
    updates.forEach(row => {
      const key = getRowKey(row);
      if (key) {
        if (rowDataMapRef.current.has(key)) {
          updateRows.push(row);
        } else {
          addRows.push(row);
          rowDataMapRef.current.set(key, row);
        }
      }
    });
    
    // Process deletes
    const removeRows = deletes.map(id => ({ [keyColumn]: id }));
    deletes.forEach(id => rowDataMapRef.current.delete(id));
    
    // Apply transaction
    if (updateRows.length > 0 || addRows.length > 0 || removeRows.length > 0) {
      gridApi.applyTransactionAsync({
        update: updateRows,
        add: addRows,
        remove: removeRows
      });
    }
  }, [gridApi, getRowKey, keyColumn]);
  
  // Clear all grid data
  const clearGrid = useCallback(() => {
    if (!gridApi) return;
    
    const allRows: any[] = [];
    gridApi.forEachNode(node => {
      if (node.data) allRows.push(node.data);
    });
    
    if (allRows.length > 0) {
      gridApi.applyTransaction({ remove: allRows });
    }
    
    rowDataMapRef.current.clear();
  }, [gridApi]);
  
  // Get current row count
  const getRowCount = useCallback(() => {
    return gridApi?.getDisplayedRowCount() || 0;
  }, [gridApi]);
  
  return {
    applySnapshot,
    applyUpdates,
    clearGrid,
    getRowCount
  };
}