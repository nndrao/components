/**
 * useDataTableSubscription Hook
 * 
 * Enhanced data subscription hook specifically for DataTable with AG-Grid transaction support.
 * Ensures complete isolation between DataTable instances.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GridApi } from 'ag-grid-community';
import { useDataSource } from '../contexts/DataSourceContext';
import { ConnectionStatus } from '../providers/data/data-provider.types';

interface UseDataTableSubscriptionOptions {
  /**
   * Unique component ID for this DataTable instance
   */
  componentId: string;
  
  /**
   * Initial data source ID from component config
   */
  initialDataSourceId?: string | null;
  
  /**
   * AG-Grid API instance
   */
  gridApi: GridApi | null;
  
  /**
   * Key column for row identification
   */
  keyColumn?: string;
  
  /**
   * Maximum records to keep in memory
   */
  maxRecords?: number;
  
  /**
   * Batch update interval in milliseconds
   */
  batchInterval?: number;
}

interface DataTableState {
  loading: boolean;
  snapshotReceived: boolean;
  error: string | null;
  rowCount: number;
  lastUpdate: number;
}

export function useDataTableSubscription({ 
  componentId, 
  initialDataSourceId,
  gridApi,
  keyColumn = 'id',
  maxRecords = 50000,
  batchInterval = 100
}: UseDataTableSubscriptionOptions) {
  const { 
    dataSources, 
    connectionStatus,
    connectDataSource,
    manager
  } = useDataSource();
  
  // Component-specific state
  const [localDataSourceId, setLocalDataSourceId] = useState<string | null>(
    initialDataSourceId || null
  );
  const [state, setState] = useState<DataTableState>({
    loading: false,
    snapshotReceived: false,
    error: null,
    rowCount: 0,
    lastUpdate: 0
  });
  
  // Component-specific refs to ensure isolation
  const componentIdRef = useRef(componentId);
  const updateBatchRef = useRef<any[]>([]);
  const deleteBatchRef = useRef<string[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout>();
  const subscriptionRef = useRef<(() => void) | null>(null);
  const snapshotHandlerRef = useRef<(() => void) | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const rowDataMapRef = useRef<Map<string, any>>(new Map());
  const snapshotProcessedRef = useRef<string | null>(null); // Track which data source snapshot was processed
  const hasSnapshotRef = useRef<boolean>(false); // Track if any snapshot has been received
  const isSnapshotFullyCompleteRef = useRef<boolean>(false); // Track if final snapshot batch has been received
  const firstBatchReceivedRef = useRef<boolean>(false); // Track if first batch has been received
  
  // Get active data source configuration
  const activeDataSource = useMemo(() => {
    return localDataSourceId 
      ? dataSources.find(ds => ds.id === localDataSourceId)
      : null;
  }, [localDataSourceId, dataSources]);
  
  // Use keyColumn from datasource if available
  const effectiveKeyColumn = activeDataSource?.keyColumn || keyColumn;
  
  // Memoize key extractor
  const getRowKey = useCallback((row: any) => {
    return row[effectiveKeyColumn] || row.id || row._id;
  }, [effectiveKeyColumn]);
  
  // Process batched updates using AG-Grid transactions
  const processBatchedUpdates = useCallback(() => {
    if (!gridApi || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    
    try {
      const updates = updateBatchRef.current;
      const deletes = deleteBatchRef.current;
      
      if (updates.length > 0 || deletes.length > 0) {
        // Apply transaction
        gridApi.applyTransactionAsync({
          update: updates,
          remove: deletes.map(id => ({ [effectiveKeyColumn]: id }))
        });
        
        console.log(`[DataTable-${componentId}] Applied transaction: ${updates.length} updates, ${deletes.length} deletes`);
        
        // Clear batches
        updateBatchRef.current = [];
        deleteBatchRef.current = [];
        
        // Update row count
        setState(prev => ({
          ...prev,
          rowCount: gridApi.getDisplayedRowCount(),
          lastUpdate: Date.now()
        }));
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [gridApi, componentId, effectiveKeyColumn]);
  
  // Handle snapshot data with AG-Grid transactions
  const handleSnapshot = useCallback((data: any, dataSourceId: string, metadata?: { isPartial: boolean; totalReceived: number }) => {
    console.log(`[DataTable-${componentId}] handleSnapshot called for ${dataSourceId}, metadata:`, metadata);
    
    if (componentIdRef.current !== componentId) {
      console.log(`[DataTable-${componentId}] Component ID mismatch, ignoring snapshot`);
      return;
    }
    
    const snapshotData = Array.isArray(data) ? data : [data];
    
    if (gridApi) {
      // Handle partial snapshots
      if (metadata?.isPartial) {
        // First batch - clear existing data
        if (!firstBatchReceivedRef.current) {
          console.log(`[DataTable-${componentId}] First batch received, clearing existing data`);
          
          const existingRows: any[] = [];
          gridApi.forEachNode(node => {
            if (node.data) existingRows.push(node.data);
          });
          
          if (existingRows.length > 0) {
            gridApi.applyTransaction({
              remove: existingRows
            });
          }
          
          rowDataMapRef.current.clear();
          firstBatchReceivedRef.current = true;
        }
        
        // Add batch data to map
        snapshotData.forEach(row => {
          const key = getRowKey(row);
          if (key) {
            rowDataMapRef.current.set(key, row);
          }
        });
        
        // Add batch to grid
        console.log(`[DataTable-${componentId}] Adding batch of ${snapshotData.length} rows. Total received: ${metadata.totalReceived}`);
        
        if (snapshotData.length > 0) {
          gridApi.applyTransactionAsync({
            add: snapshotData,
            addIndex: gridApi.getDisplayedRowCount()
          });
        }
        
        setState(prev => ({ 
          ...prev, 
          loading: true, // Keep loading state during partial updates
          rowCount: metadata.totalReceived,
          lastUpdate: Date.now()
        }));
      } else {
        // Final batch
        console.log(`[DataTable-${componentId}] Final batch received. Total snapshot: ${metadata?.totalReceived || snapshotData.length} records`);
        
        // Add any remaining data
        if (snapshotData.length > 0) {
          snapshotData.forEach(row => {
            const key = getRowKey(row);
            if (key) {
              rowDataMapRef.current.set(key, row);
            }
          });
          
          gridApi.applyTransactionAsync({
            add: snapshotData,
            addIndex: gridApi.getDisplayedRowCount()
          });
        }
        
        setState(prev => ({ 
          ...prev, 
          snapshotReceived: true, 
          loading: false,
          rowCount: metadata?.totalReceived || rowDataMapRef.current.size,
          lastUpdate: Date.now()
        }));
        
        // Mark snapshot as fully complete
        isSnapshotFullyCompleteRef.current = true;
        hasSnapshotRef.current = true;
        snapshotProcessedRef.current = dataSourceId;
        
        console.log(`[DataTable-${componentId}] Snapshot fully complete for data source: ${dataSourceId}`);
      }
    } else {
      console.error(`[DataTable-${componentId}] Grid API not available when processing snapshot!`);
    }
  }, [componentId, gridApi, getRowKey]);
  
  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((data: any) => {
    console.log(`[DataTable-${componentId}] handleRealtimeUpdate called with ${Array.isArray(data) ? data.length + ' records' : '1 record'}`);
    
    if (componentIdRef.current !== componentId) {
      console.log(`[DataTable-${componentId}] Component ID mismatch in realtime update`);
      return;
    }
    
    if (!isSnapshotFullyCompleteRef.current) {
      console.log(`[DataTable-${componentId}] Ignoring realtime update - snapshot not fully complete yet`);
      return;
    }
    
    if (!gridApi) {
      console.log(`[DataTable-${componentId}] No grid API available for realtime update`);
      return;
    }
    
    const updates = Array.isArray(data) ? data : [data];
    
    let updateCount = 0;
    let newCount = 0;
    
    updates.forEach(row => {
      const key = getRowKey(row);
      if (key) {
        // Check if this is an update or new row
        if (rowDataMapRef.current.has(key)) {
          updateBatchRef.current.push(row);
          updateCount++;
        } else {
          updateBatchRef.current.push(row);
          rowDataMapRef.current.set(key, row);
          newCount++;
        }
      } else {
        console.warn(`[DataTable-${componentId}] Row missing key column: ${effectiveKeyColumn}`, row);
      }
    });
    
    console.log(`[DataTable-${componentId}] Batched ${updateCount} updates and ${newCount} new rows. Total pending: ${updateBatchRef.current.length}`);
    
    // Process immediately if batch is getting too large
    const maxBatchSize = 50; // Reduced from 100
    if (updateBatchRef.current.length >= maxBatchSize) {
      console.log(`[DataTable-${componentId}] Batch size (${updateBatchRef.current.length}) exceeded max (${maxBatchSize}), processing immediately`);
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
        batchTimerRef.current = undefined;
      }
      processBatchedUpdates();
    } else {
      // Clear existing timer
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
      
      // Set new timer for batch processing
      batchTimerRef.current = setTimeout(() => {
        console.log(`[DataTable-${componentId}] Batch timer fired, processing updates...`);
        processBatchedUpdates();
      }, batchInterval);
    }
  }, [componentId, getRowKey, processBatchedUpdates, batchInterval]);
  
  // Subscribe to data source with component-specific filtering
  useEffect(() => {
    if (!localDataSourceId || !manager) return;
    
    console.log(`[DataTable-${componentId}] Subscribing to data source: ${localDataSourceId}`);
    
    // Check if there's a large pending batch from previous session
    if (updateBatchRef.current.length > 0) {
      console.warn(`[DataTable-${componentId}] Found ${updateBatchRef.current.length} pending updates on mount, clearing...`);
      updateBatchRef.current = [];
      deleteBatchRef.current = [];
    }
    
    // Reset component state
    setState({ 
      loading: true, 
      snapshotReceived: false, 
      error: null,
      rowCount: 0,
      lastUpdate: 0
    });
    rowDataMapRef.current.clear();
    updateBatchRef.current = [];
    deleteBatchRef.current = [];
    
    // Always reset snapshot tracking when data source changes or component re-subscribes
    snapshotProcessedRef.current = null;
    hasSnapshotRef.current = false;
    isSnapshotFullyCompleteRef.current = false;
    firstBatchReceivedRef.current = false;
    
    // Component-specific event handlers with additional logging
    const handleSnapshotEvent = (data: any, providerId: string, metadata?: any) => {
      console.log(`[DataTable-${componentId}] Received snapshot event from provider ${providerId}, expecting ${localDataSourceId}, metadata:`, metadata);
      if (providerId === localDataSourceId && componentIdRef.current === componentId) {
        handleSnapshot(data, providerId, metadata);
      }
    };
    
    const handleDataEvent = (data: any, providerId: string) => {
      console.log(`[DataTable-${componentId}] Received data event from provider ${providerId}, expecting ${localDataSourceId}`);
      if (providerId === localDataSourceId && componentIdRef.current === componentId) {
        handleRealtimeUpdate(data);
      } else {
        console.log(`[DataTable-${componentId}] Ignoring data event - provider mismatch or component mismatch`);
      }
    };
    
    // Subscribe to events
    manager.on('snapshot', handleSnapshotEvent);
    manager.on('data', handleDataEvent);
    
    snapshotHandlerRef.current = () => manager.off('snapshot', handleSnapshotEvent);
    subscriptionRef.current = () => manager.off('data', handleDataEvent);
    
    // Skip cached snapshot for batched delivery - we'll get fresh data
    // The WebSocketDataProvider will send batched snapshots on connect
    
    // Auto-connect if needed
    const status = connectionStatus.get(localDataSourceId);
    if (status !== ConnectionStatus.Connected) {
      connectDataSource(localDataSourceId).catch(error => {
        console.error(`[DataTable-${componentId}] Failed to connect:`, error);
        setState(prev => ({ ...prev, error: error.message, loading: false }));
      });
    }
    
    // Cleanup
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
      if (snapshotHandlerRef.current) {
        snapshotHandlerRef.current();
        snapshotHandlerRef.current = null;
      }
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
    };
  }, [localDataSourceId, componentId, manager, connectionStatus, connectDataSource, handleSnapshot, handleRealtimeUpdate]);
  
  // Set data source with validation
  const setDataSource = useCallback(async (dataSourceId: string | null) => {
    console.log(`[DataTable-${componentId}] Setting data source to: ${dataSourceId}`);
    
    // Clear any pending batches
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      processBatchedUpdates();
    }
    
    setLocalDataSourceId(dataSourceId);
    
    if (dataSourceId && connectionStatus.get(dataSourceId) !== ConnectionStatus.Connected) {
      try {
        await connectDataSource(dataSourceId);
      } catch (error) {
        console.error(`[DataTable-${componentId}] Connection failed:`, error);
      }
    }
  }, [componentId, connectionStatus, connectDataSource, processBatchedUpdates]);
  
  // Refresh data
  const refresh = useCallback(async () => {
    if (!localDataSourceId || !manager) return;
    
    setState(prev => ({ ...prev, loading: true }));
    
    // Reset snapshot tracking to allow new snapshot
    snapshotProcessedRef.current = null;
    hasSnapshotRef.current = false;
    isSnapshotFullyCompleteRef.current = false;
    firstBatchReceivedRef.current = false;
    
    // Clear grid if API is available
    if (gridApi) {
      const allRows: any[] = [];
      gridApi.forEachNode(node => {
        if (node.data) allRows.push(node.data);
      });
      
      if (allRows.length > 0) {
        gridApi.applyTransaction({ remove: allRows });
      }
    }
    
    // Trigger refresh
    const provider = manager.getProvider(localDataSourceId);
    if (provider?.send) {
      await provider.send({ action: 'refresh' });
    }
  }, [localDataSourceId, manager, gridApi]);
  
  return {
    // Data source management
    dataSourceId: localDataSourceId,
    setDataSource,
    dataSource: activeDataSource,
    
    // Connection state
    connectionStatus: localDataSourceId ? connectionStatus.get(localDataSourceId) : undefined,
    
    // Component state
    loading: state.loading,
    snapshotReceived: state.snapshotReceived,
    error: state.error,
    rowCount: state.rowCount,
    lastUpdate: state.lastUpdate,
    
    // Actions
    refresh,
    
    // Component isolation info
    componentId,
    isIsolated: true
  };
}