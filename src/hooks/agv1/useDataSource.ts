import { useState, useEffect, useCallback, useRef } from 'react';
import { useServices } from '@/components/agv1/providers/ServicesProvider';
import type { 
  IDataSource,
  ConnectionStatus,
  DataUpdate,
  DataSourceDefinition 
} from '@/types';

export interface UseDataSourceOptions {
  autoConnect?: boolean;
  onUpdate?: (update: DataUpdate) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

export interface UseDataSourceReturn {
  dataSource: IDataSource | null;
  data: any[];
  status: ConnectionStatus;
  error: Error | null;
  loading: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  statistics: any;
}

/**
 * Hook for managing data source connections and subscriptions
 */
export function useDataSource(
  dataSourceId: string,
  options: UseDataSourceOptions = {}
): UseDataSourceReturn {
  const services = useServices();
  const dataSourceService = services?.dataSource;
  const [dataSource, setDataSource] = useState<IDataSource | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize data source
  useEffect(() => {
    const ds = dataSourceService.getDataSource(dataSourceId);
    if (ds) {
      setDataSource(ds);
      setStatus(ds.status);
      
      // Auto-connect if requested
      if (options.autoConnect && ds.status === 'disconnected') {
        connect();
      }
    } else {
      setError(new Error(`Data source '${dataSourceId}' not found`));
    }
  }, [dataSourceId, dataSourceService]);

  // Subscribe to data updates
  useEffect(() => {
    if (!dataSource || status !== 'connected') {
      return;
    }

    // Subscribe to updates
    const unsubscribe = dataSource.subscribe((update: DataUpdate) => {
      handleDataUpdate(update);
    });

    unsubscribeRef.current = unsubscribe;

    // Load initial data
    loadData();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [dataSource, status]);

  // Subscribe to status changes
  useEffect(() => {
    const unsubscribe = dataSourceService.onConnectionStatusChange((dsId: string, newStatus: string) => {
      if (dsId === dataSourceId) {
        setStatus(newStatus as ConnectionStatus);
        options.onStatusChange?.(newStatus as ConnectionStatus);
        
        // Update statistics on status change
        if (dataSource && 'getStatistics' in dataSource) {
          setStatistics((dataSource as any).getStatistics());
        }
      }
    });

    return unsubscribe;
  }, [dataSourceId, dataSourceService, options, dataSource]);

  // Subscribe to errors
  useEffect(() => {
    const unsubscribe = dataSourceService.onError((dsId: string, err: Error) => {
      if (dsId === dataSourceId) {
        setError(err);
        options.onError?.(err);
      }
    });

    return unsubscribe;
  }, [dataSourceId, dataSourceService, options]);

  const handleDataUpdate = useCallback((update: DataUpdate) => {
    // Handle different update types
    switch (update.type) {
      case 'snapshot':
        if (Array.isArray(update.data)) {
          setData(update.data);
        } else {
          setData([update.data]);
        }
        break;
        
      case 'insert':
        setData(prev => [...prev, update.data]);
        break;
        
      case 'update':
        if (update.metadata?.isBatch && Array.isArray(update.data)) {
          // Handle batch updates
          const updates = update.data;
          setData(prev => {
            const newData = [...prev];
            updates.forEach((u: DataUpdate) => {
              const index = newData.findIndex(item => 
                item['id'] === u.key
              );
              if (index !== -1) {
                newData[index] = { ...newData[index], ...u.data };
              }
            });
            return newData;
          });
        } else {
          // Single update
          setData(prev => {
            const index = prev.findIndex(item => 
              item['id'] === update.key
            );
            if (index !== -1) {
              const newData = [...prev];
              newData[index] = { ...newData[index], ...update.data };
              return newData;
            }
            return prev;
          });
        }
        break;
        
      case 'delete':
        setData(prev => prev.filter(item => 
          item['id'] !== update.key
        ));
        break;
        
      case 'clear':
        setData([]);
        break;
    }
    
    // Call update callback
    options.onUpdate?.(update);
    
    // Update statistics
    if (dataSource && 'getStatistics' in dataSource) {
      setStatistics((dataSource as any).getStatistics());
    }
  }, [dataSource, options]);

  const loadData = useCallback(async () => {
    if (!dataSource) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const initialData = await dataSource.getData();
      setData(initialData);
    } catch (err) {
      setError(err as Error);
      options.onError?.(err as Error);
    } finally {
      setLoading(false);
    }
  }, [dataSource, options]);

  const connect = useCallback(async () => {
    if (!dataSource) {
      throw new Error('Data source not initialized');
    }
    
    setError(null);
    
    try {
      await dataSourceService.connect(dataSourceId);
    } catch (err) {
      setError(err as Error);
      options.onError?.(err as Error);
      throw err;
    }
  }, [dataSource, dataSourceId, dataSourceService, options]);

  const disconnect = useCallback(async () => {
    if (!dataSource) {
      throw new Error('Data source not initialized');
    }
    
    try {
      await dataSourceService.disconnect(dataSourceId);
      setData([]);
      setError(null);
    } catch (err) {
      setError(err as Error);
      options.onError?.(err as Error);
      throw err;
    }
  }, [dataSource, dataSourceId, dataSourceService, options]);

  const refresh = useCallback(async () => {
    if (!dataSource || status !== 'connected') {
      return;
    }
    
    await loadData();
  }, [dataSource, status, loadData]);

  return {
    dataSource,
    data,
    status,
    error,
    loading,
    connect,
    disconnect,
    refresh,
    statistics,
  };
}

/**
 * Hook for creating and managing a data source
 */
export function useCreateDataSource(
  definition: DataSourceDefinition,
  options: UseDataSourceOptions = {}
): UseDataSourceReturn & { create: () => Promise<void> } {
  const services = useServices();
  const dataSourceService = services?.dataSource;
  const [created, setCreated] = useState(false);
  
  const create = useCallback(async () => {
    try {
      // Create data source instance based on definition
      // This is a placeholder - actual implementation would create the appropriate data source type
      const dataSourceInstance = {
        id: definition.id,
        name: definition.name,
        type: definition.type,
        status: 'disconnected' as const,
        connect: async () => {},
        disconnect: async () => {},
        subscribe: () => () => {},
        getData: async () => [],
        refresh: async () => {}
      } as IDataSource;
      
      dataSourceService.registerDataSource(dataSourceInstance);
      setCreated(true);
    } catch (err) {
      console.error('Failed to create data source:', err);
      throw err;
    }
  }, [definition, dataSourceService]);

  const dataSourceReturn = useDataSource(
    definition.id,
    created ? options : { ...options, autoConnect: false }
  );

  return {
    ...dataSourceReturn,
    create,
  };
}