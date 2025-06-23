/**
 * useAppContainer Hook
 * 
 * Provides access to the AppContainer instance and helper methods
 * for components to interact with the container.
 */

import { useContext, useEffect, useCallback } from 'react';
import { useServices } from '@/hooks/useServices';
import type { IAppContainer } from '@/types/agv1/app-container.types';
import type { ComponentProfile } from '@/types/agv1/profile.types';

export interface UseAppContainerResult {
  appContainer: IAppContainer | null;
  
  // Component registration helpers
  registerComponent: (instanceId: string, ref: any) => void;
  unregisterComponent: (instanceId: string) => void;
  
  // Profile helpers
  saveProfile: (instanceId: string, profileName: string) => Promise<void>;
  loadProfile: (instanceId: string, profileId: string) => Promise<void>;
  getProfiles: (instanceId: string) => ComponentProfile[];
  getActiveProfile: (instanceId: string) => ComponentProfile | undefined;
  
  // DataSource helpers
  getDatasources: () => any[];
  connectToDatasource: (instanceId: string, datasourceId: string) => Promise<void>;
}

export function useAppContainer(componentInstanceId?: string): UseAppContainerResult {
  const services = useServices();
  const appContainer = services?.appContainer as unknown as IAppContainer | null;
  
  // Auto-register component if instanceId is provided
  useEffect(() => {
    if (componentInstanceId && appContainer) {
      return () => {
        // Cleanup: unregister on unmount
        appContainer.unregisterComponentRef(componentInstanceId);
      };
    }
  }, [componentInstanceId, appContainer]);
  
  const registerComponent = useCallback((instanceId: string, ref: any) => {
    if (appContainer) {
      appContainer.registerComponentRef(instanceId, ref);
    }
  }, [appContainer]);
  
  const unregisterComponent = useCallback((instanceId: string) => {
    if (appContainer) {
      appContainer.unregisterComponentRef(instanceId);
    }
  }, [appContainer]);
  
  const saveProfile = useCallback(async (instanceId: string, profileName: string) => {
    if (appContainer) {
      appContainer.saveComponentProfile(instanceId, profileName);
    }
  }, [appContainer]);
  
  const loadProfile = useCallback(async (instanceId: string, profileId: string) => {
    if (appContainer) {
      appContainer.loadComponentProfile(instanceId, profileId);
    }
  }, [appContainer]);
  
  const getProfiles = useCallback((instanceId: string): ComponentProfile[] => {
    if (appContainer) {
      return appContainer.getComponentProfiles(instanceId);
    }
    return [];
  }, [appContainer]);
  
  const getActiveProfile = useCallback((instanceId: string): ComponentProfile | undefined => {
    if (!appContainer) return undefined;
    
    const profiles = appContainer.getComponentProfiles(instanceId);
    const component = appContainer.getComponent(instanceId);
    if (component?.activeProfileId) {
      return profiles.find(p => p.id === component.activeProfileId);
    }
    return undefined;
  }, [appContainer]);
  
  const getDatasources = useCallback(() => {
    if (appContainer) {
      return appContainer.getAllDatasources();
    }
    return [];
  }, [appContainer]);
  
  const connectToDatasource = useCallback(async (instanceId: string, datasourceId: string) => {
    if (appContainer) {
      // Update component to use this datasource
      appContainer.updateComponent(instanceId, { datasourceId });
      
      // Activate datasource if not already active
      await appContainer.activateDatasource(datasourceId);
    }
  }, [appContainer]);
  
  return {
    appContainer,
    registerComponent,
    unregisterComponent,
    saveProfile,
    loadProfile,
    getProfiles,
    getActiveProfile,
    getDatasources,
    connectToDatasource
  };
}