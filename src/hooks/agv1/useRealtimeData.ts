import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDataSource } from './useDataSource';
import type { DataUpdate, ConnectionStatus } from '@/types';

export interface UseRealtimeDataOptions {
  autoConnect?: boolean;
  bufferSize?: number;
  updateInterval?: number;
  filter?: (data: any) => boolean;
  transform?: (data: any) => any;
  onUpdate?: (update: DataUpdate) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

export interface UseRealtimeDataReturn<T = any> {
  data: T[];
  status: ConnectionStatus;
  error: Error | null;
  loading: boolean;
  isRealtime: boolean;
  updates: DataUpdate[];
  statistics: {
    totalUpdates: number;
    updatesPerSecond: number;
    lastUpdateTime?: Date;
    bufferSize: number;
  };
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  clearUpdates: () => void;
  pauseUpdates: () => void;
  resumeUpdates: () => void;
}

/**
 * Hook for real-time data with automatic subscription management
 */
export function useRealtimeData<T = any>(
  dataSourceId: string,
  options: UseRealtimeDataOptions = {}
): UseRealtimeDataReturn<T> {
  const [updates, setUpdates] = useState<DataUpdate[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [statistics, setStatistics] = useState({
    totalUpdates: 0,
    updatesPerSecond: 0,
    lastUpdateTime: undefined as Date | undefined,
    bufferSize: 0,
  });
  
  const updateBufferRef = useRef<DataUpdate[]>([]);
  const updateCountRef = useRef(0);
  const lastUpdateTimeRef = useRef<Date | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use the base data source hook
  const dataSourceReturn = useDataSource(dataSourceId, {
    autoConnect: options.autoConnect,
    onUpdate: (update) => {
      if (!isPaused) {
        handleUpdate(update);
      }
      options.onUpdate?.(update);
    },
    onError: options.onError,
    onStatusChange: options.onStatusChange,
  });

  // Process and buffer updates
  const handleUpdate = useCallback((update: DataUpdate) => {
    // Update statistics
    updateCountRef.current++;
    lastUpdateTimeRef.current = new Date();
    
    // Add to update buffer
    updateBufferRef.current.push(update);
    
    // Limit buffer size
    const bufferSize = options.bufferSize || 100;
    if (updateBufferRef.current.length > bufferSize) {
      updateBufferRef.current = updateBufferRef.current.slice(-bufferSize);
    }
    
    setUpdates([...updateBufferRef.current]);
    
    // Update statistics
    setStatistics(prev => ({
      ...prev,
      totalUpdates: updateCountRef.current,
      lastUpdateTime: lastUpdateTimeRef.current || undefined,
      bufferSize: updateBufferRef.current.length,
    }));
  }, [options.bufferSize]);

  // Calculate updates per second
  useEffect(() => {
    const calculateUpdatesPerSecond = () => {
      const now = Date.now();
      const recentUpdates = updateBufferRef.current.filter(u => {
        const updateTime = new Date(u.timestamp).getTime();
        return now - updateTime < 1000;
      });
      
      setStatistics(prev => ({
        ...prev,
        updatesPerSecond: recentUpdates.length,
      }));
    };

    const interval = setInterval(calculateUpdatesPerSecond, 1000);
    return () => clearInterval(interval);
  }, []);

  // Apply filter and transform to data
  const processedData = useMemo(() => {
    let processed = dataSourceReturn.data;
    
    // Apply filter
    if (options.filter) {
      processed = processed.filter(options.filter);
    }
    
    // Apply transform
    if (options.transform) {
      processed = processed.map(options.transform);
    }
    
    return processed as T[];
  }, [dataSourceReturn.data, options.filter, options.transform]);

  // Batch update processing if updateInterval is specified
  useEffect(() => {
    if (!options.updateInterval || options.updateInterval <= 0) {
      return;
    }

    const processBufferedUpdates = () => {
      if (updateBufferRef.current.length > 0 && !isPaused) {
        const buffered = [...updateBufferRef.current];
        updateBufferRef.current = [];
        
        // Process all buffered updates
        buffered.forEach(update => {
          options.onUpdate?.(update);
        });
      }
    };

    updateIntervalRef.current = setInterval(processBufferedUpdates, options.updateInterval);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [options.updateInterval, options.onUpdate, isPaused]);

  const clearUpdates = useCallback(() => {
    updateBufferRef.current = [];
    setUpdates([]);
    updateCountRef.current = 0;
    lastUpdateTimeRef.current = null;
    setStatistics({
      totalUpdates: 0,
      updatesPerSecond: 0,
      lastUpdateTime: undefined,
      bufferSize: 0,
    });
  }, []);

  const pauseUpdates = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeUpdates = useCallback(() => {
    setIsPaused(false);
  }, []);

  return {
    data: processedData,
    status: dataSourceReturn.status,
    error: dataSourceReturn.error,
    loading: dataSourceReturn.loading,
    isRealtime: dataSourceReturn.status === 'connected' && !isPaused,
    updates,
    statistics,
    connect: dataSourceReturn.connect,
    disconnect: dataSourceReturn.disconnect,
    refresh: dataSourceReturn.refresh,
    clearUpdates,
    pauseUpdates,
    resumeUpdates,
  };
}

/**
 * Hook for real-time aggregated data
 */
export function useRealtimeAggregation<T = any>(
  dataSourceId: string,
  aggregationFn: (data: any[]) => T,
  options: UseRealtimeDataOptions = {}
): UseRealtimeDataReturn<T> & { aggregatedValue: T | null } {
  const realtimeData = useRealtimeData(dataSourceId, options);
  
  const aggregatedValue = useMemo(() => {
    if (realtimeData.data.length === 0) {
      return null;
    }
    
    try {
      return aggregationFn(realtimeData.data);
    } catch (error) {
      console.error('Aggregation error:', error);
      return null;
    }
  }, [realtimeData.data, aggregationFn]);

  return {
    ...realtimeData,
    aggregatedValue,
  };
}