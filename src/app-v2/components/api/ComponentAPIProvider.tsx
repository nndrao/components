/**
 * ComponentAPIProvider
 * 
 * Context provider that makes the Component API available to child components.
 */

import React, { createContext, useContext } from 'react';
import { ComponentAPI } from './component.types';

/**
 * Component API Context
 */
const ComponentAPIContext = createContext<ComponentAPI | null>(null);

/**
 * Component API Provider Props
 */
interface ComponentAPIProviderProps {
  /**
   * Component API instance
   */
  api: ComponentAPI;
  
  /**
   * Child components
   */
  children: React.ReactNode;
}

/**
 * Component API Provider
 */
export function ComponentAPIProvider({ api, children }: ComponentAPIProviderProps) {
  return (
    <ComponentAPIContext.Provider value={api}>
      {children}
    </ComponentAPIContext.Provider>
  );
}

/**
 * Hook to access the Component API
 */
export function useComponentAPIContext(): ComponentAPI {
  const context = useContext(ComponentAPIContext);
  if (!context) {
    throw new Error('useComponentAPIContext must be used within a ComponentAPIProvider');
  }
  return context;
}