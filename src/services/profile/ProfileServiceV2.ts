/**
 * Profile Service V2 - Uses IndexedDB for storage
 * 
 * Profiles are named configuration sets that components can save and load.
 * Each component instance can have multiple profiles stored in IndexedDB.
 */

import { EventEmitter } from '../websocket/EventEmitter';
import type { 
  ComponentProfile, 
  ProfileOperations,
  ProfileManagementState 
} from '@/types/agv1/profile.types';
import type { IStorageAdapter, ComponentConfig } from '@/types';

export interface ProfileServiceV2Config {
  storageAdapter: IStorageAdapter;
  maxProfilesPerComponent?: number;
  autoSaveInterval?: number;
}

export class ProfileServiceV2 extends EventEmitter implements ProfileOperations {
  private state: ProfileManagementState;
  private config: ProfileServiceV2Config;
  private storageAdapter: IStorageAdapter;
  private autoSaveTimer?: NodeJS.Timeout;
  
  constructor(config: ProfileServiceV2Config) {
    super();
    
    this.config = {
      maxProfilesPerComponent: 50,
      autoSaveInterval: 5000,
      ...config
    };
    
    this.storageAdapter = config.storageAdapter;
    
    this.state = {
      profiles: new Map(),
      activeProfiles: new Map()
    };
    
    // Don't load from storage in constructor - let initialize() handle it
    // this.loadFromStorage();
    this.startAutoSave();
  }
  
  // Initialize the service and load data from storage
  async initialize(): Promise<void> {
    await this.loadFromStorage();
  }
  
  // Profile CRUD Operations
  async createProfile(
    componentInstanceId: string, 
    profile: Omit<ComponentProfile, 'id' | 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<ComponentProfile> {
    const id = `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const newProfile: ComponentProfile = {
      ...profile,
      id,
      componentInstanceId,
      createdAt: now,
      updatedAt: now,
      version: 1
    };
    
    // Get or create component profiles array
    const componentProfiles = this.state.profiles.get(componentInstanceId) || [];
    
    // Check max profiles limit
    if (componentProfiles.length >= (this.config.maxProfilesPerComponent || 50)) {
      throw new Error(`Maximum profiles limit (${this.config.maxProfilesPerComponent}) reached for component`);
    }
    
    // Add new profile
    componentProfiles.push(newProfile);
    this.state.profiles.set(componentInstanceId, componentProfiles);
    
    // If it's the first profile or marked as default, make it active
    if (componentProfiles.length === 1 || profile.isDefault) {
      this.state.activeProfiles.set(componentInstanceId, id);
      
      // Ensure only one default profile per component
      if (profile.isDefault) {
        componentProfiles.forEach(p => {
          if (p.id !== id) {
            p.isDefault = false;
          }
        });
      }
    }
    
    this.emit('profile:created', { profile: newProfile });
    await this.saveToStorage();
    
    return newProfile;
  }
  
  async updateProfile(profileId: string, updates: Partial<ComponentProfile>): Promise<void> {
    let found = false;
    
    this.state.profiles.forEach((profiles, componentInstanceId) => {
      const index = profiles.findIndex(p => p.id === profileId);
      if (index !== -1) {
        found = true;
        profiles[index] = {
          ...profiles[index],
          ...updates,
          id: profileId, // Ensure ID doesn't change
          componentInstanceId, // Ensure component instance doesn't change
          updatedAt: new Date(),
          version: profiles[index].version + 1
        };
        
        // Handle default profile changes
        if (updates.isDefault) {
          profiles.forEach((p, i) => {
            if (i !== index) {
              p.isDefault = false;
            }
          });
        }
        
        this.emit('profile:updated', { profile: profiles[index] });
      }
    });
    
    if (!found) {
      throw new Error(`Profile ${profileId} not found`);
    }
    
    await this.saveToStorage();
  }
  
  async deleteProfile(profileId: string): Promise<void> {
    let found = false;
    
    this.state.profiles.forEach((profiles, componentInstanceId) => {
      const index = profiles.findIndex(p => p.id === profileId);
      if (index !== -1) {
        found = true;
        const profile = profiles[index];
        
        if (profile.isProtected) {
          throw new Error('Cannot delete protected profile');
        }
        
        profiles.splice(index, 1);
        
        // If this was the active profile, activate another one
        if (this.state.activeProfiles.get(componentInstanceId) === profileId) {
          const defaultProfile = profiles.find(p => p.isDefault);
          if (defaultProfile) {
            this.state.activeProfiles.set(componentInstanceId, defaultProfile.id);
          } else if (profiles.length > 0) {
            this.state.activeProfiles.set(componentInstanceId, profiles[0].id);
          } else {
            this.state.activeProfiles.delete(componentInstanceId);
          }
        }
        
        // If no profiles left, remove the component entry
        if (profiles.length === 0) {
          this.state.profiles.delete(componentInstanceId);
        }
        
        this.emit('profile:deleted', { profileId });
      }
    });
    
    if (!found) {
      throw new Error(`Profile ${profileId} not found`);
    }
    
    await this.saveToStorage();
  }
  
  getProfile(profileId: string): ComponentProfile | undefined {
    for (const profiles of this.state.profiles.values()) {
      const profile = profiles.find(p => p.id === profileId);
      if (profile) {
        return profile;
      }
    }
    return undefined;
  }
  
  getProfilesForComponent(componentInstanceId: string): ComponentProfile[] {
    return this.state.profiles.get(componentInstanceId) || [];
  }
  
  getComponentProfiles(componentInstanceId: string): ComponentProfile[] {
    return this.getProfilesForComponent(componentInstanceId);
  }
  
  // Profile Activation
  activateProfile(componentInstanceId: string, profileId: string): void {
    const profiles = this.state.profiles.get(componentInstanceId);
    if (!profiles) {
      throw new Error(`No profiles found for component ${componentInstanceId}`);
    }
    
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found for component ${componentInstanceId}`);
    }
    
    this.state.activeProfiles.set(componentInstanceId, profileId);
    this.emit('profile:activated', { componentInstanceId, profileId, profile });
    this.saveToStorage();
  }
  
  getActiveProfile(componentInstanceId: string): ComponentProfile | undefined {
    const activeId = this.state.activeProfiles.get(componentInstanceId);
    if (!activeId) return undefined;
    
    const profiles = this.state.profiles.get(componentInstanceId);
    return profiles?.find(p => p.id === activeId);
  }
  
  // Profile Operations
  async duplicateProfile(profileId: string, newName: string): Promise<ComponentProfile> {
    const original = this.getProfile(profileId);
    if (!original) {
      throw new Error(`Profile ${profileId} not found`);
    }
    
    return this.createProfile(original.componentInstanceId, {
      ...original,
      name: newName,
      description: `Copy of ${original.name}`,
      isDefault: false,
      isProtected: false,
      configuration: JSON.parse(JSON.stringify(original.configuration)) // Deep clone
    });
  }
  
  exportProfile(profileId: string): string {
    const profile = this.getProfile(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }
    
    const exportData = {
      profile: {
        ...profile,
        id: undefined, // Remove ID so it gets new one on import
        createdAt: undefined,
        updatedAt: undefined
      },
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  async importProfile(componentInstanceId: string, profileData: string): Promise<ComponentProfile> {
    try {
      const parsed = JSON.parse(profileData);
      const profileToImport = parsed.profile || parsed;
      
      // Ensure it's for the right component type
      const existingProfiles = this.getProfilesForComponent(componentInstanceId);
      if (existingProfiles.length > 0) {
        const componentType = existingProfiles[0].componentType;
        if (profileToImport.componentType !== componentType) {
          throw new Error(`Profile type mismatch. Expected ${componentType}, got ${profileToImport.componentType}`);
        }
      }
      
      return this.createProfile(componentInstanceId, {
        ...profileToImport,
        componentInstanceId,
        name: `${profileToImport.name} (Imported)`,
        isDefault: false,
        isProtected: false
      });
    } catch (error: any) {
      throw new Error(`Failed to import profile: ${error.message}`);
    }
  }
  
  // Bulk Operations
  exportAllProfiles(componentInstanceId: string): string {
    const profiles = this.getProfilesForComponent(componentInstanceId);
    const activeProfileId = this.state.activeProfiles.get(componentInstanceId);
    
    const exportData = {
      componentInstanceId,
      profiles: profiles.map(p => ({
        ...p,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined
      })),
      activeProfileId,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  async importProfiles(componentInstanceId: string, data: string): Promise<ComponentProfile[]> {
    try {
      const parsed = JSON.parse(data);
      const profilesToImport = parsed.profiles || [];
      
      const imported: ComponentProfile[] = [];
      
      for (const profileData of profilesToImport) {
        const profile = await this.createProfile(componentInstanceId, {
          ...profileData,
          componentInstanceId,
          name: `${profileData.name} (Imported)`,
          isDefault: false,
          isProtected: false
        });
        imported.push(profile);
      }
      
      return imported;
    } catch (error: any) {
      throw new Error(`Failed to import profiles: ${error.message}`);
    }
  }
  
  // Storage Operations using IndexedDB
  private async loadFromStorage(): Promise<void> {
    try {
      // Search for profile configs in IndexedDB
      const configs = await this.storageAdapter.searchComponentConfigs({
        componentType: 'profile-service',
        appId: 'agv1'
      });
      
      if (configs.length > 0) {
        const data = configs[0].configuration;
        
        // Restore profiles map
        this.state.profiles = new Map(
          data.profiles?.map(([key, value]: [string, ComponentProfile[]]) => [
            key,
            value.map((p: any) => ({
              ...p,
              createdAt: new Date(p.createdAt),
              updatedAt: new Date(p.updatedAt)
            }))
          ]) || []
        );
        
        // Restore active profiles map
        this.state.activeProfiles = new Map(data.activeProfiles || []);
      }
    } catch (error) {
      console.error('Failed to load profiles from IndexedDB:', error);
    }
  }
  
  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        profiles: Array.from(this.state.profiles.entries()),
        activeProfiles: Array.from(this.state.activeProfiles.entries())
      };
      
      // Save to IndexedDB
      await this.storageAdapter.saveComponentConfig({
        instanceId: 'profile-service',
        componentType: 'profile-service',
        displayName: 'Profile Service Data',
        userId: 'default',
        ownerId: 'default',
        appId: 'agv1',
        settings: {
          versions: {},
          activeVersionId: '1.0.0'
        },
        configuration: data,
        metadata: {
          profileCount: Array.from(this.state.profiles.values()).reduce((sum, profiles) => sum + profiles.length, 0),
          lastSaved: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
          accessCount: 0,
          tags: ['profiles', 'settings'],
          category: 'system',
          notes: '',
          favorited: false
        },
        permissions: {
          isPublic: false,
          canEdit: [],
          canView: [],
          allowSharing: false,
          editableByOthers: false
        },
        sharing: {
          isShared: false,
          sharedWith: [],
          publicAccess: {
            enabled: false,
            accessLevel: 'view',
            requiresAuth: false
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false
      } as ComponentConfig);
    } catch (error) {
      console.error('Failed to save profiles to IndexedDB:', error);
    }
  }
  
  private startAutoSave(): void {
    if (this.config.autoSaveInterval && this.config.autoSaveInterval > 0) {
      this.autoSaveTimer = setInterval(() => {
        this.saveToStorage();
      }, this.config.autoSaveInterval);
    }
  }
  
  // Cleanup
  dispose(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    this.saveToStorage();
  }
}