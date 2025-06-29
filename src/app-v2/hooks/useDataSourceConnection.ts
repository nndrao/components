import { useState, useEffect, useCallback, useRef } from 'react';
import { useDataSource as useDataSourceContext } from '../contexts/DataSourceContext';
import { ConnectionStatus } from '../providers/data/data-provider.types';

interface UseDataSourceConnectionOptions {
  dataSourceId: string | null;
  onSnapshot?: (data: any[]) => void;
  onUpdate?: (data: any[]) => void;
  onError?: (error: Error) => void;
  // Advanced options from useDataSourceSubscription
  enableBatching?: boolean;
  batchInterval?: number;
  maxBatchSize?: number;
  keyColumn?: string;
  autoConnect?: boolean;
}

interface UseDataSourceConnectionResult {
  loading: boolean;
  error: Error | null;
  connectionStatus?: ConnectionStatus;
  refresh: () => Promise<void>;
  connected: boolean;
  hasSnapshot: boolean;
  effectiveKeyColumn: string;
}

/**
 * Unified hook for managing data source connections and subscriptions
 * Combines functionality from useDataSource and useDataSourceSubscription
 */
export function useDataSourceConnection({ 
  dataSourceId, 
  onSnapshot,
  onUpdate,
  onError,
  enableBatching = false,
  batchInterval = 100,
  maxBatchSize = 1000,
  keyColumn = 'id',
  autoConnect = true
}: UseDataSourceConnectionOptions): UseDataSourceConnectionResult {
  const { 
    dataSources,
    connectionStatus: connectionStatusMap,
    connectDataSource,
    manager
  } = useDataSourceContext();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasSnapshot, setHasSnapshot] = useState(false);
  
  const subscriptionRef = useRef<(() => void) | null>(null);
  const snapshotHandlerRef = useRef<(() => void) | null>(null);
  const batchRef = useRef<any[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSnapshotRef = useRef(false);
  
  const connectionStatus = dataSourceId ? connectionStatusMap.get(dataSourceId) : undefined;
  const connected = connectionStatus === ConnectionStatus.Connected;
  
  const activeDataSource = dataSources.find(ds => ds.id === dataSourceId);
  const effectiveKeyColumn = activeDataSource?.keyColumn || keyColumn;
  
  // Batch processing logic
  const processBatch = useCallback(() => {
    if (batchRef.current.length > 0 && onUpdate) {
      onUpdate(batchRef.current);
      batchRef.current = [];
    }
  }, [onUpdate]);
  
  const addToBatch = useCallback((updates: any[]) => {
    if (!enableBatching) {
      onUpdate?.(updates);
      return;
    }
    
    batchRef.current.push(...updates);
    
    if (batchRef.current.length >= maxBatchSize) {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
        batchTimerRef.current = null;
      }
      processBatch();
    } else if (!batchTimerRef.current) {
      batchTimerRef.current = setTimeout(() => {
        processBatch();
        batchTimerRef.current = null;
      }, batchInterval);
    }
  }, [enableBatching, maxBatchSize, batchInterval, processBatch, onUpdate]);
  
  // Refresh functionality
  const refresh = useCallback(async () => {
    if (!dataSourceId || !manager) return;
    
    setLoading(true);
    setHasSnapshot(false);
    hasSnapshotRef.current = false;
    
    try {
      manager.clearCachedSnapshot(dataSourceId);
      await manager.send(dataSourceId, { action: 'refresh' });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Refresh failed');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [dataSourceId, manager, onError]);
  
  // Auto-connect effect
  useEffect(() => {
    if (!dataSourceId || !autoConnect || connected) return;
    
    connectDataSource(dataSourceId).catch(err => {
      setError(err);
      onError?.(err);
    });
  }, [dataSourceId, autoConnect, connected, connectDataSource, onError]);
  
  // Subscribe to data source events
  useEffect(() => {
    if (!dataSourceId || !manager) return;
    
    setLoading(true);
    setError(null);
    hasSnapshotRef.current = false;
    
    // Subscribe to snapshot events
    const handleSnapshot = (data: any, providerId: string, metadata?: { isPartial: boolean; totalReceived: number }) => {
      if (providerId === dataSourceId) {
        const snapshotData = Array.isArray(data) ? data : data.data || [];
        
        if (metadata?.isPartial) {
          // Keep loading state during partial snapshots
          setLoading(true);
        } else {
          // Final snapshot
          setHasSnapshot(true);
          hasSnapshotRef.current = true;
          setLoading(false);
        }
        
        onSnapshot?.(snapshotData);
      }
    };
    
    // Subscribe to data updates
    const handleData = (data: any, providerId: string) => {
      if (providerId === dataSourceId) {
        // Only process updates after snapshot is received
        if (!hasSnapshotRef.current) {
          return;
        }
        const updates = Array.isArray(data) ? data : data.data || [];
        if (enableBatching) {
          addToBatch(updates);
        } else {
          onUpdate?.(updates);
        }
      }
    };
    
    // Listen to events
    manager.on('snapshot', handleSnapshot);
    manager.on('data', handleData);
    
    // Listen to error events
    const handleError = (providerId: string, error: Error) => {
      if (providerId === dataSourceId) {
        setError(error);
        setLoading(false);
        onError?.(error);
      }
    };
    
    // Listen to status changes
    const handleStatusChange = (providerId: string, status: ConnectionStatus) => {
      if (providerId === dataSourceId) {
        // If disconnected, reset snapshot state
        if (status === ConnectionStatus.Disconnected || status === ConnectionStatus.Error) {
          setHasSnapshot(false);
          hasSnapshotRef.current = false;
        }
      }
    };
    
    manager.on('provider:error', handleError);
    manager.on('provider:statusChange', handleStatusChange);
    
    subscriptionRef.current = () => {
      manager.off('snapshot', handleSnapshot);
      manager.off('data', handleData);
      manager.off('provider:error', handleError);
      manager.off('provider:statusChange', handleStatusChange);
    };
    
    // The WebSocketDataProvider will automatically trigger snapshot on connect
    // No need to manually trigger here
    
    return () => {
      subscriptionRef.current?.();
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
        processBatch();
      }
    };
  }, [dataSourceId, manager, connected, hasSnapshot, onSnapshot, onUpdate, onError, enableBatching, addToBatch, processBatch]);
  
  return {
    loading,
    error,
    connectionStatus,
    refresh,
    connected,
    hasSnapshot,
    effectiveKeyColumn
  };
}