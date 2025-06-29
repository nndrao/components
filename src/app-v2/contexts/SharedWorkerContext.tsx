/**
 * SharedWorker Context
 * 
 * Manages the lifecycle of the SharedWorker and provides access to worker status
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { WorkerDataProvider } from '../providers/data/WorkerDataProvider';

interface SharedWorkerContextType {
  /**
   * Whether SharedWorker is supported in the current browser
   */
  isSupported: boolean;
  
  /**
   * Whether SharedWorker is enabled via settings
   */
  isEnabled: boolean;
  
  /**
   * Whether SharedWorker is currently active and ready
   */
  isActive: boolean;
  
  /**
   * Error if SharedWorker failed to initialize
   */
  error: Error | null;
  
  /**
   * Force restart the SharedWorker
   */
  restart: () => void;
}

const SharedWorkerContext = createContext<SharedWorkerContextType | undefined>(undefined);

interface SharedWorkerProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export function SharedWorkerProvider({ children, enabled = true }: SharedWorkerProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const workerRef = useRef<SharedWorker | null>(null);
  
  const isSupported = WorkerDataProvider.isSupported();
  const isEnabled = enabled && isSupported;

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    let mounted = true;

    const initializeWorker = async () => {
      try {
        // Test SharedWorker creation
        const worker = new SharedWorker(
          '/shared-worker.js',
          { name: 'data-provider-worker' }
        );
        
        workerRef.current = worker;
        
        // Test connection
        const port = worker.port;
        port.start();
        
        // Wait for initial connection
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('SharedWorker connection timeout'));
          }, 5000);
          
          const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'CONNECTED') {
              clearTimeout(timeout);
              port.removeEventListener('message', handleMessage);
              resolve();
            }
          };
          
          port.addEventListener('message', handleMessage);
        });
        
        if (mounted) {
          setIsActive(true);
          setError(null);
          console.log('[SharedWorkerContext] SharedWorker initialized successfully');
        }
      } catch (err) {
        if (mounted) {
          setIsActive(false);
          setError(err as Error);
          console.error('[SharedWorkerContext] Failed to initialize SharedWorker:', err);
        }
      }
    };

    initializeWorker();

    return () => {
      mounted = false;
      if (workerRef.current) {
        try {
          workerRef.current.port.close();
        } catch (err) {
          console.error('[SharedWorkerContext] Error closing worker port:', err);
        }
        workerRef.current = null;
      }
    };
  }, [isEnabled]);

  const restart = () => {
    setIsActive(false);
    setError(null);
    
    if (workerRef.current) {
      try {
        workerRef.current.port.close();
      } catch (err) {
        console.error('[SharedWorkerContext] Error closing worker port:', err);
      }
      workerRef.current = null;
    }
    
    // Trigger re-initialization
    if (isEnabled) {
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  const value: SharedWorkerContextType = {
    isSupported,
    isEnabled,
    isActive,
    error,
    restart,
  };

  return (
    <SharedWorkerContext.Provider value={value}>
      {children}
    </SharedWorkerContext.Provider>
  );
}

export function useSharedWorker() {
  const context = useContext(SharedWorkerContext);
  if (!context) {
    throw new Error('useSharedWorker must be used within SharedWorkerProvider');
  }
  return context;
}