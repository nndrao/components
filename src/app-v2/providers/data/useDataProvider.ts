/**
 * useDataProvider Hook
 * 
 * React hook for using data providers in components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DataProvider,
  DataProviderConfig,
  DataProviderTrigger,
  ConnectionStatus,
  DataSubscription,
} from './data-provider.types';
import { DataProviderManager } from './DataProviderManager';

interface UseDataProviderOptions {
  /**
   * Provider configuration
   */
  config: DataProviderConfig;
  
  /**
   * Auto-connect on mount
   */
  autoConnect?: boolean;
  
  /**
   * Data handler
   */
  onData?: (data: any) => void;
  
  /**
   * Error handler
   */
  onError?: (error: Error) => void;
  
  /**
   * Connection status change handler
   */
  onStatusChange?: (status: ConnectionStatus) => void;
  
  /**
   * Data filter
   */
  filter?: (data: any) => boolean;
  
  /**
   * Data transform
   */
  transform?: (data: any) => any;
  
  /**
   * Manager instance (shared across components)
   */
  manager?: DataProviderManager;
}

export interface UseDataProviderResult {
  /**
   * Provider instance
   */
  provider: DataProvider | null;
  
  /**
   * Connection status
   */
  status: ConnectionStatus;
  
  /**
   * Last error
   */
  error: Error | null;
  
  /**
   * Last received data
   */
  data: any;
  
  /**
   * Data history
   */
  dataHistory: any[];
  
  /**
   * Connect to provider
   */
  connect: () => Promise<void>;
  
  /**
   * Disconnect from provider
   */
  disconnect: () => Promise<void>;
  
  /**
   * Send message/trigger
   */
  send: (trigger: DataProviderTrigger) => Promise<void>;
  
  /**
   * Clear data history
   */
  clearHistory: () => void;
  
  /**
   * Provider metadata
   */
  metadata?: {
    connectedAt?: number;
    messageCount?: number;
    lastMessageAt?: number;
  };
}

export function useDataProvider(options: UseDataProviderOptions): UseDataProviderResult {
  const {
    config,
    autoConnect = true,
    onData,
    onError,
    onStatusChange,
    filter,
    transform,
    manager: externalManager,
  } = options;

  // State
  const [provider, setProvider] = useState<DataProvider | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.Disconnected);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<any>(null);
  const [dataHistory, setDataHistory] = useState<any[]>([]);

  // Refs
  const managerRef = useRef<DataProviderManager>();
  const subscriptionRef = useRef<DataSubscription>();
  const isMountedRef = useRef(true);

  // Get or create manager
  const getManager = useCallback(() => {
    if (externalManager) {
      return externalManager;
    }
    if (!managerRef.current) {
      managerRef.current = new DataProviderManager({ autoConnect: false });
    }
    return managerRef.current;
  }, [externalManager]);

  // Initialize provider
  useEffect(() => {
    const initProvider = async () => {
      try {
        const manager = getManager();
        const newProvider = await manager.createProvider(config);
        
        if (isMountedRef.current) {
          setProvider(newProvider);
          setStatus(newProvider.state.status);
          
          // Set up event handlers
          newProvider.on('statusChange', (newStatus) => {
            if (isMountedRef.current) {
              setStatus(newStatus);
              onStatusChange?.(newStatus);
            }
          });
          
          newProvider.on('error', (err) => {
            if (isMountedRef.current) {
              setError(err);
              onError?.(err);
            }
          });
          
          // Subscribe to data
          subscriptionRef.current = manager.subscribe({
            providerId: config.id,
            filter,
            transform,
            handler: (newData) => {
              if (isMountedRef.current) {
                setData(newData);
                setDataHistory((prev) => [...prev, newData]);
                onData?.(newData);
              }
            },
          });
          
          // Auto-connect if enabled
          if (autoConnect) {
            await newProvider.connect();
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err as Error);
          onError?.(err as Error);
        }
      }
    };

    initProvider();

    // Cleanup
    return () => {
      isMountedRef.current = false;
      
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      
      if (provider && !externalManager) {
        const manager = getManager();
        manager.removeProvider(config.id);
      }
    };
  }, [config.id]); // Only re-init if provider ID changes

  // Connect
  const connect = useCallback(async () => {
    if (provider) {
      try {
        await provider.connect();
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    }
  }, [provider]);

  // Disconnect
  const disconnect = useCallback(async () => {
    if (provider) {
      try {
        await provider.disconnect();
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    }
  }, [provider]);

  // Send message
  const send = useCallback(async (trigger: DataProviderTrigger) => {
    if (provider) {
      try {
        await provider.send(trigger);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    } else {
      throw new Error('Provider not initialized');
    }
  }, [provider]);

  // Clear history
  const clearHistory = useCallback(() => {
    setDataHistory([]);
  }, []);

  return {
    provider,
    status,
    error,
    data,
    dataHistory,
    connect,
    disconnect,
    send,
    clearHistory,
    metadata: provider?.state.metadata,
  };
}