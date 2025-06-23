/**
 * App Container Service
 * 
 * Manages the lifecycle of all components in the application.
 * Handles component registration, creation, destruction, and
 * coordination between components.
 */

import {
  IAppContainerService,
  IConfigurableComponent,
  ComponentType,
  ComponentRegistryEntry,
  ComponentLifecycleEvent,
  ComponentFactory
} from '@/types';
import { v4 as uuidv4 } from 'uuid';
import React from 'react';

/**
 * Component lifecycle event listener
 */
export type LifecycleEventListener = (event: ComponentLifecycleEvent) => void;

/**
 * Registry change listener
 */
export type RegistryChangeListener = (registry: ComponentRegistryEntry[]) => void;

/**
 * Component metadata
 */
interface ComponentMetadata {
  displayName?: string;
  created: string;
  lastModified: string;
  [key: string]: any;
}

/**
 * Layout state (placeholder for Dockview integration)
 */
interface LayoutState {
  version: string;
  panels: any[];
  layout: any;
}

/**
 * App container service implementation
 */
export class AppContainerService implements IAppContainerService {
  private registry: Map<string, ComponentRegistryEntry> = new Map();
  private componentFactories: Map<ComponentType, ComponentFactory> = new Map();
  private lifecycleListeners: LifecycleEventListener[] = [];
  private registryListeners: RegistryChangeListener[] = [];
  private layoutState: LayoutState | null = null;

  /**
   * Register component factories
   */
  registerComponentFactory(type: ComponentType, factory: ComponentFactory): void {
    this.componentFactories.set(type, factory);
    console.log(`Component factory registered for type: ${type}`);
  }

  /**
   * Register a component
   */
  registerComponent(entry: ComponentRegistryEntry): void {
    if (this.registry.has(entry.instanceId)) {
      throw new Error(`Component ${entry.instanceId} is already registered`);
    }
    
    this.registry.set(entry.instanceId, entry);
    
    // Emit lifecycle event
    this.emitLifecycleEvent({
      type: 'created',
      instanceId: entry.instanceId,
      componentType: entry.componentType,
      timestamp: new Date().toISOString()
    });
    
    // Notify registry listeners
    this.notifyRegistryChange();
    
    console.log(`Component registered: ${entry.instanceId} (${entry.componentType})`);
  }

  /**
   * Get a component by instance ID
   */
  getComponent(instanceId: string): ComponentRegistryEntry | null {
    return this.registry.get(instanceId) || null;
  }

  /**
   * Get all components
   */
  getAllComponents(): ComponentRegistryEntry[] {
    return Array.from(this.registry.values());
  }

  /**
   * Get components by type
   */
  getComponentsByType(type: ComponentType): ComponentRegistryEntry[] {
    return Array.from(this.registry.values()).filter(
      entry => entry.componentType === type
    );
  }

  /**
   * Remove a component
   */
  removeComponent(instanceId: string): void {
    const entry = this.registry.get(instanceId);
    
    if (!entry) {
      console.warn(`Component ${instanceId} not found in registry`);
      return;
    }
    
    // Call component's onDestroy if available
    if (entry.ref.current?.onDestroy) {
      try {
        entry.ref.current.onDestroy();
      } catch (error) {
        console.error(`Error destroying component ${instanceId}:`, error);
      }
    }
    
    // Remove from registry
    this.registry.delete(instanceId);
    
    // Emit lifecycle event
    this.emitLifecycleEvent({
      type: 'destroyed',
      instanceId,
      componentType: entry.componentType,
      timestamp: new Date().toISOString()
    });
    
    // Notify registry listeners
    this.notifyRegistryChange();
    
    console.log(`Component removed: ${instanceId}`);
  }

  /**
   * Create a new component instance
   */
  createComponent(
    type: ComponentType,
    config?: any,
    metadata?: any
  ): ComponentRegistryEntry {
    const factory = this.componentFactories.get(type);
    
    if (!factory) {
      throw new Error(`No factory registered for component type: ${type}`);
    }
    
    const instanceId = uuidv4();
    const ref = React.createRef<IConfigurableComponent>();
    
    // Create metadata
    const componentMetadata: ComponentMetadata = {
      displayName: metadata?.displayName || `${type}-${instanceId.slice(0, 8)}`,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      ...metadata
    };
    
    // Create registry entry
    const entry: ComponentRegistryEntry = {
      instanceId,
      componentType: type,
      ref,
      metadata: componentMetadata
    };
    
    // Register the component
    this.registerComponent(entry);
    
    // Note: The actual React element creation should be done by the consumer
    // using the factory function with the instanceId
    
    return entry;
  }

  /**
   * Destroy a component instance
   */
  destroyComponent(instanceId: string): void {
    this.removeComponent(instanceId);
  }

  /**
   * Save all component configurations
   */
  async saveAllConfigurations(): Promise<void> {
    console.log('Saving all component configurations...');
    
    const savePromises: Promise<void>[] = [];
    
    for (const entry of this.registry.values()) {
      if (entry.ref.current) {
        const component = entry.ref.current;
        
        try {
          // Call onBeforeSave if available
          if (component.onBeforeSave) {
            await component.onBeforeSave();
          }
          
          // Get configuration
          const config = component.getConfiguration();
          
          // Here you would typically save to ConfigurationService
          // For now, we'll just log it
          console.log(`Saving config for ${entry.instanceId}:`, config);
          
          // Update metadata
          if (entry.metadata) {
            entry.metadata.lastModified = new Date().toISOString();
          }
          
          // Emit event
          this.emitLifecycleEvent({
            type: 'configured',
            instanceId: entry.instanceId,
            componentType: entry.componentType,
            timestamp: new Date().toISOString(),
            data: { action: 'saved' }
          });
        } catch (error) {
          console.error(`Failed to save configuration for ${entry.instanceId}:`, error);
          
          this.emitLifecycleEvent({
            type: 'error',
            instanceId: entry.instanceId,
            componentType: entry.componentType,
            timestamp: new Date().toISOString(),
            error: error as Error
          });
        }
      }
    }
    
    await Promise.all(savePromises);
    console.log('All configurations saved');
  }

  /**
   * Load all component configurations
   */
  async loadAllConfigurations(): Promise<void> {
    console.log('Loading all component configurations...');
    
    const loadPromises: Promise<void>[] = [];
    
    for (const entry of this.registry.values()) {
      if (entry.ref.current) {
        const component = entry.ref.current;
        
        try {
          // Here you would typically load from ConfigurationService
          // For now, we'll use a placeholder
          const config = {}; // Would come from storage
          
          // Set configuration
          component.setConfiguration(config);
          
          // Call onAfterLoad if available
          if (component.onAfterLoad) {
            await component.onAfterLoad(config);
          }
          
          // Emit event
          this.emitLifecycleEvent({
            type: 'configured',
            instanceId: entry.instanceId,
            componentType: entry.componentType,
            timestamp: new Date().toISOString(),
            data: { action: 'loaded' }
          });
        } catch (error) {
          console.error(`Failed to load configuration for ${entry.instanceId}:`, error);
          
          this.emitLifecycleEvent({
            type: 'error',
            instanceId: entry.instanceId,
            componentType: entry.componentType,
            timestamp: new Date().toISOString(),
            error: error as Error
          });
        }
      }
    }
    
    await Promise.all(loadPromises);
    console.log('All configurations loaded');
  }

  /**
   * Reset all components to default
   */
  resetAllComponents(): void {
    console.log('Resetting all components to default...');
    
    for (const entry of this.registry.values()) {
      if (entry.ref.current) {
        try {
          entry.ref.current.resetConfiguration();
          
          // Emit event
          this.emitLifecycleEvent({
            type: 'configured',
            instanceId: entry.instanceId,
            componentType: entry.componentType,
            timestamp: new Date().toISOString(),
            data: { action: 'reset' }
          });
        } catch (error) {
          console.error(`Failed to reset component ${entry.instanceId}:`, error);
        }
      }
    }
  }

  /**
   * Get component ref by instance ID
   */
  getComponentRef(instanceId: string): React.RefObject<IConfigurableComponent> | null {
    const entry = this.registry.get(instanceId);
    return entry?.ref || null;
  }

  /**
   * Save current layout
   */
  async saveLayout(): Promise<any> {
    // This would integrate with Dockview to get the current layout state
    this.layoutState = {
      version: '1.0',
      panels: [],
      layout: {}
    };
    
    // Include component registry info
    const componentInfo = Array.from(this.registry.entries()).map(([id, entry]) => ({
      instanceId: id,
      componentType: entry.componentType,
      metadata: entry.metadata
    }));
    
    const fullLayout = {
      ...this.layoutState,
      components: componentInfo,
      savedAt: new Date().toISOString()
    };
    
    console.log('Layout saved:', fullLayout);
    return fullLayout;
  }

  /**
   * Load a layout
   */
  async loadLayout(layout: any): Promise<void> {
    console.log('Loading layout:', layout);
    
    // This would integrate with Dockview to restore the layout
    this.layoutState = layout;
    
    // Recreate components if needed
    if (layout.components) {
      for (const componentInfo of layout.components) {
        if (!this.registry.has(componentInfo.instanceId)) {
          // Component doesn't exist, might need to recreate it
          console.log(`Component ${componentInfo.instanceId} needs to be recreated`);
        }
      }
    }
  }

  /**
   * Reset layout to default
   */
  resetLayout(): void {
    console.log('Resetting layout to default');
    this.layoutState = null;
    
    // This would integrate with Dockview to reset the layout
  }

  /**
   * Subscribe to component registry changes
   */
  onRegistryChange(callback: RegistryChangeListener): () => void {
    this.registryListeners.push(callback);
    
    // Immediately notify with current state
    callback(this.getAllComponents());
    
    // Return unsubscribe function
    return () => {
      const index = this.registryListeners.indexOf(callback);
      if (index > -1) {
        this.registryListeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to component lifecycle events
   */
  onComponentLifecycle(callback: LifecycleEventListener): () => void {
    this.lifecycleListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.lifecycleListeners.indexOf(callback);
      if (index > -1) {
        this.lifecycleListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get component statistics
   */
  getStatistics(): {
    totalComponents: number;
    componentsByType: Record<string, number>;
    healthyComponents: number;
    errorComponents: number;
  } {
    const stats = {
      totalComponents: this.registry.size,
      componentsByType: {} as Record<string, number>,
      healthyComponents: 0,
      errorComponents: 0
    };
    
    for (const entry of this.registry.values()) {
      // Count by type
      stats.componentsByType[entry.componentType] = 
        (stats.componentsByType[entry.componentType] || 0) + 1;
      
      // Check health (simplified - would need actual health check)
      if (entry.ref.current) {
        stats.healthyComponents++;
      } else {
        stats.errorComponents++;
      }
    }
    
    return stats;
  }

  /**
   * Find components by metadata
   */
  findComponentsByMetadata(predicate: (metadata: any) => boolean): ComponentRegistryEntry[] {
    return Array.from(this.registry.values()).filter(
      entry => entry.metadata && predicate(entry.metadata)
    );
  }

  /**
   * Batch operations on multiple components
   */
  async batchOperation(
    instanceIds: string[],
    operation: (component: IConfigurableComponent) => Promise<void>
  ): Promise<void> {
    const operations = instanceIds.map(async (instanceId) => {
      const entry = this.registry.get(instanceId);
      
      if (entry?.ref.current) {
        try {
          await operation(entry.ref.current);
        } catch (error) {
          console.error(`Batch operation failed for ${instanceId}:`, error);
          throw error;
        }
      }
    });
    
    await Promise.all(operations);
  }

  /**
   * Emit lifecycle event
   */
  private emitLifecycleEvent(event: ComponentLifecycleEvent): void {
    this.lifecycleListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in lifecycle event listener:', error);
      }
    });
  }

  /**
   * Notify registry change listeners
   */
  private notifyRegistryChange(): void {
    const components = this.getAllComponents();
    
    this.registryListeners.forEach(listener => {
      try {
        listener(components);
      } catch (error) {
        console.error('Error in registry change listener:', error);
      }
    });
  }

  /**
   * Validate component health
   */
  async validateComponentHealth(instanceId: string): Promise<boolean> {
    const entry = this.registry.get(instanceId);
    
    if (!entry) {
      return false;
    }
    
    if (!entry.ref.current) {
      return false;
    }
    
    try {
      // Try to get configuration as a basic health check
      entry.ref.current.getConfiguration();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    console.log('Disposing AppContainerService...');
    
    // Destroy all components
    const instanceIds = Array.from(this.registry.keys());
    for (const instanceId of instanceIds) {
      this.destroyComponent(instanceId);
    }
    
    // Clear all listeners
    this.lifecycleListeners = [];
    this.registryListeners = [];
    
    // Clear factories
    this.componentFactories.clear();
    
    console.log('AppContainerService disposed');
  }
}