import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ComponentConfig, ComponentType, Profile, WorkspaceData, ProfileConfig } from './types';

interface AppState {
  // Components
  components: Map<string, ComponentConfig>;
  addComponent: (type: ComponentType) => string;
  removeComponent: (id: string) => void;
  updateComponent: (id: string, updates: Partial<ComponentConfig>) => void;
  
  // Profiles - simple and direct
  profiles: Map<string, Profile[]>;
  activeProfiles: Map<string, string>;
  createProfile: (componentId: string, name: string) => void;
  switchProfile: (componentId: string, profileId: string) => void;
  deleteProfile: (componentId: string, profileId: string) => void;
  updateProfile: (componentId: string, profileId: string, config: ProfileConfig) => void;
  
  // Layout
  layout: unknown | null;
  isClearing: boolean;
  saveLayout: (state: unknown) => void;
  
  // Workspace operations
  saveWorkspace: () => WorkspaceData;
  loadWorkspace: (data: WorkspaceData) => void;
  clearWorkspace: () => void;
}

// Simple ID generator
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      components: new Map(),
      profiles: new Map(),
      activeProfiles: new Map(),
      layout: null,
      isClearing: false,
      
      // Component management
      addComponent: (type) => {
        const id = generateId();
        const component: ComponentConfig = {
          id,
          type,
          title: `${type} ${id.slice(0, 8)}`,
          config: {}
        };
        
        set(state => ({
          components: new Map(state.components).set(id, component)
        }));
        
        // Create default profile
        get().createProfile(id, 'Default');
        
        return id;
      },
      
      removeComponent: (id) => {
        set(state => {
          const components = new Map(state.components);
          const profiles = new Map(state.profiles);
          const activeProfiles = new Map(state.activeProfiles);
          
          components.delete(id);
          profiles.delete(id);
          activeProfiles.delete(id);
          
          return { components, profiles, activeProfiles };
        });
      },
      
      updateComponent: (id, updates) => {
        set(state => {
          const components = new Map(state.components);
          const existing = components.get(id);
          if (existing) {
            components.set(id, { ...existing, ...updates });
          }
          return { components };
        });
      },
      
      // Profile management - simple and direct
      createProfile: (componentId, name) => {
        const profile: Profile = {
          id: generateId(),
          name,
          config: {},
          createdAt: Date.now()
        };
        
        set(state => {
          const profiles = new Map(state.profiles);
          const componentProfiles = profiles.get(componentId) || [];
          const updatedProfiles = [...componentProfiles, profile];
          profiles.set(componentId, updatedProfiles);
          
          // Auto-activate if first profile
          const activeProfiles = new Map(state.activeProfiles);
          if (!activeProfiles.has(componentId) || componentProfiles.length === 0) {
            activeProfiles.set(componentId, profile.id);
          }
          
          return { profiles, activeProfiles };
        });
      },
      
      switchProfile: (componentId, profileId) => {
        set(state => ({
          activeProfiles: new Map(state.activeProfiles).set(componentId, profileId)
        }));
      },
      
      deleteProfile: (componentId, profileId) => {
        set(state => {
          const profiles = new Map(state.profiles);
          const componentProfiles = profiles.get(componentId) || [];
          const filtered = componentProfiles.filter(p => p.id !== profileId);
          
          if (filtered.length === 0) {
            // Don't allow deleting last profile
            return {};
          }
          
          profiles.set(componentId, filtered);
          
          // Switch to first profile if active was deleted
          const activeProfiles = new Map(state.activeProfiles);
          if (activeProfiles.get(componentId) === profileId && filtered.length > 0) {
            activeProfiles.set(componentId, filtered[0].id);
          }
          
          return { profiles, activeProfiles };
        });
      },
      
      updateProfile: (componentId, profileId, config) => {
        set(state => {
          const profiles = new Map(state.profiles);
          const componentProfiles = profiles.get(componentId) || [];
          const updated = componentProfiles.map(p => 
            p.id === profileId ? { ...p, config } : p
          );
          profiles.set(componentId, updated);
          return { profiles };
        });
      },
      
      // Layout
      saveLayout: (layout) => {
        const state = get();
        if (!state.isClearing) {
          set({ layout });
        }
      },
      
      // Workspace operations
      saveWorkspace: () => {
        const state = get();
        return {
          version: '1.0',
          components: Array.from(state.components.entries()),
          profiles: Array.from(state.profiles.entries()),
          activeProfiles: Array.from(state.activeProfiles.entries()),
          layout: state.layout
        };
      },
      
      loadWorkspace: (data) => {
        set({
          components: new Map(data.components),
          profiles: new Map(data.profiles),
          activeProfiles: new Map(data.activeProfiles),
          layout: data.layout
        });
      },
      
      clearWorkspace: () => {
        set({ isClearing: true });
        set({
          components: new Map(),
          profiles: new Map(),
          activeProfiles: new Map(),
          layout: null,
          isClearing: false
        });
      }
    }),
    {
      name: 'app-store'
    }
  )
);