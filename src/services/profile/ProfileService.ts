/**
 * Profile Service - Manages Component Configuration Profiles
 * 
 * Profiles are named configuration sets that components can save and load.
 * Each component instance can have multiple profiles.
 */

import { EventEmitter } from '../websocket/EventEmitter';
import type { 
  ComponentProfile, 
  ProfileOperations,
  ProfileManagementState 
} from '@/types/agv1/profile.types';

export interface ProfileServiceConfig {
  storageAdapter?: 'local' | 'remote';
  storageKey?: string;
  maxProfilesPerComponent?: number;
  autoSaveInterval?: number;
}

export class ProfileService extends EventEmitter implements ProfileOperations {
  private state: ProfileManagementState;
  private config: ProfileServiceConfig;
  private autoSaveTimer?: NodeJS.Timeout;
  
  constructor(config: ProfileServiceConfig = {}) {
    super();
    
    this.config = {
      storageAdapter: 'local',
      storageKey: 'agv1:profiles',
      maxProfilesPerComponent: 50,
      autoSaveInterval: 5000,
      ...config
    };
    
    this.state = {
      profiles: new Map(),
      activeProfiles: new Map()
    };
    
    this.loadFromStorage();
    this.startAutoSave();
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
    this.saveToStorage();
    
    return newProfile;
  }
  
  async updateProfile(profileId: string, updates: Partial<ComponentProfile>): Promise<void> {
    let found = false;
    
    this.state.profiles.forEach((profiles, componentInstanceId) => {
      const index = profiles.findIndex(p => p.id === profileId);
      if (index !== -1) {
        const profile = profiles[index];
        
        // Protected profiles can only update certain fields
        if (profile.isProtected) {
          const allowedUpdates = ['name', 'description', 'configuration'];
          Object.keys(updates).forEach(key => {
            if (!allowedUpdates.includes(key)) {
              delete (updates as any)[key];
            }
          });
        }
        
        // Update profile
        profiles[index] = {
          ...profile,
          ...updates,
          id: profile.id, // Prevent ID change
          componentInstanceId: profile.componentInstanceId, // Prevent component change
          createdAt: profile.createdAt, // Preserve creation date
          updatedAt: new Date(),
          version: profile.version + 1
        };
        
        found = true;
        this.emit('profile:updated', { profile: profiles[index] });
      }
    });
    
    if (found) {
      this.saveToStorage();
    } else {
      throw new Error(`Profile ${profileId} not found`);
    }
  }
  
  async deleteProfile(profileId: string): Promise<void> {
    let found = false;
    
    this.state.profiles.forEach((profiles, componentInstanceId) => {
      const index = profiles.findIndex(p => p.id === profileId);
      if (index !== -1) {
        const profile = profiles[index];
        
        // Cannot delete protected profiles
        if (profile.isProtected) {
          throw new Error('Cannot delete protected profile');
        }
        
        // Remove profile
        profiles.splice(index, 1);
        
        // If this was the active profile, activate another one
        if (this.state.activeProfiles.get(componentInstanceId) === profileId) {
          const defaultProfile = profiles.find(p => p.isDefault);
          const newActive = defaultProfile || profiles[0];
          if (newActive) {
            this.state.activeProfiles.set(componentInstanceId, newActive.id);
          } else {
            this.state.activeProfiles.delete(componentInstanceId);
          }
        }
        
        found = true;
        this.emit('profile:deleted', { profileId, componentInstanceId });
      }
    });
    
    if (found) {
      this.saveToStorage();
    } else {
      throw new Error(`Profile ${profileId} not found`);
    }
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
    
    return await this.createProfile(original.componentInstanceId, {
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
      
      return await this.createProfile(componentInstanceId, {
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
        try {
          const profile = await this.createProfile(componentInstanceId, {
            ...profileData,
            componentInstanceId,
            name: `${profileData.name} (Imported)`,
            isDefault: false,
            isProtected: false
          });
          imported.push(profile);
        } catch (error) {
          console.error(`Failed to import profile ${profileData.name}:`, error);
        }
      }
      
      return imported;
    } catch (error: any) {
      throw new Error(`Failed to import profiles: ${error.message}`);
    }
  }
  
  // Storage Operations
  private loadFromStorage(): void {
    try {
      if (this.config.storageAdapter === 'local') {
        const stored = localStorage.getItem(this.config.storageKey!);
        if (stored) {
          const data = JSON.parse(stored);
          
          // Restore profiles map
          this.state.profiles = new Map(
            data.profiles.map(([key, value]: [string, ComponentProfile[]]) => [
              key,
              value.map((p: any) => ({
                ...p,
                createdAt: new Date(p.createdAt),
                updatedAt: new Date(p.updatedAt)
              }))
            ])
          );
          
          // Restore active profiles map
          this.state.activeProfiles = new Map(data.activeProfiles);
        }
      }
      // TODO: Implement remote storage adapter
    } catch (error) {
      console.error('Failed to load profiles from storage:', error);
    }
  }
  
  private saveToStorage(): void {
    try {
      if (this.config.storageAdapter === 'local') {
        const data = {
          profiles: Array.from(this.state.profiles.entries()),
          activeProfiles: Array.from(this.state.activeProfiles.entries())
        };
        
        localStorage.setItem(this.config.storageKey!, JSON.stringify(data));
      }
      // TODO: Implement remote storage adapter
    } catch (error) {
      console.error('Failed to save profiles to storage:', error);
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
    this.removeAllListeners();
  }
}