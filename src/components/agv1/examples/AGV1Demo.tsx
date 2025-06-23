/**
 * AGV1 Demo Application
 * 
 * Demonstrates how to use the AGV1Provider and create/manage
 * configurable components using the app container.
 */

import React, { useState, useEffect } from 'react';
import {
  AGV1Provider,
  useAppContainer,
  useService,
  useRegisterComponentFactory,
  ComponentInstance
} from '../providers';
import {
  createExampleComponent
} from './ExampleConfigurableComponent';
import type { ComponentFactory } from '@/types';

/**
 * Component factory registry
 */
const componentFactories: Partial<Record<string, ComponentFactory>> = {
  custom: createExampleComponent
};

/**
 * Demo app content
 */
const DemoAppContent: React.FC = () => {
  const appContainer = useAppContainer();
  const notificationService = useService('notification');
  const registerFactories = useRegisterComponentFactory();
  const [components, setComponents] = useState<ComponentInstance[]>([]);

  // Register component factories on mount
  useEffect(() => {
    registerFactories(componentFactories as any);
    notificationService.success('AGV1 Demo initialized');
  }, [registerFactories, notificationService]);

  // Create a new component
  const handleCreateComponent = () => {
    try {
      const instance = appContainer.createComponent(
        'custom',
        {
          title: `Component ${components.length + 1}`,
          value: Math.floor(Math.random() * 100),
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
          enabled: true
        },
        {
          displayName: `Example ${components.length + 1}`
        }
      );

      setComponents(prev => [...prev, instance]);
    } catch (error) {
      notificationService.error(`Failed to create component: ${error}`);
    }
  };

  // Destroy a component
  const handleDestroyComponent = (instanceId: string) => {
    appContainer.destroyComponent(instanceId);
    setComponents(prev => prev.filter(c => c.instanceId !== instanceId));
  };

  // Save all configurations
  const handleSaveAll = async () => {
    try {
      await appContainer.saveAllConfigurations();
    } catch (error) {
      notificationService.error('Failed to save configurations');
    }
  };

  // Load all configurations
  const handleLoadAll = async () => {
    try {
      await appContainer.loadAllConfigurations();
    } catch (error) {
      notificationService.error('Failed to load configurations');
    }
  };

  // Get component statistics
  const stats = appContainer.getAllComponents();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">AGV1 Demo Application</h1>
          <p className="text-muted-foreground">
            Demonstrating the AGV1 component system with configurable components
          </p>
        </div>

        {/* Controls */}
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Controls</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleCreateComponent}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Create Component
            </button>
            <button
              onClick={handleSaveAll}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
            >
              Save All
            </button>
            <button
              onClick={handleLoadAll}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
            >
              Load All
            </button>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            Active Components: {stats.length}
          </div>
        </div>

        {/* Component Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {components.map(instance => (
            <div key={instance.instanceId} className="relative">
              {/* Render the component */}
              {instance.element}
              
              {/* Destroy button */}
              <button
                onClick={() => handleDestroyComponent(instance.instanceId)}
                className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                title="Destroy component"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {components.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="mb-4">No components created yet.</p>
            <p>Click "Create Component" to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * AGV1 Demo Application
 */
export const AGV1Demo: React.FC = () => {
  return (
    <AGV1Provider
      userId="demo-user"
      appId="agv1-demo"
      storageMode="local"
      autoInitialize={true}
    >
      <DemoAppContent />
    </AGV1Provider>
  );
};

/**
 * Standalone demo app for testing
 */
export default function App() {
  return <AGV1Demo />;
}