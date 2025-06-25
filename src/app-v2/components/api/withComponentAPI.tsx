/**
 * withComponentAPI HOC
 * 
 * Higher-order component that provides Component API functionality
 * to wrapped components.
 */

import React, { ComponentType, forwardRef } from 'react';
import { ComponentAPIProvider } from './ComponentAPIProvider';
import { useComponentAPI } from './useComponentAPI';
import {
  ConfigurableComponent,
  ComponentLifecycle,
  ComponentAPI,
  SettingsSchema,
  ValidationResult,
} from './component.types';

/**
 * Options for withComponentAPI HOC
 */
export interface WithComponentAPIOptions<TSettings = any> {
  /**
   * Component information
   */
  component: ConfigurableComponent<TSettings>;
  
  /**
   * Default settings
   */
  defaultSettings: TSettings;
  
  /**
   * Settings schema for validation
   */
  schema?: SettingsSchema;
  
  /**
   * Component lifecycle hooks
   */
  lifecycle?: ComponentLifecycle<TSettings>;
  
  /**
   * Enable auto-save
   */
  enableAutoSave?: boolean;
  
  /**
   * Auto-save delay in ms
   */
  autoSaveDelay?: number;
  
  /**
   * Custom validation function
   */
  validate?: (settings: TSettings) => ValidationResult;
}

/**
 * Props injected by withComponentAPI
 */
export interface WithComponentAPIProps<TSettings = any> {
  /**
   * Component API
   */
  api: ComponentAPI<TSettings>;
}

/**
 * Higher-order component that provides Component API
 */
export function withComponentAPI<TSettings = any>(
  options: WithComponentAPIOptions<TSettings>
) {
  return function <P extends WithComponentAPIProps<TSettings>>(
    WrappedComponent: ComponentType<P>
  ) {
    type PropsWithoutAPI = Omit<P, keyof WithComponentAPIProps<TSettings>>;
    
    const WithAPI: React.FC<PropsWithoutAPI> = (props) => {
      // Create Component API
      const api = useComponentAPI(options);

      // Render wrapped component with API
      const componentProps = {
        ...props,
        api,
      } as P;

      return (
        <ComponentAPIProvider api={api}>
          <WrappedComponent {...componentProps} />
        </ComponentAPIProvider>
      );
    };

    // Set display name
    WithAPI.displayName = `withComponentAPI(${
      WrappedComponent.displayName || WrappedComponent.name || 'Component'
    })`;

    return WithAPI;
  };
}