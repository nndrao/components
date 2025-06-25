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
  const [dataSources, setDataSources] = useState<DataSourceConfig[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<Map<string, ConnectionStatus>>(new Map());
  
  const managerRef = useRef<DataProviderManager>();
  const providersRef = useRef<Map<string, DataProvider>>(new Map());

  // Reload data sources from config store - define early to avoid hoisting issues
  const reloadDataSources = useCallback(async () => {
    console.log('[DataSourceContext] Reloading data sources...');
    try {
      const configStore = useConfigStore.getState();
      if (!configStore.initialized) {
        console.log('[DataSourceContext] Config store not initialized, initializing...');
        await configStore.initialize();
      }
      
      console.log('[DataSourceContext] Loading configs from store...');
      await configStore.loadConfigs({ 
        componentType: 'DataSource' 
      });
      
      const configs = configStore.getConfigsByType('DataSource');
      console.log('[DataSourceContext] Reloaded configs:', configs.length);
      
      if (configs.length > 0) {
        const dataSources = configs.map(config => {
          console.log('[DataSourceContext] Config:', config.configId, config.name);
          return config.settings as DataSourceConfig;
        });
        console.log('[DataSourceContext] Setting data sources:', dataSources);
        setDataSources(dataSources);
      } else {
        console.log('[DataSourceContext] No data sources found after reload');
        setDataSources([]);
      }
    } catch (error) {
      console.error('[DataSourceContext] Failed to reload data sources:', error);
    }
  }, []);

  // Initialize manager
  useEffect(() => {
    managerRef.current = new DataProviderManager({
      autoConnect: false,
    });

    // Set up event handlers
    managerRef.current.on('provider:statusChange', (providerId: string, status: ConnectionStatus) => {
      setConnectionStatus(prev => new Map(prev).set(providerId, status));
    });

    return () => {
      managerRef.current?.destroy();
    };
  }, []);

  // Expose reload function for WorkspaceManager
  useEffect(() => {
    (window as any).__dataSourceReload = reloadDataSources;
    
    return () => {
      delete (window as any).__dataSourceReload;
    };
  }, [reloadDataSources]);

  // Load data sources from config store
  useEffect(() => {
    const loadDataSources = async () => {
      console.log('[DataSourceContext] Initial load of data sources...');
      try {
        // Initialize config store if needed
        const configStore = useConfigStore.getState();
        if (!configStore.initialized) {
          console.log('[DataSourceContext] Initializing config store...');
          await configStore.initialize();
        }
        
        // Load data source configs
        console.log('[DataSourceContext] Loading configs from store...');
        await configStore.loadConfigs({ 
          componentType: 'DataSource' 
        });
        
        // Get loaded configs
        const configs = configStore.getConfigsByType('DataSource');
        console.log('[DataSourceContext] Found configs on initial load:', configs.length);
        
        if (configs.length > 0) {
          // Map to DataSourceConfig array
          const dataSources = configs.map(config => config.settings as DataSourceConfig);
          console.log('[DataSourceContext] Mapped data sources:', dataSources);
          setDataSources(dataSources);
        } else {
          console.log('[DataSourceContext] No data sources found on initial load');
        }
      } catch (error) {
        console.error('[DataSourceContext] Failed to load data sources:', error);
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

  // Connect data source
  const connectDataSource = useCallback(async (id: string) => {
    const dataSource = dataSources.find(ds => ds.id === id);
    if (!dataSource || !managerRef.current) return;
    
    try {
      const provider = await managerRef.current.createProvider(dataSource);
      providersRef.current.set(id, provider);
      await provider.connect();
    } catch (error) {
      console.error('Failed to connect data source:', error);
      throw error;
    }
  }, [dataSources]);

  // Disconnect data source
  const disconnectDataSource = useCallback(async (id: string) => {
    if (!managerRef.current) return;
    
    try {
      await managerRef.current.removeProvider(id);
      providersRef.current.delete(id);
    } catch (error) {
      console.error('Failed to disconnect data source:', error);
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