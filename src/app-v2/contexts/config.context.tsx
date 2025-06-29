/**
 * Configuration Context
 * 
 * Provides the configuration service to all components via React Context.
 * Handles initialization, loading states, and error boundaries.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ConfigService, Config, ConfigFilter } from '../services/config/config.types';
import { createConfigService } from '../services/config/config.service';

/**
 * Configuration context value
 */
interface ConfigContextValue extends ConfigService {
  isLoading: boolean;
  error: Error | null;
  retry: () => Promise<void>;
}

/**
 * Configuration context
 */
const ConfigContext = createContext<ConfigContextValue | null>(null);

/**
 * Hook to use the configuration service
 */
export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}

/**
 * Configuration provider props
 */
interface ConfigProviderProps {
  children: React.ReactNode;
  /**
   * Optional fallback UI for loading state
   */
  loadingFallback?: React.ReactNode;
  /**
   * Optional fallback UI for error state
   */
  errorFallback?: (error: Error, retry: () => void) => React.ReactNode;
  /**
   * Optional callback when service is ready
   */
  onReady?: (service: ConfigService) => void;
  /**
   * Optional callback for errors
   */
  onError?: (error: Error) => void;
}

/**
 * Default loading component
 */
const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading configuration service...</p>
    </div>
  </div>
);

/**
 * Default error component
 */
const DefaultErrorFallback = (error: Error, retry: () => void) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center max-w-md">
      <div className="text-destructive mb-4">
        <svg
          className="w-12 h-12 mx-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold mb-2">Configuration Service Error</h2>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <button
        onClick={retry}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
      >
        Retry
      </button>
    </div>
  </div>
);

/**
 * Configuration provider component
 */
export function ConfigProvider({
  children,
  loadingFallback = <DefaultLoadingFallback />,
  errorFallback = DefaultErrorFallback,
  onReady,
  onError
}: ConfigProviderProps) {
  const [service, setService] = useState<ConfigService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  /**
   * Initialize the configuration service
   */
  const initializeService = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const configService = await createConfigService();
      setService(configService);
      
      // Call onReady callback if provided
      if (onReady) {
        onReady(configService);
      }
      
      console.log('Configuration service initialized successfully');
    } catch (err) {
      const error = err as Error;
      setError(error);
      
      // Call onError callback if provided
      if (onError) {
        onError(error);
      }
      
      console.error('Failed to initialize configuration service:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onReady, onError]);
  
  /**
   * Retry initialization
   */
  const retry = useCallback(async () => {
    await initializeService();
  }, [initializeService]);
  
  /**
   * Initialize on mount
   */
  useEffect(() => {
    initializeService();
  }, [initializeService]);
  
  /**
   * Show loading fallback
   */
  if (isLoading) {
    return <>{loadingFallback}</>;
  }
  
  /**
   * Show error fallback
   */
  if (error || !service) {
    return <>{errorFallback(error || new Error('Service initialization failed'), retry)}</>;
  }
  
  /**
   * Create context value with service methods and state
   */
  const contextValue: ConfigContextValue = {
    ...service,
    isLoading,
    error,
    retry
  };
  
  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
}

/**
 * Hook to get a specific configuration
 */
export function useConfigItem(configId: string | undefined) {
  const configService = useConfig();
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!configId) {
      setConfig(null);
      return;
    }
    
    const loadConfig = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await configService.get(configId);
        setConfig(result);
      } catch (err) {
        setError(err as Error);
        setConfig(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadConfig();
  }, [configId, configService]);
  
  return { config, loading, error };
}

/**
 * Hook to list configurations with filter
 */
export function useConfigList(filter?: ConfigFilter) {
  const configService = useConfig();
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await configService.list(filter);
      setConfigs(result);
    } catch (err) {
      setError(err as Error);
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }, [configService, filter]);
  
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);
  
  return { configs, loading, error, refresh: loadConfigs };
}

/**
 * Hook to manage configuration CRUD operations
 */
export function useConfigManager() {
  const configService = useConfig();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const save = useCallback(async (config: Config) => {
    setSaving(true);
    setError(null);
    
    try {
      await configService.save(config);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [configService]);
  
  const update = useCallback(async (id: string, updates: Partial<Config>) => {
    setSaving(true);
    setError(null);
    
    try {
      await configService.update(id, updates);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [configService]);
  
  const remove = useCallback(async (id: string) => {
    setDeleting(true);
    setError(null);
    
    try {
      await configService.delete(id);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setDeleting(false);
    }
  }, [configService]);
  
  return {
    save,
    update,
    remove,
    saving,
    deleting,
    error
  };
}