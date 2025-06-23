/**
 * App Container Provider
 * 
 * Manages component lifecycle and provides component registry access
 * throughout the application. Works with the AppContainerService to
 * coordinate component creation, destruction, and ref management.
 */

import React, { 
  createContext, 
  useContext, 
  useCallback, 
  useEffect, 
  useRef,
  useState 
} from 'react';
import {
  IConfigurableComponent,
  ComponentType,
  ComponentRegistryEntry,
  ComponentFactory,
  ComponentLifecycleEvent,
  ConfigurableComponentProps
} from '@/types';
import { useService } from './ServicesProvider';

/**
 * Component instance with ref
 */
export interface ComponentInstance {
  instanceId: string;
  componentType: ComponentType;
  element: React.ReactElement;
  ref: React.RefObject<IConfigurableComponent>;
}

/**
 * App container context value
 */
interface AppContainerContextValue {
  /** Create a new component instance */
  createComponent: (
    type: ComponentType,
    config?: any,
    metadata?: any
  ) => ComponentInstance;
  
  /** Destroy a component instance */
  destroyComponent: (instanceId: string) => void;
  
  /** Get component ref by instance ID */
  getComponentRef: (instanceId: string) => React.RefObject<IConfigurableComponent> | null;
  
  /** Get all component instances */
  getAllComponents: () => ComponentRegistryEntry[];
  
  /** Register a component factory */
  registerComponentFactory: (type: ComponentType, factory: ComponentFactory) => void;
  
  /** Save all component configurations */
  saveAllConfigurations: () => Promise<void>;
  
  /** Load all component configurations */
  loadAllConfigurations: () => Promise<void>;
}

/**
 * App container context
 */
const AppContainerContext = createContext<AppContainerContextValue | null>(null);

/**
 * App container provider props
 */
export interface AppContainerProviderProps {
  children: React.ReactNode;
}

/**
 * Component wrapper that handles ref forwarding and registration
 */
const ComponentWrapper = React.forwardRef<
  IConfigurableComponent,
  ConfigurableComponentProps & { 
    componentType: ComponentType;
    onMount: (ref: React.RefObject<IConfigurableComponent>) => void;
    onUnmount: () => void;
    children: React.ReactElement;
  }
>(({ componentType, onMount, onUnmount, children, ...props }, ref) => {
  const internalRef = useRef<IConfigurableComponent>(null);
  const combinedRef = (ref as React.MutableRefObject<IConfigurableComponent | null>) || internalRef;

  useEffect(() => {
    onMount(combinedRef as React.RefObject<IConfigurableComponent>);
    
    return () => {
      onUnmount();
    };
  }, []);

  // Clone element with ref
  return React.cloneElement(children, {
    ...props,
    ref: combinedRef
  });
});

ComponentWrapper.displayName = 'ComponentWrapper';

/**
 * App Container Provider Component
 */
export const AppContainerProvider: React.FC<AppContainerProviderProps> = ({
  children
}) => {
  const appContainerService = useService('appContainer');
  const configurationService = useService('configuration');
  const notificationService = useService('notification');
  
  const [_components, setComponents] = useState<Map<string, ComponentInstance>>(new Map());
  const componentFactories = useRef<Map<ComponentType, ComponentFactory>>(new Map());

  /**
   * Register a component factory
   */
  const registerComponentFactory = useCallback((type: ComponentType, factory: ComponentFactory) => {
    componentFactories.current.set(type, factory);
    if (appContainerService?.registerComponentFactory) {
      appContainerService.registerComponentFactory(type, factory);
    }
    console.log(`Component factory registered for type: ${type}`);
  }, [appContainerService]);

  /**
   * Create a component instance
   */
  const createComponent = useCallback((
    type: ComponentType,
    config?: any,
    metadata?: any
  ): ComponentInstance => {
    const factory = componentFactories.current.get(type);
    
    if (!factory) {
      throw new Error(`No factory registered for component type: ${type}`);
    }

    // Create registry entry
    const entry = appContainerService.createComponent(type, config, metadata);
    
    // Create React element
    const element = factory(entry.instanceId, config);
    
    // Create component instance
    const instance: ComponentInstance = {
      instanceId: entry.instanceId,
      componentType: type,
      element,
      ref: entry.ref
    };

    // Wrap element with ref management
    const wrappedElement = (
      <ComponentWrapper
        key={entry.instanceId}
        instanceId={entry.instanceId}
        componentType={type}
        onMount={(_ref) => {
          // Component mounted, ref is ready
          console.log(`Component mounted: ${entry.instanceId}`);
        }}
        onUnmount={() => {
          // Component unmounting
          console.log(`Component unmounting: ${entry.instanceId}`);
        }}
        ref={entry.ref}
      >
        {element}
      </ComponentWrapper>
    );

    instance.element = wrappedElement;

    // Add to local state
    setComponents(prev => new Map(prev).set(entry.instanceId, instance));

    // Notification
    notificationService.info(`Component created: ${metadata?.displayName || type}`);

    return instance;
  }, [appContainerService, notificationService]);

  /**
   * Destroy a component instance
   */
  const destroyComponent = useCallback((instanceId: string) => {
    appContainerService.destroyComponent(instanceId);
    
    setComponents(prev => {
      const next = new Map(prev);
      next.delete(instanceId);
      return next;
    });

    notificationService.info(`Component destroyed: ${instanceId}`);
  }, [appContainerService, notificationService]);

  /**
   * Get component ref by instance ID
   */
  const getComponentRef = useCallback((instanceId: string) => {
    return appContainerService.getComponentRef(instanceId);
  }, [appContainerService]);

  /**
   * Get all component instances
   */
  const getAllComponents = useCallback(() => {
    return appContainerService.getAllComponents();
  }, [appContainerService]);

  /**
   * Save all component configurations
   */
  const saveAllConfigurations = useCallback(async () => {
    try {
      const componentRefs = appContainerService.getAllComponents()
        .map(entry => entry.ref)
        .filter(ref => ref.current !== null);

      await configurationService.saveAllConfigurations(componentRefs);
      
      notificationService.success('All configurations saved successfully');
    } catch (error) {
      notificationService.error('Failed to save configurations');
      throw error;
    }
  }, [appContainerService, configurationService, notificationService]);

  /**
   * Load all component configurations
   */
  const loadAllConfigurations = useCallback(async () => {
    try {
      await appContainerService.loadAllConfigurations();
      notificationService.success('All configurations loaded successfully');
    } catch (error) {
      notificationService.error('Failed to load configurations');
      throw error;
    }
  }, [appContainerService, notificationService]);

  /**
   * Subscribe to lifecycle events
   */
  useEffect(() => {
    const unsubscribe = appContainerService.onComponentLifecycle((event: ComponentLifecycleEvent) => {
      console.log('Component lifecycle event:', event);
      
      // Handle errors
      if (event.type === 'error' && event.error) {
        notificationService.error(
          `Component error: ${event.error.message}`,
          { duration: 0 } // Don't auto-hide errors
        );
      }
    });

    return unsubscribe;
  }, [appContainerService, notificationService]);

  /**
   * Subscribe to registry changes
   */
  useEffect(() => {
    const unsubscribe = appContainerService.onRegistryChange((registry) => {
      console.log('Component registry updated:', registry.length, 'components');
    });

    return unsubscribe;
  }, [appContainerService]);

  const contextValue: AppContainerContextValue = {
    createComponent,
    destroyComponent,
    getComponentRef,
    getAllComponents,
    registerComponentFactory,
    saveAllConfigurations,
    loadAllConfigurations
  };

  return (
    <AppContainerContext.Provider value={contextValue}>
      {children}
    </AppContainerContext.Provider>
  );
};

/**
 * Hook to access app container functionality
 */
export const useAppContainer = (): AppContainerContextValue => {
  const context = useContext(AppContainerContext);
  
  if (!context) {
    throw new Error('useAppContainer must be used within AppContainerProvider');
  }
  
  return context;
};

/**
 * Hook to get a component ref by instance ID
 */
export const useComponentRef = (instanceId: string): React.RefObject<IConfigurableComponent> | null => {
  const { getComponentRef } = useAppContainer();
  return getComponentRef(instanceId);
};

/**
 * Hook to create a component
 */
export const useCreateComponent = () => {
  const { createComponent } = useAppContainer();
  return createComponent;
};

/**
 * Hook to register component factories
 */
export const useRegisterComponentFactory = () => {
  const { registerComponentFactory } = useAppContainer();
  
  return useCallback((factories: Record<ComponentType, ComponentFactory>) => {
    Object.entries(factories).forEach(([type, factory]) => {
      registerComponentFactory(type as ComponentType, factory);
    });
  }, [registerComponentFactory]);
};