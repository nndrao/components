/**
 * Config Store
 * 
 * Zustand store that wraps the Config Service for state management.
 * Provides optimized selectors and actions for configuration management.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { enableMapSet } from 'immer';
import { Config, ConfigFilter, ConfigEvent } from '../services/config';
import { createConfigService, ConfigServiceWithEvents } from '../services/config/config.service';

// Enable immer MapSet plugin
enableMapSet();

interface ConfigState {
  // State
  configs: Map<string, Config>;
  loading: boolean;
  error: Error | null;
  initialized: boolean;
  lastFetch: number | null;
  
  // Service instance
  service: ConfigServiceWithEvents | null;
  
  // Actions
  initialize: () => Promise<void>;
  loadConfigs: (filter?: ConfigFilter) => Promise<void>;
  saveConfig: (config: Config) => Promise<void>;
  updateConfig: (id: string, updates: Partial<Config>) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;
  refreshConfig: (id: string) => Promise<void>;
  
  // Bulk actions
  saveMany: (configs: Config[]) => Promise<void>;
  deleteMany: (ids: string[]) => Promise<void>;
  
  // Selectors
  getConfig: (id: string) => Config | undefined;
  getConfigsByType: (type: string) => Config[];
  getConfigsByParent: (parentId: string) => Config[];
  getConfigsByOwner: (ownerId: string) => Config[];
  
  // Utility actions
  clearCache: () => void;
  setError: (error: Error | null) => void;
}

export const useConfigStore = create<ConfigState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        configs: new Map(),
        loading: false,
        error: null,
        initialized: false,
        lastFetch: null,
        service: null,
        
        // Initialize the service
        initialize: async () => {
          const state = get();
          if (state.initialized) return;
          
          set((state) => {
            state.loading = true;
            state.error = null;
          });
          
          try {
            const service = await createConfigService();
            
            // Subscribe to service events
            service.on('config:created', (event: ConfigEvent) => {
              if (event.config) {
                set((state) => {
                  state.configs.set(event.config!.configId, event.config!);
                });
              }
            });
            
            service.on('config:updated', (event: ConfigEvent) => {
              if (event.config) {
                set((state) => {
                  state.configs.set(event.config!.configId, event.config!);
                });
              }
            });
            
            service.on('config:deleted', (event: ConfigEvent) => {
              if (event.configId) {
                set((state) => {
                  state.configs.delete(event.configId!);
                });
              }
            });
            
            set((state) => {
              state.service = service;
              state.initialized = true;
              state.loading = false;
            });
          } catch (error) {
            set((state) => {
              state.error = error as Error;
              state.loading = false;
            });
            throw error;
          }
        },
        
        // Load configurations
        loadConfigs: async (filter?: ConfigFilter) => {
          const state = get();
          if (!state.service) {
            await state.initialize();
          }
          
          set((state) => {
            state.loading = true;
            state.error = null;
          });
          
          try {
            const configs = await state.service!.list(filter);
            
            set((state) => {
              // Clear existing configs if no filter (full reload)
              if (!filter) {
                state.configs.clear();
              }
              
              // Add loaded configs
              configs.forEach((config: Config) => {
                state.configs.set(config.configId, config);
              });
              
              state.lastFetch = Date.now();
              state.loading = false;
            });
          } catch (error) {
            set((state) => {
              state.error = error as Error;
              state.loading = false;
            });
            throw error;
          }
        },
        
        // Save configuration
        saveConfig: async (config: Config) => {
          const state = get();
          if (!state.service) {
            await state.initialize();
          }
          
          try {
            await state.service!.save(config);
            
            set((state) => {
              state.configs.set(config.configId, config);
            });
          } catch (error) {
            set((state) => {
              state.error = error as Error;
            });
            throw error;
          }
        },
        
        // Update configuration
        updateConfig: async (id: string, updates: Partial<Config>) => {
          const state = get();
          if (!state.service) {
            await state.initialize();
          }
          
          try {
            await state.service!.update(id, updates);
            
            // Fetch updated config
            const updated = await state.service!.get(id);
            if (updated) {
              set((state) => {
                state.configs.set(id, updated);
              });
            }
          } catch (error) {
            set((state) => {
              state.error = error as Error;
            });
            throw error;
          }
        },
        
        // Delete configuration
        deleteConfig: async (id: string) => {
          const state = get();
          if (!state.service) {
            await state.initialize();
          }
          
          try {
            await state.service!.delete(id);
            
            set((state) => {
              state.configs.delete(id);
            });
          } catch (error) {
            set((state) => {
              state.error = error as Error;
            });
            throw error;
          }
        },
        
        // Refresh single configuration
        refreshConfig: async (id: string) => {
          const state = get();
          if (!state.service) {
            await state.initialize();
          }
          
          try {
            const config = await state.service!.get(id);
            if (config) {
              set((state) => {
                state.configs.set(id, config);
              });
            } else {
              set((state) => {
                state.configs.delete(id);
              });
            }
          } catch (error) {
            set((state) => {
              state.error = error as Error;
            });
            throw error;
          }
        },
        
        // Save multiple configurations
        saveMany: async (configs: Config[]) => {
          const state = get();
          if (!state.service) {
            await state.initialize();
          }
          
          try {
            // Save each config individually
            await Promise.all(
              configs.map((config) => state.service!.save(config))
            );
            
            set((state) => {
              configs.forEach((config) => {
                state.configs.set(config.configId, config);
              });
            });
          } catch (error) {
            set((state) => {
              state.error = error as Error;
            });
            throw error;
          }
        },
        
        // Delete multiple configurations
        deleteMany: async (ids: string[]) => {
          const state = get();
          if (!state.service) {
            await state.initialize();
          }
          
          try {
            // Delete each config individually
            await Promise.all(
              ids.map((id) => state.service!.delete(id))
            );
            
            set((state) => {
              ids.forEach((id) => {
                state.configs.delete(id);
              });
            });
          } catch (error) {
            set((state) => {
              state.error = error as Error;
            });
            throw error;
          }
        },
        
        // Get single config
        getConfig: (id: string) => {
          return get().configs.get(id);
        },
        
        // Get configs by type
        getConfigsByType: (type: string) => {
          const configs = Array.from(get().configs.values());
          return configs.filter((config) => config.componentType === type);
        },
        
        // Get configs by parent
        getConfigsByParent: (parentId: string) => {
          const configs = Array.from(get().configs.values());
          return configs.filter((config) => config.parentId === parentId);
        },
        
        // Get configs by owner
        getConfigsByOwner: (ownerId: string) => {
          const configs = Array.from(get().configs.values());
          return configs.filter((config) => config.ownerId === ownerId);
        },
        
        // Clear cache
        clearCache: () => {
          set((state) => {
            state.configs.clear();
            state.lastFetch = null;
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
      name: 'config-store',
    }
  )
);

// Selector hooks
export const useConfig = (id: string) => {
  return useConfigStore((state) => state.configs.get(id));
};

export const useConfigsByType = (type: string): Config[] => {
  return useConfigStore((state) => 
    Array.from(state.configs.values()).filter((config) => config.componentType === type)
  );
};

export const useConfigsByParent = (parentId: string) => {
  return useConfigStore((state) => {
    const configs = Array.from(state.configs.values());
    return configs.filter((config) => config.parentId === parentId);
  });
};

export const useConfigsByOwner = (ownerId: string) => {
  return useConfigStore((state) => {
    const configs = Array.from(state.configs.values());
    return configs.filter((config) => config.ownerId === ownerId);
  });
};

export const useConfigLoading = () => {
  return useConfigStore((state) => state.loading);
};

export const useConfigError = () => {
  return useConfigStore((state) => state.error);
};

// Action hooks
export const useConfigActions = () => {
  const saveConfig = useConfigStore((state) => state.saveConfig);
  const updateConfig = useConfigStore((state) => state.updateConfig);
  const deleteConfig = useConfigStore((state) => state.deleteConfig);
  const refreshConfig = useConfigStore((state) => state.refreshConfig);
  const loadConfigs = useConfigStore((state) => state.loadConfigs);
  
  return {
    saveConfig,
    updateConfig,
    deleteConfig,
    refreshConfig,
    loadConfigs,
  };
};