/**
 * Services Provider
 * 
 * Provides all AGV1 services to the component tree via React Context.
 * This enables any component to access services through the useServices hook.
 */

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { 
  AGV1Services,
  HybridStorageConfig
} from '@/types';
import { ServiceRegistry, ServiceNames } from '@/services/ServiceRegistry';
import { StorageService, StorageMode } from '@/services/storage/StorageService';
import { ProfileServiceAdapter } from '@/services/profile/ProfileServiceAdapter';
import { ConfigurationService } from '@/services/configuration/ConfigurationService';
import { DataSourceService } from '@/services/datasource/DataSourceService';
import { WebSocketService } from '@/services/websocket/WebSocketService';
import { NotificationService } from '@/services/notification/NotificationService';
import { AppContainerService } from '@/services/appcontainer/AppContainerService';
import { ColumnFormatService } from '@/services/agv1/ColumnFormatService';

/**
 * Services context
 */
export const ServicesContext = createContext<AGV1Services | null>(null);

/**
 * Services provider props
 */
export interface ServicesProviderProps {
  /** Child components */
  children: React.ReactNode;
  
  /** Storage mode configuration */
  storageMode?: StorageMode;
  
  /** MongoDB configuration (for remote mode) */
  mongoDbConfig?: {
    apiUrl: string;
    authToken?: string;
  };
  
  /** Hybrid storage configuration */
  hybridConfig?: Partial<HybridStorageConfig>;
  
  /** User ID for profile/config services */
  userId?: string;
  
  /** Application ID */
  appId?: string;
  
  /** Whether to initialize services immediately */
  autoInitialize?: boolean;
  
  /** Optional AppContainer instance */
  appContainer?: any;
}

/**
 * Services initialization state
 */
interface InitializationState {
  initialized: boolean;
  initializing: boolean;
  error: Error | null;
}

/**
 * Services Provider Component
 */
export const ServicesProvider: React.FC<ServicesProviderProps> = ({
  children,
  storageMode = 'local',
  mongoDbConfig,
  hybridConfig,
  userId = 'default-user',
  appId = 'agv1',
  autoInitialize = true,
  appContainer
}) => {
  const servicesRef = useRef<AGV1Services | null>(null);
  const [initState, setInitState] = React.useState<InitializationState>({
    initialized: false,
    initializing: false,
    error: null
  });

  /**
   * Initialize all services
   */
  const initializeServices = async () => {
    if (initState.initialized || initState.initializing) {
      console.log('ServicesProvider: Already initialized or initializing');
      return;
    }

    console.log('ServicesProvider: Starting initialization...');
    setInitState({ initialized: false, initializing: true, error: null });

    try {
      // Create service registry
      const registry = new ServiceRegistry();
      console.log('ServicesProvider: Created service registry');

      // Create and initialize storage service only if no appContainer
      let storageAdapter: any;
      if (appContainer && appContainer.getStorageAdapter) {
        // AppContainer already has initialized storage, use it directly
        storageAdapter = appContainer.getStorageAdapter();
        if (!storageAdapter) {
          // Fallback: create our own if AppContainer doesn't have one yet
          const storageService = new StorageService({
            mode: storageMode,
            mongoDbConfig,
            hybridConfig
          });
          await storageService.initialize();
          storageAdapter = storageService.getAdapter();
        }
      } else {
        const storageService = new StorageService({
          mode: storageMode,
          mongoDbConfig,
          hybridConfig
        });
        await storageService.initialize();
        storageAdapter = storageService.getAdapter();
      }

      // Create services
      let profileService: any;
      if (appContainer && appContainer.getProfileService) {
        // Use AppContainer's profile service if available
        profileService = appContainer.getProfileService();
        if (!profileService) {
          // Fallback: create our own if AppContainer doesn't have one yet
          const profileAdapter = new ProfileServiceAdapter({
            storageAdapter: 'local',
            storageKey: 'agv1:profiles',
            maxProfilesPerComponent: 50,
            autoSaveInterval: 5000
          });
          await profileAdapter.initialize(userId, appId);
          profileService = profileAdapter;
        }
      } else {
        const profileAdapter = new ProfileServiceAdapter({
          storageAdapter: 'local',
          storageKey: 'agv1:profiles',
          maxProfilesPerComponent: 50,
          autoSaveInterval: 5000
        });
        await profileAdapter.initialize(userId, appId);
        profileService = profileAdapter;
      }
      const configurationService = new ConfigurationService(storageAdapter);
      const dataSourceService = new DataSourceService();
      const webSocketService = new WebSocketService();
      const notificationService = new NotificationService({
        position: 'top-right',
        maxNotifications: 5
      });
      // Use the provided appContainer if available, otherwise create a dummy service
      const appContainerService = appContainer || new AppContainerService();
      const columnFormatService = new ColumnFormatService({
        storageService: storageAdapter,
        notificationService,
        userId,
        appId
      });

      // Initialize services that need it
      await configurationService.initialize(storageAdapter);
      configurationService.setUserContext(userId, appId);

      // Register services in registry
      registry.register(ServiceNames.STORAGE, storageAdapter);
      registry.register(ServiceNames.PROFILE, profileService);
      registry.register(ServiceNames.CONFIGURATION, configurationService);
      registry.register(ServiceNames.DATA_SOURCE, dataSourceService);
      registry.register(ServiceNames.WEBSOCKET, webSocketService);
      registry.register(ServiceNames.NOTIFICATION, notificationService);
      registry.register(ServiceNames.APP_CONTAINER, appContainerService);
      registry.register(ServiceNames.COLUMN_FORMAT, columnFormatService);

      // Create services object
      const services: AGV1Services = {
        registry,
        storage: storageAdapter,
        profile: profileService,
        configuration: configurationService,
        dataSource: dataSourceService,
        appContainer: appContainerService,
        webSocket: webSocketService,
        notification: notificationService,
        columnFormatService
      };

      servicesRef.current = services;
      
      setInitState({ initialized: true, initializing: false, error: null });
      
      console.log('AGV1 services initialized successfully', services);
      
      // Show success notification
      notificationService.success('Services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AGV1 services:', error);
      setInitState({ 
        initialized: false, 
        initializing: false, 
        error: error as Error 
      });
    }
  };

  /**
   * Initialize on mount if auto-initialize is enabled
   */
  useEffect(() => {
    if (autoInitialize) {
      initializeServices();
    }
  }, [autoInitialize]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      const services = servicesRef.current;
      if (services) {
        // Cleanup services
        const cleanup = async () => {
          try {
            // Dispose services that have cleanup methods
            if ('dispose' in services.appContainer && typeof services.appContainer.dispose === 'function') {
              await services.appContainer.dispose();
            }
            if ('dispose' in services.dataSource && typeof (services.dataSource as any).dispose === 'function') {
              await (services.dataSource as any).dispose();
            }
            if ('dispose' in services.webSocket && typeof (services.webSocket as any).dispose === 'function') {
              await (services.webSocket as any).dispose();
            }
            if ('dispose' in services.notification && typeof (services.notification as any).dispose === 'function') {
              (services.notification as any).dispose();
            }
            if ('close' in services.storage && typeof (services.storage as any).close === 'function') {
              await (services.storage as any).close();
            }
          } catch (error) {
            console.error('Error cleaning up services:', error);
          }
        };
        
        cleanup();
      }
    };
  }, []);

  // Show initialization error
  if (initState.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-destructive/10 rounded-lg">
          <h2 className="text-2xl font-bold text-destructive mb-4">
            Failed to Initialize Services
          </h2>
          <p className="text-muted-foreground mb-4">
            {initState.error.message}
          </p>
          <button 
            onClick={initializeServices}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (initState.initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Initializing services...</p>
        </div>
      </div>
    );
  }

  // Don't render children until services are initialized
  if (!initState.initialized || !servicesRef.current) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Initializing services...</p>
        </div>
      </div>
    );
  }

  // Provide services to children
  return (
    <ServicesContext.Provider value={servicesRef.current}>
      {children}
    </ServicesContext.Provider>
  );
};

/**
 * Hook to access AGV1 services
 */
export const useServices = (): AGV1Services => {
  const services = useContext(ServicesContext);
  
  if (!services) {
    throw new Error('useServices must be used within ServicesProvider');
  }
  
  return services;
};

/**
 * Hook to access a specific service
 */
export const useService = <T extends keyof AGV1Services>(
  serviceName: T
): AGV1Services[T] => {
  const services = useServices();
  return services[serviceName];
};

/**
 * Hook to access the service registry directly
 */
export const useServiceRegistry = () => {
  const services = useServices();
  return services.registry;
};

/**
 * HOC to inject services as props
 */
export function withServices<P extends object>(
  Component: React.ComponentType<P & { services: AGV1Services }>
): React.ComponentType<P> {
  return (props: P) => {
    const services = useServices();
    return <Component {...props} services={services} />;
  };
}