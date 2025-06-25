/**
 * Workspace Store
 * 
 * Zustand store for managing workspace state, components, and layout.
 * Handles workspace-level operations and component lifecycle.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { enableMapSet } from 'immer';
import { Config } from '../services/config';

// Enable immer MapSet plugin
enableMapSet();

export interface ComponentInstance {
  id: string;
  configId: string;
  type: string;
  title: string;
  settings?: any;
  isDirty?: boolean;
  isReady?: boolean;
}

export interface WorkspaceLayout {
  version: string;
  panels: any;
  grid?: any;
}

// Export aliases for test compatibility
export type Workspace = Config;
export type WorkspaceComponent = ComponentInstance;

interface WorkspaceState {
  // State
  workspaces: Map<string, Config>;
  activeWorkspaceId: string | null;
  components: Map<string, ComponentInstance>;
  layout: WorkspaceLayout | null;
  isDirty: boolean;
  lastSaveTime: number | null;
  saving: boolean;
  loading: boolean;
  error: Error | null;
  
  // Actions
  setActiveWorkspace: (id: string | null) => void;
  addWorkspace: (workspace: Config) => void;
  updateWorkspace: (id: string, updates: Partial<Config>) => void;
  removeWorkspace: (id: string) => void;
  deleteWorkspace: (id: string) => void;
  markDirty: () => void;
  
  // Component management
  addComponent: (component: ComponentInstance) => void;
  updateComponent: (id: string, updates: Partial<ComponentInstance>) => void;
  removeComponent: (id: string) => void;
  markComponentDirty: (id: string, isDirty: boolean) => void;
  markComponentReady: (id: string, isReady: boolean) => void;
  
  // Layout management
  setLayout: (layout: WorkspaceLayout) => void;
  updateLayout: (updates: Partial<WorkspaceLayout>) => void;
  
  // Save operations
  saveWorkspace: () => Promise<void>;
  markClean: () => void;
  
  // Selectors
  getActiveWorkspace: () => Config | undefined;
  getComponent: (id: string) => ComponentInstance | undefined;
  getComponentsByType: (type: string) => ComponentInstance[];
  getWorkspaceComponents: (workspaceId: string) => ComponentInstance[];
  hasUnsavedChanges: () => boolean;
  
  // Utility actions
  reset: () => void;
  setError: (error: Error | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        workspaces: new Map(),
        activeWorkspaceId: null,
        components: new Map(),
        layout: null,
        isDirty: false,
        lastSaveTime: null,
        saving: false,
        loading: false,
        error: null,
        
        // Set active workspace
        setActiveWorkspace: (id: string | null) => {
          set((state) => {
            state.activeWorkspaceId = id;
            state.isDirty = false;
            
            // Clear components when switching workspaces
            state.components.clear();
            state.layout = null;
          });
        },
        
        // Add workspace
        addWorkspace: (workspace: Config) => {
          set((state) => {
            state.workspaces.set(workspace.configId, workspace);
          });
        },
        
        // Update workspace
        updateWorkspace: (id: string, updates: Partial<Config>) => {
          set((state) => {
            const workspace = state.workspaces.get(id);
            if (workspace) {
              Object.assign(workspace, updates);
              state.isDirty = true;
            }
          });
        },
        
        // Remove workspace
        removeWorkspace: (id: string) => {
          set((state) => {
            state.workspaces.delete(id);
            if (state.activeWorkspaceId === id) {
              state.activeWorkspaceId = null;
              state.components.clear();
              state.layout = null;
            }
          });
        },
        
        // Delete workspace (alias for removeWorkspace)
        deleteWorkspace: (id: string) => {
          get().removeWorkspace(id);
        },
        
        // Mark dirty
        markDirty: () => {
          set((state) => {
            state.isDirty = true;
          });
        },
        
        // Add component
        addComponent: (component: ComponentInstance) => {
          set((state) => {
            state.components.set(component.id, component);
            state.isDirty = true;
          });
        },
        
        // Update component
        updateComponent: (id: string, updates: Partial<ComponentInstance>) => {
          set((state) => {
            const component = state.components.get(id);
            if (component) {
              Object.assign(component, updates);
              state.isDirty = true;
            }
          });
        },
        
        // Remove component
        removeComponent: (id: string) => {
          set((state) => {
            state.components.delete(id);
            state.isDirty = true;
          });
        },
        
        // Mark component dirty
        markComponentDirty: (id: string, isDirty: boolean) => {
          set((state) => {
            const component = state.components.get(id);
            if (component) {
              component.isDirty = isDirty;
              if (isDirty) {
                state.isDirty = true;
              }
            }
          });
        },
        
        // Mark component ready
        markComponentReady: (id: string, isReady: boolean) => {
          set((state) => {
            const component = state.components.get(id);
            if (component) {
              component.isReady = isReady;
            }
          });
        },
        
        // Set layout
        setLayout: (layout: WorkspaceLayout) => {
          set((state) => {
            state.layout = layout;
            state.isDirty = true;
          });
        },
        
        // Update layout
        updateLayout: (updates: Partial<WorkspaceLayout>) => {
          set((state) => {
            if (state.layout) {
              Object.assign(state.layout, updates);
              state.isDirty = true;
            }
          });
        },
        
        // Save workspace
        saveWorkspace: async () => {
          const state = get();
          if (!state.activeWorkspaceId || !state.isDirty) return;
          
          set((state) => {
            state.saving = true;
            state.error = null;
          });
          
          try {
            // Collect component states
            const componentStates: Record<string, any> = {};
            state.components.forEach((component, id) => {
              componentStates[id] = {
                type: component.type,
                settings: component.settings,
                configId: component.configId,
              };
            });
            
            // Save workspace configuration
            const workspace = state.getActiveWorkspace();
            if (workspace) {
              // Here you would call the config service to save
              // For now, we'll just update local state
              workspace.settings = {
                ...workspace.settings,
                componentStates,
                layout: state.layout,
                savedAt: Date.now(),
              };
            }
            
            set((state) => {
              state.isDirty = false;
              state.lastSaveTime = Date.now();
              state.saving = false;
              
              // Mark all components as clean
              state.components.forEach((component) => {
                component.isDirty = false;
              });
            });
          } catch (error) {
            set((state) => {
              state.error = error as Error;
              state.saving = false;
            });
            throw error;
          }
        },
        
        // Mark clean
        markClean: () => {
          set((state) => {
            state.isDirty = false;
            state.components.forEach((component) => {
              component.isDirty = false;
            });
          });
        },
        
        // Get active workspace
        getActiveWorkspace: () => {
          const state = get();
          return state.activeWorkspaceId
            ? state.workspaces.get(state.activeWorkspaceId)
            : undefined;
        },
        
        // Get component
        getComponent: (id: string) => {
          return get().components.get(id);
        },
        
        // Get components by type
        getComponentsByType: (type: string) => {
          const components = Array.from(get().components.values());
          return components.filter((component) => component.type === type);
        },
        
        // Get workspace components
        getWorkspaceComponents: (workspaceId: string) => {
          // In a real implementation, this would filter by workspace
          return Array.from(get().components.values());
        },
        
        // Check if there are unsaved changes
        hasUnsavedChanges: () => {
          const state = get();
          if (state.isDirty) return true;
          
          // Check if any component is dirty
          for (const component of state.components.values()) {
            if (component.isDirty) return true;
          }
          
          return false;
        },
        
        // Reset store
        reset: () => {
          set((state) => {
            state.workspaces.clear();
            state.activeWorkspaceId = null;
            state.components.clear();
            state.layout = null;
            state.isDirty = false;
            state.lastSaveTime = null;
            state.saving = false;
            state.loading = false;
            state.error = null;
          });
        },
        
        // Set error
        setError: (error: Error | null) => {
          set((state) => {
            state.error = error;
          });
        },
      }))
    ),
    {
      name: 'workspace-store',
    }
  )
);

// Selector hooks
export const useActiveWorkspace = () => {
  return useWorkspaceStore((state) => state.getActiveWorkspace());
};

export const useWorkspaceComponent = (id: string) => {
  return useWorkspaceStore((state) => state.getComponent(id));
};

export const useWorkspaceComponents = () => {
  return useWorkspaceStore((state) => Array.from(state.components.values()));
};

export const useWorkspaceLayout = () => {
  return useWorkspaceStore((state) => state.layout);
};

export const useWorkspaceIsDirty = () => {
  return useWorkspaceStore((state) => state.isDirty);
};

export const useWorkspaceHasUnsavedChanges = () => {
  return useWorkspaceStore((state) => state.hasUnsavedChanges());
};

// Action hooks
export const useWorkspaceActions = () => {
  const store = useWorkspaceStore();
  
  // Create a new workspace
  const createWorkspace = (data: Partial<Config>) => {
    const workspace: Config = {
      configId: `workspace-${Date.now()}`,
      appId: 'workspace-app',
      userId: 'current-user',
      componentType: 'Workspace',
      name: data.name || 'New Workspace',
      settings: data.settings || {},
      createdBy: 'current-user',
      creationTime: Date.now(),
      ...data,
    };
    
    store.addWorkspace(workspace);
    return workspace;
  };
  
  return {
    createWorkspace,
    updateWorkspace: store.updateWorkspace,
    deleteWorkspace: store.deleteWorkspace,
    setActiveWorkspace: store.setActiveWorkspace,
    addComponent: store.addComponent,
    updateComponent: store.updateComponent,
    removeComponent: store.removeComponent,
    setLayout: store.setLayout,
    saveWorkspace: store.saveWorkspace,
    markDirty: store.markDirty,
    clearDirty: store.markClean,
  };
};