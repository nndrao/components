import { useState, useEffect, useCallback, useRef } from 'react';
import { useServices } from '@/components/agv1/providers/ServicesProvider';
import type { 
  WebSocketConfig, 
  ConnectionStatus,
  DataUpdate 
} from '@/types/agv1/datasource.types';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectOnError?: boolean;
}

export interface UseWebSocketReturn {
  status: ConnectionStatus;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  subscribe: (topic: string, callback: (data: any) => void) => () => void;
  publish: (topic: string, data: any) => void;
  error: Error | null;
  statistics: any;
}

/**
 * Hook for managing WebSocket connections
 */
export function useWebSocket(
  connectionId: string,
  config: WebSocketConfig,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const { webSocket } = useServices();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const connectionRef = useRef<any>(null);
  const subscriptionsRef = useRef<Map<string, () => void>>(new Map());

  // Create connection
  useEffect(() => {
    const createConnection = async () => {
      try {
        // Set up event listeners
        const unsubscribeStatus = webSocket.onStatusChange((status) => {
          setStatus(status as ConnectionStatus);
        });
        
        // Auto-connect if requested
        if (options.autoConnect) {
          await webSocket.connect(config.url, config);
        }
        
        // Store unsubscribe function
        connectionRef.current = { unsubscribeStatus };
      } catch (err) {
        setError(err as Error);
      }
    };

    createConnection();

    return () => {
      // Clean up subscriptions
      subscriptionsRef.current.forEach(unsubscribe => unsubscribe());
      subscriptionsRef.current.clear();
      
      // Clean up
      if (connectionRef.current?.unsubscribeStatus) {
        connectionRef.current.unsubscribeStatus();
      }
      
      // Disconnect
      webSocket.disconnect().catch(console.error);
    };
  }, [connectionId]);

  // Update status from webSocket service
  useEffect(() => {
    const currentStatus = webSocket.getStatus();
    setStatus(currentStatus);
  }, [webSocket]);

  const connect = useCallback(async () => {
    try {
      setError(null);
      await webSocket.connect(config.url, config);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [config, webSocket]);

  const disconnect = useCallback(async () => {
    try {
      await webSocket.disconnect();
      setError(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [webSocket]);

  const subscribe = useCallback((topic: string, callback: (data: any) => void): (() => void) => {
    if (status !== 'connected') {
      console.warn('Cannot subscribe: WebSocket is not connected');
      return () => {};
    }

    try {
      const unsubscribe = webSocket.subscribe(topic, callback);
      
      // Generate a unique ID for tracking
      const subscriptionId = `${topic}-${Date.now()}`;
      subscriptionsRef.current.set(subscriptionId, unsubscribe);
      
      return () => {
        unsubscribe();
        subscriptionsRef.current.delete(subscriptionId);
      };
    } catch (err) {
      console.error('Subscribe error:', err);
      return () => {};
    }
  }, [connectionId, status, webSocket]);

  const publish = useCallback((topic: string, data: any) => {
    if (status !== 'connected') {
      throw new Error('Cannot publish: WebSocket is not connected');
    }

    webSocket.send(topic, data);
  }, [connectionId, status, webSocket]);

  // Update statistics periodically
  useEffect(() => {
    if (status !== 'connected') {
      return;
    }

    // Statistics update disabled - getStatistics not available in interface
    // const updateStats = () => {
    //   const stats = webSocket.getStatistics();
    //   setStatistics(stats);
    // };

    // updateStats();
    // const interval = setInterval(updateStats, 5000);

    // return () => clearInterval(interval);
  }, [connectionId, status, webSocket]);

  return {
    status,
    connect,
    disconnect,
    subscribe,
    publish,
    error,
    statistics,
  };
}