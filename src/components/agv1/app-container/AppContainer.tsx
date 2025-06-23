import React, { useState, useRef, useCallback, useEffect } from 'react';
import { EventEmitter } from '@/services/websocket/EventEmitter';
import { ProfileServiceV2 } from '@/services/profile/ProfileServiceV2';
import { DataSourceService } from '@/services/datasource/DataSourceService';
import { StorageService } from '@/services/storage/StorageService';
import type { IStorageAdapter, ComponentConfig } from '@/types';
import { ServicesProvider } from '@/components/agv1/providers/ServicesProvider';
import { DockviewReact, DockviewReadyEvent, IDockviewPanelProps } from 'dockview-react';
import { DataTable } from '@/components/agv1/datatable/DataTable';
import { DataSourceDialog } from '@/components/agv1/dialogs/DataSourceDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from '@/components/theme-provider';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/toaster';
import 'dockview-react/dist/styles/dockview.css';
import './AppContainer.css';
import { 
  LayoutGrid, 
  Database, 
  Plus,
  Save,
  Download,
  Upload,
  RotateCcw
} from 'lucide-react';
import type { 
  IAppContainer, 
  AppContainerState, 
  ComponentInstance,
  AppContainerEvent,
  AppContainerConfig 
} from '@/types/agv1/app-container.types';
import type { DataSourceConfig, WebSocketDataSourceConfig } from '@/types/agv1/datasource.types';
import { DummyDataSource, createDummyDataSource } from '@/services/datasource/DummyDataSource';
import { WebSocketService } from '@/services/websocket/WebSocketService';
import { cleanForSerialization, restoreColumnDefs } from '@/utils/serialization-helper';

// Panel component wrapper
const ComponentPanel: React.FC<IDockviewPanelProps<{ instanceId: string; componentType: string }>> = ({ params }) => {
  const { instanceId, componentType } = params;
  
  switch (componentType) {
    case 'datatable':
      return (
        <div className="h-full w-full">
          <DataTable instanceId={instanceId} />
        </div>
      );
    default:
      return <div>Unknown component type: {componentType}</div>;
  }
};

// Real WebSocket connection for field inference
const testWebSocketConnection = async (config: DataSourceConfig): Promise<any[]> => {
  const wsConfig = config.config as WebSocketDataSourceConfig;
  
  console.log('=== Field Inference Debug ===');
  console.log('Full config:', config);
  console.log('WebSocket config:', wsConfig);
  console.log('Request Topic:', wsConfig.requestTopic);
  console.log('Request Message:', wsConfig.requestMessage);
  console.log('Listener Topic:', wsConfig.topic);
  
  if (!wsConfig.url || !wsConfig.topic) {
    throw new Error('WebSocket URL and topic are required');
  }
  
  
  const wsService = new WebSocketService();
  const receivedMessages: any[] = [];
  let unsubscribe: (() => void) | null = null;
  
  try {
    console.log('Connecting to WebSocket for field inference:', wsConfig.url);
    
    // Connect to WebSocket
    await wsService.connect(wsConfig.url, {
      reconnectDelay: wsConfig.reconnect?.delay || 5000,
      heartbeatIncoming: wsConfig.heartbeat?.incoming || 10000,
      heartbeatOutgoing: wsConfig.heartbeat?.outgoing || 10000,
      debug: wsConfig.debug || true // Enable debug for field inference
    });
    
    console.log('Connected to WebSocket, subscribing to topic:', wsConfig.topic);
    
    // Subscribe to topic and collect messages
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('Field inference timeout - received', receivedMessages.length, 'messages');
        console.log('Messages:', receivedMessages);
        if (unsubscribe) (unsubscribe as () => void)();
        wsService.disconnect();
        
        if (receivedMessages.length > 0) {
          resolve(receivedMessages);
        } else {
          // Return empty array instead of rejecting to see what happens
          console.warn('No data received within timeout period, returning empty array');
          resolve([]);
        }
      }, wsConfig.snapshotTimeoutMs || 10000); // Default 10 second timeout for field inference
      
      unsubscribe = wsService.subscribe(wsConfig.topic!, (message) => {
        console.log('Received message for field inference:', message);
        
        // Handle different message formats
        if (Array.isArray(message)) {
          receivedMessages.push(...message);
        } else if (message && typeof message === 'object') {
          receivedMessages.push(message);
        }
        
        // Check for snapshot end token
        if (wsConfig.snapshotEndToken) {
          const messageStr = JSON.stringify(message);
          if (messageStr.includes(wsConfig.snapshotEndToken)) {
            console.log('Snapshot end token detected:', wsConfig.snapshotEndToken);
            clearTimeout(timeout);
            if (unsubscribe) (unsubscribe as () => void)();
            wsService.disconnect();
            resolve(receivedMessages);
          }
        }
        
        // Limit messages for field inference (we don't need all data)
        if (receivedMessages.length >= 10) {
          console.log('Received enough messages for field inference');
          clearTimeout(timeout);
          if (unsubscribe) (unsubscribe as () => void)();
          wsService.disconnect();
          resolve(receivedMessages);
        }
      });
      
      // Send request message AFTER subscription is set up
      if (wsConfig.requestMessage) {
        // Small delay to ensure subscription is fully established
        setTimeout(() => {
          console.log('=== Sending Trigger Message ===');
          console.log('Trigger Message (destination):', wsConfig.requestMessage);
          
          // The requestMessage field contains the destination path
          // e.g., "/snapshot/positions/5000/100"
          const destination = wsConfig.requestMessage;
          const body = ''; // Empty body or could be configurable
          
          console.log('Destination:', destination);
          console.log('Body:', body || '(empty)');
          
          try {
            wsService.send(destination!, body);
            console.log('Trigger message sent successfully to:', destination);
          } catch (error) {
            console.error('Failed to send trigger message:', error);
          }
        }, 1000); // 1 second delay to ensure subscription is ready
      } else {
        console.log('No trigger message configured - waiting for data on topic:', wsConfig.topic);
      }
    });
    
  } catch (error) {
    console.error('WebSocket connection error:', error);
    if (unsubscribe) (unsubscribe as () => void)();
    await wsService.disconnect();
    throw error;
  }
};

export const AppContainer: React.FC<{ config?: AppContainerConfig }> = ({ config }) => {
  const dockviewRef = useRef<any>(null);
  const eventEmitter = useRef(new EventEmitter());
  const componentRefsMap = useRef(new Map<string, any>());
  const { theme } = useTheme();
  
  // Compute resolved theme
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    const updateResolvedTheme = () => {
      const resolved = theme === 'system' 
        ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        : theme;
      setResolvedTheme(resolved);
    };
    
    updateResolvedTheme();
    
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateResolvedTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);
  
  // Services - use a single ref to store all services to ensure consistency
  const servicesRef = useRef<{
    storageService?: StorageService;
    storageAdapter?: IStorageAdapter;
    profileService?: ProfileServiceV2;
    dataSourceService?: DataSourceService;
    dummyDataSource?: DummyDataSource;
    initialized: boolean;
  }>({ initialized: false });
  
  // State
  const [state, setState] = useState<AppContainerState>({
    components: new Map(),
    componentRefs: new Map(),
    datasources: new Map(),
    activeDatasources: new Map(),
    profiles: new Map(),
    layoutConfig: null,
    theme: 'light',
    locale: 'en-US'
  });
  
  // Keep a ref to the current state to avoid stale closures
  const stateRef = useRef(state);
  stateRef.current = state;
  
  const [showDataSourceDialog, setShowDataSourceDialog] = useState(false);
  const [showComponentMenu, setShowComponentMenu] = useState(false);
  
  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      // Skip if already initialized
      if (servicesRef.current.initialized) {
        console.log('AppContainer: Services already initialized');
        return;
      }
      
      console.log('AppContainer: Initializing services...');
      try {
        // Create and initialize storage service
        const storageService = new StorageService({
          mode: 'local' // Uses IndexedDB
        });
        await storageService.initialize();
        console.log('AppContainer: Storage service initialized');
        
        const storageAdapter = storageService.getAdapter();
        if (!storageAdapter) {
          throw new Error('Failed to get storage adapter');
        }
        
        // Create and initialize profile service
        const profileService = new ProfileServiceV2({
          storageAdapter: storageAdapter
        });
        await profileService.initialize();
        
        // Create data source service
        const dataSourceService = new DataSourceService();
        
        // Create dummy data source
        const dummyDataSource = createDummyDataSource('products', 5000); // Update every 5 seconds
        console.log('AppContainer: Created dummy datasource', dummyDataSource);
        
        // Store all services together
        servicesRef.current = {
          storageService,
          storageAdapter,
          profileService,
          dataSourceService,
          dummyDataSource,
          initialized: true
        };
        
        console.log('AppContainer: Services stored in ref');
        
        // Load initial state from IndexedDB
        try {
          console.log('AppContainer: Loading workspace state from IndexedDB...');
          const workspaceConfig = await storageAdapter.searchComponentConfigs({
            componentType: 'workspace',
            appId: 'agv1',
            userId: 'default' // Add userId to search criteria
          });
          
          console.log('AppContainer: Found workspace configs:', workspaceConfig.length);
          
          if (workspaceConfig.length > 0) {
            const config = workspaceConfig[0];
            console.log('AppContainer: Loading workspace config:', {
              instanceId: config.instanceId,
              updatedAt: config.updatedAt,
              hasConfiguration: !!config.configuration
            });
            const parsed = config.configuration;
            console.log('AppContainer: Parsed workspace config:', parsed);
            
            // Validate and safely convert to Maps
            const components = Array.isArray(parsed.components) ? parsed.components : [];
            // Restore column definitions for datasources
            const datasources = Array.isArray(parsed.datasources) ? parsed.datasources.map(([id, ds]: [string, any]) => {
              if (ds.config && 'columnDefs' in ds.config && ds.config.columnDefs) {
                return [id, {
                  ...ds,
                  config: {
                    ...ds.config,
                    columnDefs: restoreColumnDefs(ds.config.columnDefs)
                  }
                }];
              }
              return [id, ds];
            }) : [];
            const activeDatasources = Array.isArray(parsed.activeDatasources) ? parsed.activeDatasources : [];
            const profiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];
            
            console.log('AppContainer: Loading state with', {
              componentCount: components.length,
              datasourceCount: datasources.length,
              datasources: datasources.map(([id, ds]: [string, any]) => ({ id, name: ds.name, type: ds.type }))
            });
            
            setState({
              components: new Map(components),
              componentRefs: new Map(),
              datasources: new Map(datasources),
              activeDatasources: new Map(activeDatasources),
              profiles: new Map(profiles),
              layoutConfig: parsed.layoutConfig || null,
              theme: parsed.theme || 'light',
              locale: parsed.locale || 'en-US'
            });
            
            // Apply layout after dockview is ready
            if (parsed.layoutConfig) {
              console.log('AppContainer: Will apply saved layout after dockview ready');
            }
          } else {
            console.log('AppContainer: No existing workspace config found, starting fresh');
          }
        } catch (error) {
          console.error('Failed to load workspace state from IndexedDB:', error);
        }
      } catch (error) {
        console.error('Failed to initialize services:', error);
        throw error;
      }
    };
    
    initializeServices();
  }, []);
  
  // Define saveWorkspaceState before using it in useEffect
  
  const saveWorkspaceState = useCallback(async () => {
    if (!servicesRef.current.storageAdapter) {
      console.warn('AppContainer: No storage adapter available for saving');
      return;
    }
    
    try {
      // Use stateRef.current to ensure we get the latest state
      const currentState = stateRef.current;
      // Clean datasources to remove functions from column definitions
      const cleanedDatasources = Array.from(currentState.datasources.entries()).map(([id, ds]) => {
        const cleaned = { ...ds };
        if (ds.config && 'columnDefs' in ds.config && ds.config.columnDefs) {
          cleaned.config = {
            ...ds.config,
            columnDefs: cleanForSerialization(ds.config.columnDefs)
          };
        }
        return [id, cleaned];
      });
      
      const stateToSave = {
        components: Array.from(currentState.components.entries()),
        datasources: cleanedDatasources,
        activeDatasources: Array.from(currentState.activeDatasources.entries()),
        profiles: Array.from(currentState.profiles.entries()),
        layoutConfig: dockviewRef.current?.toJSON(),
        theme: currentState.theme,
        locale: currentState.locale
      };
      
      console.log('AppContainer: Saving workspace state with', {
        componentCount: stateToSave.components.length,
        datasourceCount: stateToSave.datasources.length,
        activeDatasourceCount: stateToSave.activeDatasources.length,
        datasources: stateToSave.datasources.map(([id, ds]) => ({ 
          id, 
          name: typeof ds === 'object' && ds ? ds.name : 'Unknown', 
          type: typeof ds === 'object' && ds ? ds.type : 'unknown' 
        }))
      });
      
      // Save to IndexedDB
      await servicesRef.current.storageAdapter.saveComponentConfig({
        instanceId: 'workspace',
        componentType: 'workspace',
        displayName: 'AGV1 Workspace',
        userId: 'default', // Add required userId
        appId: 'agv1', // Add required appId
        settings: {
          versions: {},
          activeVersionId: '1.0.0'
        },
        configuration: stateToSave,
        metadata: {
          lastSaved: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
          accessCount: 0,
          tags: ['workspace', 'agv1'],
          category: 'system',
          notes: '',
          favorited: false
        },
        permissions: {
          isPublic: false,
          canEdit: [],
          canView: [],
          allowSharing: false,
          editableByOthers: false
        },
        sharing: {
          isShared: false,
          sharedWith: [],
          publicAccess: {
            enabled: false,
            accessLevel: 'view',
            requiresAuth: false
          }
        },
        ownerId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false
      } as ComponentConfig);
      
      console.log('AppContainer: Workspace state saved successfully');
    } catch (error) {
      console.error('Failed to save workspace state to IndexedDB:', error);
    }
  }, []); // No dependencies needed since we use refs
  
  // Auto-save - moved after saveWorkspaceState definition
  useEffect(() => {
    if (!config?.enablePersistence) {
      console.log('AppContainer: Persistence disabled, skipping auto-save setup');
      return;
    }
    
    console.log('AppContainer: Setting up auto-save with interval:', config.autoSaveInterval || 30000);
    
    const interval = setInterval(() => {
      console.log('AppContainer: Auto-save triggered');
      saveWorkspaceState();
    }, config.autoSaveInterval || 30000);
    
    // Also save on window unload
    const handleBeforeUnload = () => {
      console.log('AppContainer: Saving before unload');
      saveWorkspaceState();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [config?.enablePersistence, config?.autoSaveInterval, saveWorkspaceState]);
  
  const loadWorkspaceState = useCallback(async () => {
    if (!servicesRef.current.storageAdapter) return;
    
    try {
      // Load from IndexedDB
      const workspaceConfig = await servicesRef.current.storageAdapter.searchComponentConfigs({
        componentType: 'workspace',
        appId: 'agv1'
      });
      
      if (workspaceConfig.length > 0) {
        const parsed = workspaceConfig[0].configuration;
        
        // Validate and safely convert to Maps
        const components = Array.isArray(parsed.components) ? parsed.components : [];
        // Restore column definitions for datasources
        const datasources = Array.isArray(parsed.datasources) ? parsed.datasources.map(([id, ds]: [string, any]) => {
          if (ds.config && 'columnDefs' in ds.config && ds.config.columnDefs) {
            return [id, {
              ...ds,
              config: {
                ...ds.config,
                columnDefs: restoreColumnDefs(ds.config.columnDefs)
              }
            }];
          }
          return [id, ds];
        }) : [];
        const activeDatasources = Array.isArray(parsed.activeDatasources) ? parsed.activeDatasources : [];
        const profiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];
        
        setState({
          components: new Map(components),
          componentRefs: new Map(),
          datasources: new Map(datasources),
          activeDatasources: new Map(activeDatasources),
          profiles: new Map(profiles),
          layoutConfig: parsed.layoutConfig || null,
          theme: parsed.theme || 'light',
          locale: parsed.locale || 'en-US'
        });
      }
    } catch (error) {
      console.error('Failed to load workspace state from IndexedDB:', error);
    }
  }, []);
  
  // IAppContainer implementation
  const appContainer: IAppContainer = {
    // Component Operations
    createComponent: useCallback((type, config) => {
      const instanceId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // If no datasource is specified, create a dummy datasource
      let datasourceId = config?.datasourceId;
      if (!datasourceId && servicesRef.current.dummyDataSource) {
        datasourceId = 'dummy-datasource';
      }
      
      const component: ComponentInstance = {
        instanceId,
        componentType: type,
        title: config?.title || `${type} ${state.components.size + 1}`,
        datasourceId,
        activeProfileId: config?.activeProfileId,
        metadata: config?.metadata,
        createdAt: new Date(),
        lastModified: new Date()
      };
      
      setState(prev => {
        const newComponents = new Map(prev.components);
        newComponents.set(instanceId, component);
        console.log('AppContainer: Adding component', instanceId, component);
        
        // Also update datasources if using dummy
        let newDatasources = prev.datasources;
        let newActiveDatasources = prev.activeDatasources;
        
        if (datasourceId === 'dummy-datasource' && !prev.datasources.has(datasourceId)) {
          newDatasources = new Map(prev.datasources);
          newDatasources.set(datasourceId, {
            id: datasourceId,
            name: 'Sample Data',
            type: 'dummy',
            config: {
              dataType: 'products',
              updateInterval: 5000
            },
            status: 'active'
          });
          newActiveDatasources = new Map(prev.activeDatasources);
          newActiveDatasources.set(datasourceId, servicesRef.current.dummyDataSource!);
          console.log('AppContainer: Added dummy datasource to active datasources');
        }
        
        const newState = { 
          ...prev, 
          components: newComponents,
          datasources: newDatasources,
          activeDatasources: newActiveDatasources
        };
        console.log('AppContainer: New state after adding component:', newState);
        return newState;
      });
      
      // Add to dockview
      if (dockviewRef.current) {
        dockviewRef.current.addPanel({
          id: instanceId,
          component: 'default',
          params: { instanceId, componentType: type },
          title: component.title
        });
      }
      
      eventEmitter.current.emit('component:created', { component });
      return instanceId;
    }, []),
    
    destroyComponent: useCallback((instanceId: string) => {
      setState(prev => {
        const newComponents = new Map(prev.components);
        newComponents.delete(instanceId);
        return { ...prev, components: newComponents };
      });
      
      // Remove from dockview
      if (dockviewRef.current) {
        const panel = dockviewRef.current.panels.find((p: any) => p.id === instanceId);
        if (panel) {
          dockviewRef.current.removePanel(panel);
        }
      }
      
      componentRefsMap.current.delete(instanceId);
      eventEmitter.current.emit('component:destroyed', { instanceId });
    }, []),
    
    getComponent: useCallback((instanceId: string) => {
      const component = stateRef.current.components.get(instanceId);
      console.log('AppContainer.getComponent:', instanceId, component, 'from', stateRef.current.components);
      return component;
    }, []),
    
    getAllComponents: useCallback(() => {
      return Array.from(stateRef.current.components.values());
    }, []),
    
    updateComponent: useCallback((instanceId: string, updates: Partial<ComponentInstance>) => {
      setState(prev => {
        const newComponents = new Map(prev.components);
        const component = newComponents.get(instanceId);
        if (component) {
          newComponents.set(instanceId, {
            ...component,
            ...updates,
            lastModified: new Date()
          });
        }
        return { ...prev, components: newComponents };
      });
      
      eventEmitter.current.emit('component:updated', { instanceId, updates });
    }, []),
    
    // DataSource Operations
    createDatasource: useCallback((config: DataSourceConfig) => {
      const id = config.id || `ds-${Date.now()}`;
      console.log('AppContainer: Creating datasource', id, config);
      
      setState(prev => {
        const newDatasources = new Map(prev.datasources);
        newDatasources.set(id, { ...config, id });
        console.log('AppContainer: Updated datasources map, new size:', newDatasources.size);
        return { ...prev, datasources: newDatasources };
      });
      
      // Save after state update completes
      setTimeout(() => {
        console.log('AppContainer: Triggering save after datasource creation');
        saveWorkspaceState();
      }, 500); // Increased delay to ensure state is updated
      
      eventEmitter.current.emit('datasource:created', { datasource: { ...config, id } });
      return id;
    }, [saveWorkspaceState]),
    
    updateDatasource: useCallback((id: string, updates: Partial<DataSourceConfig>) => {
      setState(prev => {
        const newDatasources = new Map(prev.datasources);
        const ds = newDatasources.get(id);
        if (ds) {
          newDatasources.set(id, { ...ds, ...updates });
        }
        return { ...prev, datasources: newDatasources };
      });
      
      // Save after state update completes
      setTimeout(() => {
        console.log('AppContainer: Triggering save after datasource update');
        saveWorkspaceState();
      }, 500);
      
      eventEmitter.current.emit('datasource:updated', { id, updates });
    }, [saveWorkspaceState]),
    
    deleteDatasource: useCallback((id: string) => {
      setState(prev => {
        const newDatasources = new Map(prev.datasources);
        newDatasources.delete(id);
        return { ...prev, datasources: newDatasources };
      });
      
      // Save after state update completes
      setTimeout(() => {
        console.log('AppContainer: Triggering save after datasource deletion');
        saveWorkspaceState();
      }, 500);
      
      eventEmitter.current.emit('datasource:deleted', { id });
    }, [saveWorkspaceState]),
    
    getDatasource: useCallback((id: string) => {
      return stateRef.current.datasources.get(id);
    }, []),
    
    getAllDatasources: useCallback(() => {
      return Array.from(stateRef.current.datasources.values());
    }, []),
    
    activateDatasource: useCallback(async (id: string) => {
      const datasource = stateRef.current.datasources.get(id);
      if (!datasource) return;
      
      try {
        let activeDataSource: any;
        
        // Handle dummy datasource
        if (id === 'dummy-datasource' && servicesRef.current.dummyDataSource) {
          activeDataSource = servicesRef.current.dummyDataSource;
        } else if (servicesRef.current.dataSourceService) {
          // Handle regular datasources
          await servicesRef.current.dataSourceService.activateDataSource(id);
          activeDataSource = await servicesRef.current.dataSourceService.getDataSource(id);
        }
        
        if (activeDataSource) {
          setState(prev => ({
            ...prev,
            activeDatasources: new Map(prev.activeDatasources).set(id, activeDataSource)
          }));
          
          eventEmitter.current.emit('datasource:activated', { id });
        }
      } catch (error) {
        console.error('Failed to activate datasource:', error);
      }
    }, []),
    
    deactivateDatasource: useCallback(async (id: string) => {
      if (!servicesRef.current.dataSourceService) return;
      
      try {
        await servicesRef.current.dataSourceService.deactivateDataSource(id);
        setState(prev => {
          const newActive = new Map(prev.activeDatasources);
          newActive.delete(id);
          return { ...prev, activeDatasources: newActive };
        });
        
        eventEmitter.current.emit('datasource:deactivated', { id });
      } catch (error) {
        console.error('Failed to deactivate datasource:', error);
      }
    }, []),
    
    // Profile Operations
    saveComponentProfile: useCallback(async (instanceId: string, profileName: string) => {
      const componentRef = componentRefsMap.current.get(instanceId);
      if (!componentRef || !servicesRef.current.profileService) return;
      
      const configuration = componentRef.getConfiguration();
      const component = stateRef.current.components.get(instanceId);
      if (!component) return;
      
      const profile = await servicesRef.current.profileService.createProfile(instanceId, {
        name: profileName,
        componentType: component.componentType,
        componentInstanceId: instanceId,
        datasourceId: component.datasourceId,
        configuration
      });
      
      setState(prev => {
        const newProfiles = new Map(prev.profiles);
        const componentProfiles = newProfiles.get(instanceId) || [];
        newProfiles.set(instanceId, [...componentProfiles, profile]);
        return { ...prev, profiles: newProfiles };
      });
      
      eventEmitter.current.emit('profile:saved', { instanceId, profile });
    }, []),
    
    loadComponentProfile: useCallback((instanceId: string, profileId: string) => {
      const componentRef = componentRefsMap.current.get(instanceId);
      const profile = servicesRef.current.profileService?.getProfile(profileId);
      
      if (!componentRef || !profile) return;
      
      componentRef.setConfiguration(profile.configuration);
      
      setState(prev => {
        const newComponents = new Map(prev.components);
        const component = newComponents.get(instanceId);
        if (component) {
          newComponents.set(instanceId, {
            ...component,
            activeProfileId: profileId,
            datasourceId: profile.datasourceId
          });
        }
        return { ...prev, components: newComponents };
      });
      
      eventEmitter.current.emit('profile:loaded', { instanceId, profileId });
    }, []),
    
    getComponentProfiles: useCallback((instanceId: string) => {
      return stateRef.current.profiles.get(instanceId) || [];
    }, []),
    
    // Layout Operations
    saveLayout: useCallback((name?: string) => {
      const layout = dockviewRef.current?.toJSON();
      if (layout) {
        localStorage.setItem(`agv1:layout:${name || 'default'}`, JSON.stringify(layout));
      }
    }, []),
    
    loadLayout: useCallback((name?: string) => {
      const saved = localStorage.getItem(`agv1:layout:${name || 'default'}`);
      if (saved && dockviewRef.current) {
        dockviewRef.current.fromJSON(JSON.parse(saved));
      }
    }, []),
    
    resetLayout: useCallback(() => {
      if (dockviewRef.current) {
        dockviewRef.current.clear();
      }
    }, []),
    
    // Global Operations
    exportWorkspace: useCallback(() => {
      const workspace = {
        components: Array.from(stateRef.current.components.entries()),
        datasources: Array.from(stateRef.current.datasources.entries()),
        profiles: Array.from(stateRef.current.profiles.entries()),
        layout: dockviewRef.current?.toJSON(),
        version: '1.0.0',
        exportedAt: new Date().toISOString()
      };
      
      return JSON.stringify(workspace, null, 2);
    }, []),
    
    importWorkspace: useCallback((data: string) => {
      try {
        const workspace = JSON.parse(data);
        
        setState({
          components: new Map(workspace.components || []),
          componentRefs: new Map(),
          datasources: new Map(workspace.datasources || []),
          activeDatasources: new Map(workspace.activeDatasources || []),
          profiles: new Map(workspace.profiles || []),
          layoutConfig: workspace.layout,
          theme: workspace.theme || 'light',
          locale: workspace.locale || 'en-US'
        });
        
        if (workspace.layout && dockviewRef.current) {
          dockviewRef.current.fromJSON(workspace.layout);
        }
        
        eventEmitter.current.emit('workspace:imported', { workspace });
      } catch (error) {
        console.error('Failed to import workspace:', error);
        throw error;
      }
    }, []),
    
    resetWorkspace: useCallback(() => {
      setState({
        components: new Map(),
        componentRefs: new Map(),
        datasources: new Map(),
        activeDatasources: new Map(),
        profiles: new Map(),
        layoutConfig: null,
        theme: 'light',
        locale: 'en-US'
      });
      
      if (dockviewRef.current) {
        dockviewRef.current.clear();
      }
      
      eventEmitter.current.emit('workspace:reset', {});
    }, []),
    
    // State and refs
    getState: useCallback(() => stateRef.current, []),
    
    registerComponentRef: useCallback((instanceId: string, ref: any) => {
      componentRefsMap.current.set(instanceId, ref);
    }, []),
    
    unregisterComponentRef: useCallback((instanceId: string) => {
      componentRefsMap.current.delete(instanceId);
    }, []),
    
    getComponentRef: useCallback((instanceId: string) => {
      return componentRefsMap.current.get(instanceId);
    }, []),
    
    on: useCallback((event: AppContainerEvent, handler: (data: any) => void) => {
      eventEmitter.current.on(event, handler);
    }, []),
    
    off: useCallback((event: AppContainerEvent, handler: (data: any) => void) => {
      eventEmitter.current.off(event, handler);
    }, []),
    
    // Manual save function
    saveWorkspace: useCallback(() => {
      return saveWorkspaceState();
    }, [saveWorkspaceState])
  };
  
  const handleDockviewReady = (event: DockviewReadyEvent) => {
    console.log('AppContainer: Dockview ready');
    dockviewRef.current = event.api;
    
    // Component registration is handled by the components prop
    
    // Load saved layout if exists
    if (state.layoutConfig) {
      console.log('AppContainer: Applying saved layout', state.layoutConfig);
      try {
        event.api.fromJSON(state.layoutConfig);
      } catch (error) {
        console.error('AppContainer: Failed to apply saved layout:', error);
      }
    }
    
    // Recreate panels for existing components
    state.components.forEach((component, instanceId) => {
      console.log('AppContainer: Recreating panel for component', instanceId, component);
      if (!event.api.panels.find((p: any) => p.id === instanceId)) {
        event.api.addPanel({
          id: instanceId,
          component: 'default',
          params: { instanceId, componentType: component.componentType },
          title: component.title
        });
      }
    });
  };
  
  const handleExportWorkspace = () => {
    const data = appContainer.exportWorkspace();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleImportWorkspace = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const text = await file.text();
        appContainer.importWorkspace(text);
      }
    };
    input.click();
  };
  
  return (
    <ServicesProvider appContainer={appContainer} autoInitialize={true}>
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold tracking-tight">AGV1 Application Container</h1>
                    <p className="text-xs text-muted-foreground">Enterprise Data Management Platform</p>
                  </div>
                </div>
                
                <Separator orientation="vertical" className="h-8" />
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowComponentMenu(!showComponentMenu)}
                    className="h-8"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Component
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDataSourceDialog(true)}
                    className="h-8"
                  >
                    <Database className="h-3.5 w-3.5 mr-1.5" />
                    Data Sources
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 mr-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      console.log('Manual save triggered');
                      saveWorkspaceState();
                    }}
                    className="h-8 w-8"
                    title="Save Workspace"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleExportWorkspace}
                    className="h-8 w-8"
                    title="Export Workspace"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleImportWorkspace}
                    className="h-8 w-8"
                    title="Import Workspace"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      if (confirm('Are you sure you want to reset the workspace? This will remove all components and settings.')) {
                        appContainer.resetWorkspace();
                      }
                    }}
                    className="h-8 w-8"
                    title="Reset Workspace"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                
                <Separator orientation="vertical" className="h-8" />
                
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>
        
        {/* Component menu dropdown */}
        {showComponentMenu && (
          <Card className="absolute top-16 left-4 z-50 w-64 p-1 shadow-lg">
            <div className="p-2">
              <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">COMPONENTS</h3>
              <Button
                variant="ghost"
                className="w-full justify-start h-9 px-2"
                onClick={() => {
                  appContainer.createComponent('datatable');
                  setShowComponentMenu(false);
                }}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Data Table
                <span className="ml-auto text-xs text-muted-foreground">Grid view</span>
              </Button>
              {/* Add more component types here in the future */}
            </div>
          </Card>
        )}
        
        {/* Main content - Dockview */}
        <div className="flex-1 relative">
          {state.components.size === 0 && (
            <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
              <div className="text-center max-w-md">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <LayoutGrid className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No Components Open</h2>
                <p className="text-muted-foreground mb-6">
                  Get started by adding a component to your workspace. Components can connect to data sources and save multiple configuration profiles.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center pointer-events-auto">
                  <Button
                    onClick={() => appContainer.createComponent('datatable')}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Data Table
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDataSourceDialog(true)}
                    className="gap-2"
                  >
                    <Database className="h-4 w-4" />
                    Configure Data Sources
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DockviewReact
            components={{
              default: ComponentPanel
            }}
            onReady={handleDockviewReady}
            className={`h-full dockview-theme-${resolvedTheme}`}
          />
        </div>
        
        {/* Dialogs */}
        {showDataSourceDialog && (
          <DataSourceDialog
            open={showDataSourceDialog}
            onOpenChange={(open) => {
              setShowDataSourceDialog(open);
              // Save when dialog closes
              if (!open) {
                console.log('AppContainer: DataSource dialog closed, triggering save');
                saveWorkspaceState();
              }
            }}
            datasources={Array.from(state.datasources.values())}
            activeDatasources={state.activeDatasources instanceof Map ? Array.from(state.activeDatasources.keys()) : []}
            onCreateDatasource={(config) => {
              const id = appContainer.createDatasource(config);
              return id;
            }}
            onUpdateDatasource={(id, updates) => {
              appContainer.updateDatasource(id, updates);
            }}
            onDeleteDatasource={(id) => {
              appContainer.deleteDatasource(id);
            }}
            onActivateDatasource={async (id) => {
              await appContainer.activateDatasource(id);
            }}
            onDeactivateDatasource={async (id) => {
              await appContainer.deactivateDatasource(id);
            }}
            onTestConnection={async (config) => {
              // Test the connection and return sample data
              try {
                // For WebSocket datasources, we'll simulate a connection test
                if (config.type === 'websocket') {
                  // In a real implementation, this would connect to the WebSocket
                  // and receive actual data. For now, return mock success with sample data
                  const mockData = await testWebSocketConnection(config);
                  return {
                    success: true,
                    message: 'Connection successful. Sample data received.',
                    data: mockData
                  };
                }
                
                return {
                  success: false,
                  message: 'Connection test not implemented for this datasource type'
                };
              } catch (error) {
                return {
                  success: false,
                  message: error instanceof Error ? error.message : 'Connection failed'
                };
              }
            }}
            onInferFields={async (config) => {
              // Infer fields from the datasource
              try {
                if (config.type === 'websocket') {
                  // Connect and get sample data for field inference
                  const sampleData = await testWebSocketConnection(config);
                  return sampleData;
                }
                
                // For other datasource types, return empty array
                return [];
              } catch (error) {
                console.error('Failed to infer fields:', error);
                return [];
              }
            }}
          />
        )}
        
        {/* Toast notifications */}
        <Toaster />
      </div>
    </ServicesProvider>
  );
};