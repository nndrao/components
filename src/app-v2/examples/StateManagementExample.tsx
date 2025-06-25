/**
 * State Management Example
 * 
 * Demonstrates Zustand stores and custom hooks usage.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';

// Import stores and hooks
import {
  useConfigStore,
  useConfigActions,
  useWorkspaceStore,
  useWorkspaceActions,
  useActiveWorkspace,
  useWorkspaceHasUnsavedChanges
} from '../stores';

import {
  useDebounce,
  useAutoSave,
  useUpdateGuard,
  useDebouncedCallback
} from '../hooks';

import { Config } from '../services/config';
import { generateConfigId } from '../utils/config.utils';

export default function StateManagementExample() {
  // Store state and actions
  const configStore = useConfigStore();
  const { saveConfig, loadConfigs } = useConfigActions();
  const { addComponent, saveWorkspace } = useWorkspaceActions();
  const activeWorkspace = useActiveWorkspace();
  const hasUnsavedChanges = useWorkspaceHasUnsavedChanges();
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [updateCount, setUpdateCount] = useState(0);
  
  // Hooks demonstration
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Update guard to prevent update storms
  const updateGuard = useUpdateGuard({
    minInterval: 100,
    maxUpdates: 5,
    timeWindow: 1000,
    onBlocked: (reason) => {
      console.warn('Update blocked:', reason);
    }
  });
  
  // Auto-save for document
  const autoSave = useAutoSave(documentContent, {
    onSave: async (content) => {
      // Simulate saving
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('Auto-saved:', content);
    },
    debounceDelay: 1000,
    interval: 30000,
    enabled: true,
  });
  
  // Debounced callback example
  const debouncedLog = useDebouncedCallback(
    (value: string) => {
      console.log('Debounced value:', value);
    },
    500,
    { maxWait: 2000 }
  );
  
  // Initialize config store
  useEffect(() => {
    configStore.initialize();
  }, []);
  
  // Load configs when initialized
  useEffect(() => {
    if (configStore.initialized) {
      loadConfigs();
    }
  }, [configStore.initialized]);
  
  // Search effect
  useEffect(() => {
    if (debouncedSearchTerm) {
      console.log('Searching for:', debouncedSearchTerm);
      // Perform search with debounced term
    }
  }, [debouncedSearchTerm]);
  
  // Create a test config
  const handleCreateConfig = async () => {
    const newConfig: Config = {
      configId: generateConfigId('demo'),
      appId: 'demo-app',
      userId: 'demo-user',
      componentType: 'Test',
      name: `Test Config ${Date.now()}`,
      settings: {
        created: new Date().toISOString(),
        random: Math.random()
      },
      createdBy: 'demo-user',
      creationTime: Date.now()
    };
    
    await saveConfig(newConfig);
  };
  
  // Simulate rapid updates
  const handleRapidUpdate = () => {
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        if (updateGuard.canUpdate()) {
          setUpdateCount((prev) => prev + 1);
          console.log(`Update ${i + 1} allowed`);
        } else {
          console.log(`Update ${i + 1} blocked`);
        }
      }, i * 50);
    }
  };
  
  // Handle input change with debounced callback
  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    debouncedLog(value);
  };
  
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">State Management Example</h1>
        <p className="text-muted-foreground">
          Demonstration of Zustand stores and custom hooks
        </p>
      </div>
      
      {/* Store Status */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Store Status</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-medium">Config Store</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Initialized:</span>
                <Badge variant={configStore.initialized ? 'default' : 'secondary'}>
                  {configStore.initialized ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Loading:</span>
                <Badge variant={configStore.loading ? 'default' : 'secondary'}>
                  {configStore.loading ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Configs:</span>
                <span>{configStore.configs.size}</span>
              </div>
              {configStore.error && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{configStore.error.message}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium">Workspace Store</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Active Workspace:</span>
                <span>{activeWorkspace?.name || 'None'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Unsaved Changes:</span>
                <Badge variant={hasUnsavedChanges ? 'destructive' : 'secondary'}>
                  {hasUnsavedChanges ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex gap-2">
          <Button onClick={handleCreateConfig} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Config
          </Button>
          <Button onClick={() => loadConfigs()} size="sm" variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload Configs
          </Button>
        </div>
      </Card>
      
      {/* Hooks Demonstration */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* useDebounce Example */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">useDebounce Hook</h3>
          <div className="space-y-4">
            <Input
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Type to search..."
            />
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Input value:</span>{' '}
                <code className="bg-muted px-1 py-0.5 rounded">{searchTerm}</code>
              </div>
              <div>
                <span className="text-muted-foreground">Debounced value:</span>{' '}
                <code className="bg-muted px-1 py-0.5 rounded">{debouncedSearchTerm}</code>
              </div>
            </div>
          </div>
        </Card>
        
        {/* useUpdateGuard Example */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">useUpdateGuard Hook</h3>
          <div className="space-y-4">
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Update count:</span>{' '}
                <span className="font-mono">{updateCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total attempts:</span>{' '}
                <span className="font-mono">{updateGuard.getUpdateCount()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Blocked:</span>
                <Badge variant={updateGuard.isBlocked() ? 'destructive' : 'secondary'}>
                  {updateGuard.isBlocked() ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleRapidUpdate} size="sm">
                Trigger Rapid Updates
              </Button>
              <Button onClick={updateGuard.reset} size="sm" variant="outline">
                Reset Guard
              </Button>
            </div>
          </div>
        </Card>
        
        {/* useAutoSave Example */}
        <Card className="p-6 md:col-span-2">
          <h3 className="font-semibold mb-4">useAutoSave Hook</h3>
          <div className="space-y-4">
            <Textarea
              value={documentContent}
              onChange={(e) => setDocumentContent(e.target.value)}
              placeholder="Start typing to see auto-save in action..."
              rows={4}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  {autoSave.saveState === 'saving' && (
                    <Badge variant="default">
                      <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                      Saving
                    </Badge>
                  )}
                  {autoSave.saveState === 'saved' && (
                    <Badge variant="default">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Saved
                    </Badge>
                  )}
                  {autoSave.saveState === 'error' && (
                    <Badge variant="destructive">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Error
                    </Badge>
                  )}
                  {autoSave.saveState === 'idle' && (
                    <Badge variant="secondary">Idle</Badge>
                  )}
                </div>
                {autoSave.lastSaved && (
                  <div>
                    <span className="text-muted-foreground">Last saved:</span>{' '}
                    {autoSave.lastSaved.toLocaleTimeString()}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={autoSave.save} 
                  size="sm"
                  disabled={autoSave.saveState === 'saving'}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Now
                </Button>
                {autoSave.isPending() && (
                  <Button onClick={autoSave.cancel} size="sm" variant="outline">
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Config List */}
      {configStore.configs.size > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Stored Configurations</h3>
          <div className="space-y-2">
            {Array.from(configStore.configs.values()).map((config) => (
              <div
                key={config.configId}
                className="flex items-center justify-between p-3 border rounded"
              >
                <div>
                  <div className="font-medium">{config.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Type: {config.componentType} • ID: {config.configId}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => configStore.deleteConfig(config.configId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}