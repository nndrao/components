/**
 * Example Configurable Component
 * 
 * Demonstrates the forwardRef pattern with useImperativeHandle
 * to expose component methods to the app container.
 */

import { forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import {
  IConfigurableComponent,
  ComponentState,
  ValidationResult,
  ConfigurableComponentProps,
  ComponentFactory
} from '@/types';

/**
 * Example component configuration
 */
export interface ExampleConfig {
  title: string;
  value: number;
  color: string;
  enabled: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ExampleConfig = {
  title: 'Example Component',
  value: 42,
  color: '#4F46E5',
  enabled: true
};

/**
 * Example component props
 */
export interface ExampleComponentProps extends ConfigurableComponentProps<ExampleConfig> {
  onValueChange?: (value: number) => void;
}

/**
 * Example component interface extending IConfigurableComponent
 */
export interface IExampleComponent extends IConfigurableComponent<ExampleConfig> {
  // Additional component-specific methods
  increment(): void;
  decrement(): void;
  reset(): void;
}

/**
 * Example Configurable Component Implementation
 * 
 * This component demonstrates:
 * 1. forwardRef usage for ref forwarding
 * 2. useImperativeHandle to expose methods
 * 3. Implementation of IConfigurableComponent interface
 * 4. State management and configuration
 */
export const ExampleConfigurableComponent = forwardRef<
  IExampleComponent,
  ExampleComponentProps
>(({ instanceId, initialConfig, displayName, className, style, onValueChange }, ref) => {
  // Component state
  const [config, setConfig] = useState<ExampleConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig
  });
  
  const [stateData, setStateData] = useState<Record<string, any>>({
    clickCount: 0,
    lastModified: new Date().toISOString()
  });

  /**
   * Increment value
   */
  const increment = useCallback(() => {
    setConfig(prev => {
      const newConfig = { ...prev, value: prev.value + 1 };
      onValueChange?.(newConfig.value);
      return newConfig;
    });
    
    setStateData(prev => ({
      ...prev,
      clickCount: prev.clickCount + 1,
      lastModified: new Date().toISOString()
    }));
  }, [onValueChange]);

  /**
   * Decrement value
   */
  const decrement = useCallback(() => {
    setConfig(prev => {
      const newConfig = { ...prev, value: prev.value - 1 };
      onValueChange?.(newConfig.value);
      return newConfig;
    });
    
    setStateData(prev => ({
      ...prev,
      clickCount: prev.clickCount + 1,
      lastModified: new Date().toISOString()
    }));
  }, [onValueChange]);

  /**
   * Reset to default
   */
  const reset = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setStateData({
      clickCount: 0,
      lastModified: new Date().toISOString()
    });
    onValueChange?.(DEFAULT_CONFIG.value);
  }, [onValueChange]);

  /**
   * Expose component interface via useImperativeHandle
   */
  useImperativeHandle(ref, () => ({
    // IConfigurableComponent implementation
    componentId: instanceId,
    componentType: 'custom' as const,
    
    getConfiguration: () => config,
    
    setConfiguration: (newConfig: ExampleConfig) => {
      setConfig(newConfig);
      setStateData(prev => ({
        ...prev,
        lastModified: new Date().toISOString()
      }));
    },
    
    resetConfiguration: () => {
      reset();
    },
    
    getState: (): ComponentState => ({
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: stateData
    }),
    
    setState: (state: ComponentState) => {
      if (state.data) {
        setStateData(state.data);
      }
    },
    
    onBeforeSave: async () => {
      console.log(`[${instanceId}] Preparing to save...`);
      // Perform any cleanup or preparation
    },
    
    onAfterLoad: async (loadedConfig: ExampleConfig) => {
      console.log(`[${instanceId}] Configuration loaded:`, loadedConfig);
      // Perform any post-load initialization
    },
    
    onDestroy: () => {
      console.log(`[${instanceId}] Component destroying...`);
      // Cleanup resources
    },
    
    validateConfiguration: (configToValidate: ExampleConfig): ValidationResult => {
      const errors = [];
      
      if (!configToValidate.title || configToValidate.title.trim().length === 0) {
        errors.push({
          field: 'title',
          message: 'Title is required',
          severity: 'error' as const
        });
      }
      
      if (configToValidate.value < 0 || configToValidate.value > 100) {
        errors.push({
          field: 'value',
          message: 'Value must be between 0 and 100',
          severity: 'warning' as const
        });
      }
      
      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    },
    
    // IExampleComponent specific methods
    increment,
    decrement,
    reset
  }), [instanceId, config, stateData, increment, decrement, reset]);

  /**
   * Render component UI
   */
  return (
    <div 
      className={`p-6 rounded-lg border bg-card ${className || ''}`}
      style={style}
    >
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold" style={{ color: config.color }}>
            {config.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {displayName || `Instance: ${instanceId.slice(0, 8)}`}
          </p>
        </div>

        {/* Value Display */}
        <div className="text-center p-8 bg-muted rounded-md">
          <div className="text-4xl font-bold" style={{ color: config.color }}>
            {config.value}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={decrement}
            disabled={!config.enabled}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Decrement
          </button>
          <button
            onClick={reset}
            disabled={!config.enabled}
            className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
          <button
            onClick={increment}
            disabled={!config.enabled}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Increment
          </button>
        </div>

        {/* State Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Click Count: {stateData.clickCount}</div>
          <div>Last Modified: {new Date(stateData.lastModified).toLocaleTimeString()}</div>
          <div>Enabled: {config.enabled ? 'Yes' : 'No'}</div>
        </div>

        {/* Configuration */}
        <details className="cursor-pointer">
          <summary className="text-sm font-medium">Configuration</summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify(config, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
});

ExampleConfigurableComponent.displayName = 'ExampleConfigurableComponent';

/**
 * Factory function for creating example components
 */
export const createExampleComponent: ComponentFactory<IExampleComponent> = (
  instanceId: string,
  initialConfig?: ExampleConfig
) => {
  return (
    <ExampleConfigurableComponent
      instanceId={instanceId}
      initialConfig={initialConfig}
    />
  );
};