/**
 * useDataSourceSubscription Hook
 * 
 * Allows components to subscribe to a specific data source
 * and receive its data independently.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDataSource } from '../contexts/DataSourceContext';
import { ConnectionStatus } from '../providers/data/data-provider.types';

interface UseDataSourceSubscriptionOptions {
  /**
   * Component ID for persistence
   */
  componentId: string;
  
  /**
   * Initial data source ID from component config
   */
  initialDataSourceId?: string | null;
}

export function useDataSourceSubscription({ 
  componentId, 
  initialDataSourceId 
}: UseDataSourceSubscriptionOptions) {
  const { 
    dataSources, 
    connectionStatus,
    connectDataSource,
    manager
  } = useDataSource();
  
  // Local state for this component's data source
  const [localDataSourceId, setLocalDataSourceId] = useState<string | null>(
    initialDataSourceId || null
  );
  const [localData, setLocalData] = useState<any[]>([]);
  
  // Batching for high-frequency updates
  const batchBuffer = useRef<any[]>([]);
  const batchTimer = useRef<NodeJS.Timeout>();
  const subscriberRef = useRef<(() => void) | null>(null);
  
  // Handle data batching
  const handleBatchedData = useCallback((receivedData: any) => {
    // Add to buffer
    if (Array.isArray(receivedData)) {
      batchBuffer.current.push(...receivedData);
    } else {
      batchBuffer.current.push(receivedData);
    }
    
    // Clear existing timer
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
    }
    
    // Set new timer - flush every 60ms
    batchTimer.current = setTimeout(() => {
      if (batchBuffer.current.length > 0) {
        setLocalData(prev => {
          // Keep last 10,000 records to prevent memory issues
          const newData = [...prev, ...batchBuffer.current];
          const maxRecords = 10000;
          if (newData.length > maxRecords) {
            return newData.slice(-maxRecords);
          }
          return newData;
        });
        
        console.log(`[useDataSourceSubscription] Flushed batch: ${batchBuffer.current.length} records`);
        batchBuffer.current = [];
      }
    }, 60); // 60ms batch interval
  }, []);
  
  // Subscribe to data source
  useEffect(() => {
    if (!localDataSourceId || !manager) return;
    
    console.log(`[useDataSourceSubscription] Subscribing to data source: ${localDataSourceId}`);
    
    // Clear previous data
    setLocalData([]);
    batchBuffer.current = [];
    
    // Subscribe to data events for this specific data source
    const handleData = (data: any, providerId: string) => {
      if (providerId === localDataSourceId) {
        handleBatchedData(data);
      }
    };
    
    manager.on('data', handleData);
    subscriberRef.current = () => manager.off('data', handleData);
    
    // Auto-connect if not connected
    const status = connectionStatus.get(localDataSourceId);
    if (status !== ConnectionStatus.Connected) {
      connectDataSource(localDataSourceId).catch(console.error);
    }
    
    return () => {
      if (subscriberRef.current) {
        subscriberRef.current();
        subscriberRef.current = null;
      }
      if (batchTimer.current) {
        clearTimeout(batchTimer.current);
      }
    };
  }, [localDataSourceId, manager, connectionStatus, connectDataSource, handleBatchedData]);
  
  // Set local data source
  const setDataSource = useCallback(async (dataSourceId: string | null) => {
    console.log(`[useDataSourceSubscription] Setting data source to: ${dataSourceId}`);
    setLocalDataSourceId(dataSourceId);
    
    // Auto-connect if setting a new data source
    if (dataSourceId && connectionStatus.get(dataSourceId) !== ConnectionStatus.Connected) {
      try {
        await connectDataSource(dataSourceId);
      } catch (error) {
        console.error('Failed to connect to data source:', error);
      }
    }
  }, [connectionStatus, connectDataSource]);
  
  // Get active data source config
  const activeDataSource = localDataSourceId 
    ? dataSources.find(ds => ds.id === localDataSourceId)
    : null;
  
  return {
    dataSourceId: localDataSourceId,
    setDataSource,
    data: localData,
    dataSource: activeDataSource,
    connectionStatus: localDataSourceId ? connectionStatus.get(localDataSourceId) : undefined,
  };
}