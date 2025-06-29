/**
 * DataSourceContext
 * 
 * Context for managing data sources and their connections.
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { DataProviderManager } from '../providers/data/DataProviderManager';
import { ConnectionStatus, DataProvider } from '../providers/data/data-provider.types';
import { DataSourceConfig } from '../components/datasource/types';
import { useConfigStore } from '../stores/config.store';
import { useSettings } from './SettingsContext';
import { SharedWorkerDataProviderFactory } from '../providers/data/SharedWorkerDataProviderFactory';
import { defaultDataProviderFactory } from '../providers/data/DataProviderFactory';

interface DataSourceContextType {
  /**
   * All configured data sources
   */
  dataSources: DataSourceConfig[];
  
  /**
   * Connection status for each data source
   */
  connectionStatus: Map<string, ConnectionStatus>;
  
  /**
   * Provider manager
   */
  manager: DataProviderManager;
  
  /**
   * Actions
   */
  createDataSource: (config: DataSourceConfig) => Promise<void>;
  updateDataSource: (config: DataSourceConfig) => Promise<void>;
  deleteDataSource: (id: string) => Promise<void>;
  connectDataSource: (id: string) => Promise<void>;
  disconnectDataSource: (id: string) => Promise<void>;
  sendTrigger: (dataSourceId: string, trigger: string | Record<string, any>) => Promise<void>;
  reloadDataSources: () => Promise<void>;
}

const DataSourceContext = createContext<DataSourceContextType | null>(null);

export function useDataSource() {
  const context = useContext(DataSourceContext);
  if (!context) {
    throw new Error('useDataSource must be used within DataSourceProvider');
  }
  return context;
}

interface DataSourceProviderProps {
  children: React.ReactNode;
}

export function DataSourceProvider({ children }: DataSourceProviderProps) {
  const { saveConfig, deleteConfig } = useConfigStore();
  const { settings } = useSettings();
  const [dataSources, setDataSources] = useState<DataSourceConfig[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<Map<string, ConnectionStatus>>(new Map());
  
  const managerRef = useRef<DataProviderManager>();
  const providersRef = useRef<Map<string, DataProvider>>(new Map());
  const connectionQueueRef = useRef<string[]>([]);
  const isProcessingQueueRef = useRef<boolean>(false);
  const factoryRef = useRef<SharedWorkerDataProviderFactory>();

  // Reload data sources from config store - define early to avoid hoisting issues
  const reloadDataSources = useCallback(async () => {
    try {
      const configStore = useConfigStore.getState();
      if (!configStore.initialized) {
        await configStore.initialize();
      }
      
      await configStore.loadConfigs({ 
        componentType: 'DataSource' 
      });
      
      const configs = configStore.getConfigsByType('DataSource');
      
      if (configs.length > 0) {
        const dataSources = configs.map(config => {
          const dsConfig = config.settings as DataSourceConfig;
          return dsConfig;
        });
        setDataSources(dataSources);
      } else {
        setDataSources([]);
      }
    } catch (error) {
    }
  }, []);

  // Initialize manager with SharedWorker support
  useEffect(() => {
    // Create factory with SharedWorker support
    factoryRef.current = new SharedWorkerDataProviderFactory(
      defaultDataProviderFactory,
      settings.useSharedWorker
    );
    
    managerRef.current = new DataProviderManager({
      autoConnect: false,
      factory: factoryRef.current,
    });

    // Set up event handlers
    managerRef.current.on('provider:statusChange', (providerId: string, status: ConnectionStatus) => {
      setConnectionStatus(prev => new Map(prev).set(providerId, status));
    });

    return () => {
      managerRef.current?.destroy();
    };
  }, [settings.useSharedWorker]);

  // Expose reload function for WorkspaceManager
  useEffect(() => {
    (window as any).__dataSourceReload = reloadDataSources;
    (window as any).__testSnapshot = (dataSourceId: string) => {
      const provider = managerRef.current?.getProvider(dataSourceId);
      if (provider && 'testEmitSnapshot' in provider) {
        (provider as any).testEmitSnapshot();
      }
    };
    
    return () => {
      delete (window as any).__dataSourceReload;
      delete (window as any).__testSnapshot;
    };
  }, [reloadDataSources]);

  // Load data sources from config store
  useEffect(() => {
    const loadDataSources = async () => {
      try {
        // Initialize config store if needed
        const configStore = useConfigStore.getState();
        if (!configStore.initialized) {
          await configStore.initialize();
        }
        
        // Load data source configs
        await configStore.loadConfigs({ 
          componentType: 'DataSource' 
        });
        
        // Get loaded configs
        const configs = configStore.getConfigsByType('DataSource');
        
        if (configs.length > 0) {
          // Map to DataSourceConfig array
          const dataSources = configs.map(config => config.settings as DataSourceConfig);
          setDataSources(dataSources);
        }
      } catch (error) {
      }
    };
    
    loadDataSources();
  }, []);

  // Create data source
  const createDataSource = useCallback(async (config: DataSourceConfig) => {
    
    // Save to config store
    await saveConfig({
      configId: config.id,
      appId: 'app',
      userId: 'current-user',
      componentType: 'DataSource',
      name: config.displayName || config.name || 'Unnamed Data Source',
      settings: config,
      createdBy: 'current-user',
      creationTime: config.createdAt || Date.now(),
      updatedBy: 'current-user',
      lastUpdated: Date.now(),
    });
    
    setDataSources(prev => [...prev, config]);
    
    // Auto-connect if configured
    if (config.autoStart) {
      await connectDataSource(config.id);
    }
  }, [saveConfig]);

  // Update data source
  const updateDataSource = useCallback(async (config: DataSourceConfig) => {
    
    const existingConfig = useConfigStore.getState().getConfig(config.id);
    
    await saveConfig({
      configId: config.id,
      appId: 'app',
      userId: 'current-user',
      componentType: 'DataSource',
      name: config.displayName || config.name || existingConfig?.name || 'Unnamed Data Source',
      settings: config,
      createdBy: existingConfig?.createdBy || 'current-user',
      creationTime: existingConfig?.creationTime || config.createdAt || Date.now(),
      updatedBy: 'current-user',
      lastUpdated: Date.now(),
    });
    
    setDataSources(prev => prev.map(ds => ds.id === config.id ? config : ds));
  }, [saveConfig]);

  // Delete data source
  const deleteDataSource = useCallback(async (id: string) => {
    // Disconnect first
    await disconnectDataSource(id);
    
    // Delete from store
    await deleteConfig(id);
    
    setDataSources(prev => prev.filter(ds => ds.id !== id));
  }, [deleteConfig]);

  // Process connection queue
  const processConnectionQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || connectionQueueRef.current.length === 0) {
      return;
    }
    
    isProcessingQueueRef.current = true;
    
    while (connectionQueueRef.current.length > 0) {
      const id = connectionQueueRef.current.shift()!;
      const dataSource = dataSources.find(ds => ds.id === id);
      
      if (dataSource && managerRef.current) {
        try {
          // Check if provider already exists
          let provider = managerRef.current.getProvider(id);
          
          if (!provider) {
            provider = await managerRef.current.createProvider(dataSource);
            providersRef.current.set(id, provider);
          }
          
          await provider.connect();
          
          // Add delay between connections to prevent resource exhaustion
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`[DataSourceContext] Failed to connect ${id}:`, error);
        }
      }
    }
    
    isProcessingQueueRef.current = false;
  }, [dataSources]);

  // Connect data source (queued)
  const connectDataSource = useCallback(async (id: string) => {
    // Add to queue if not already present
    if (!connectionQueueRef.current.includes(id)) {
      connectionQueueRef.current.push(id);
    }
    
    // Process queue
    processConnectionQueue();
  }, [processConnectionQueue]);

  // Disconnect data source
  const disconnectDataSource = useCallback(async (id: string) => {
    if (!managerRef.current) return;
    
    try {
      await managerRef.current.removeProvider(id);
      providersRef.current.delete(id);
    } catch (error) {
      throw error;
    }
  }, []);

  // Send trigger to specific data source
  const sendTrigger = useCallback(async (dataSourceId: string, trigger: string | Record<string, any>) => {
    if (!managerRef.current) {
      throw new Error('Manager not initialized');
    }
    
    if (!providersRef.current.has(dataSourceId)) {
      throw new Error(`Data source ${dataSourceId} not connected`);
    }
    
    await managerRef.current.send(dataSourceId, trigger);
  }, []);

  const value: DataSourceContextType = {
    dataSources,
    connectionStatus,
    manager: managerRef.current!,
    createDataSource,
    updateDataSource,
    deleteDataSource,
    connectDataSource,
    disconnectDataSource,
    sendTrigger,
    reloadDataSources,
  };

  return (
    <DataSourceContext.Provider value={value}>
      {children}
    </DataSourceContext.Provider>
  );
}