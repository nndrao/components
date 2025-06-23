/**
 * Profile Service Adapter
 * 
 * Adapts the component-focused ProfileService to match the IProfileService interface
 * expected by the ServicesProvider.
 */

import { ProfileServiceV2 } from './ProfileServiceV2';
import { StorageService } from '../storage/StorageService';
import type { IStorageAdapter } from '@/types';
import type { 
  IProfileService, 
  UserProfile,
  ProfileEvent
} from '@/types/agv1/service.interfaces';
import type { ProfileConfig } from '@/types/agv1/storage.interfaces';

export class ProfileServiceAdapter implements IProfileService {
  private profileService: ProfileServiceV2;
  private userId: string = '';
  private appId: string = '';
  private storageAdapter: IStorageAdapter | null = null;
  
  constructor(config?: any) {
    // Initialize storage service
    const storageService = new StorageService({
      mode: 'local' // Uses IndexedDB
    });
    
    // We'll initialize the actual ProfileService in the initialize method
    this.profileService = null as any;
  }
  
  async initialize(userId: string, appId: string): Promise<void> {
    this.userId = userId;
    this.appId = appId;
    
    // Initialize storage service
    const storageService = new StorageService({
      mode: 'local' // Uses IndexedDB
    });
    await storageService.initialize();
    this.storageAdapter = storageService.getAdapter();
    
    // Now initialize ProfileServiceV2 with the storage adapter
    this.profileService = new ProfileServiceV2({
      storageAdapter: this.storageAdapter
    });
    
    // Initialize the profile service to load data
    await this.profileService.initialize();
  }
  
  // Profile Management - Convert between ProfileConfig and ComponentProfile
  async createProfile(profile: Omit<ProfileConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProfileConfig> {
    // Create a component profile for the app container
    const componentProfile = await this.profileService.createProfile('app-container', {
      name: profile.name,
      description: profile.description,
      componentType: 'app-container',
      componentInstanceId: 'app-container',
      isDefault: profile.metadata?.isDefault || false,
      isProtected: profile.metadata?.isProtected || false,
      configuration: profile.globalSettings || {}
    });
    
    return this.componentProfileToProfileConfig(componentProfile);
  }
  
  async getProfile(profileId: string): Promise<ProfileConfig | null> {
    const profile = this.profileService.getProfile(profileId);
    return profile ? this.componentProfileToProfileConfig(profile) : null;
  }
  
  async getUserProfiles(): Promise<ProfileConfig[]> {
    const profiles = this.profileService.getComponentProfiles('app-container');
    return profiles.map(p => this.componentProfileToProfileConfig(p));
  }
  
  async updateProfile(profileId: string, updates: Partial<ProfileConfig>): Promise<void> {
    await this.profileService.updateProfile(profileId, {
      name: updates.name,
      description: updates.description,
      isDefault: updates.metadata?.isDefault,
      isProtected: updates.metadata?.isProtected,
      configuration: updates.globalSettings
    });
  }
  
  async deleteProfile(profileId: string): Promise<void> {
    await this.profileService.deleteProfile(profileId);
  }
  
  async setDefaultProfile(profileId: string): Promise<void> {
    await this.profileService.updateProfile(profileId, { isDefault: true });
  }
  
  async getDefaultProfile(): Promise<ProfileConfig | null> {
    const profiles = this.profileService.getComponentProfiles('app-container');
    const defaultProfile = profiles.find(p => p.isDefault);
    return defaultProfile ? this.componentProfileToProfileConfig(defaultProfile) : null;
  }
  
  // Profile Operations
  async loadProfile(profileId: string): Promise<void> {
    this.profileService.activateProfile('app-container', profileId);
  }
  
  async saveCurrentAsProfile(name: string, description?: string): Promise<ProfileConfig> {
    const profile = this.profileService.createProfile('app-container', {
      name,
      description,
      componentType: 'app-container',
      componentInstanceId: 'app-container',
      configuration: {} // Would be filled by the app container
    });
    
    return this.componentProfileToProfileConfig(profile);
  }
  
  async exportProfile(profileId: string): Promise<string> {
    return this.profileService.exportProfile(profileId);
  }
  
  async importProfile(profileData: string): Promise<ProfileConfig> {
    const profile = await this.profileService.importProfile('app-container', profileData);
    return this.componentProfileToProfileConfig(profile);
  }
  
  async cloneProfile(profileId: string, newName: string): Promise<ProfileConfig> {
    const profile = await this.profileService.duplicateProfile(profileId, newName);
    return this.componentProfileToProfileConfig(profile);
  }
  
  // Events
  onProfileChange(callback: (profile: ProfileConfig) => void): () => void {
    const handler = (event: any) => {
      if (event.profile) {
        callback(this.componentProfileToProfileConfig(event.profile));
      }
    };
    this.profileService.on('profile:activated', handler);
    return () => this.profileService.off('profile:activated', handler);
  }
  
  getCurrentProfile(): ProfileConfig | null {
    const activeProfile = this.profileService.getActiveProfile('app-container');
    if (!activeProfile) return null;
    const activeId = activeProfile.id;
    if (!activeId) return null;
    
    const profile = this.profileService.getProfile(activeId);
    return profile ? this.componentProfileToProfileConfig(profile) : null;
  }
  
  // Additional methods
  async getAllProfiles(): Promise<UserProfile[]> {
    const profiles = this.profileService.getComponentProfiles('app-container');
    return profiles.map(p => this.componentProfileToUserProfile(p));
  }
  
  async switchProfile(profileId: string): Promise<boolean> {
    try {
      this.profileService.activateProfile('app-container', profileId);
      return true;
    } catch {
      return false;
    }
  }
  
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    const profile = this.getCurrentProfile();
    return profile ? this.profileConfigToUserProfile(profile) : null;
  }
  
  subscribe(callback: (event: ProfileEvent) => void): () => void {
    const handlers = new Map<string, (data: any) => void>();
    
    const created = (data: any) => callback({ 
      type: 'created', 
      profileId: data.profile.id, 
      profile: this.componentProfileToUserProfile(data.profile),
      timestamp: new Date().toISOString()
    });
    
    const updated = (data: any) => callback({ 
      type: 'updated', 
      profileId: data.profile.id, 
      profile: this.componentProfileToUserProfile(data.profile),
      timestamp: new Date().toISOString()
    });
    
    const deleted = (data: any) => callback({ 
      type: 'deleted', 
      profileId: data.profileId,
      timestamp: new Date().toISOString()
    });
    
    const switched = (data: any) => callback({ 
      type: 'switched', 
      profileId: data.profile.id,
      profile: this.componentProfileToUserProfile(data.profile),
      timestamp: new Date().toISOString()
    });
    
    handlers.set('profile:created', created);
    handlers.set('profile:updated', updated);
    handlers.set('profile:deleted', deleted);
    handlers.set('profile:activated', switched);
    
    handlers.forEach((handler, event) => {
      this.profileService.on(event, handler);
    });
    
    return () => {
      handlers.forEach((handler, event) => {
        this.profileService.off(event, handler);
      });
    };
  }
  
  // Helper methods to convert between types
  private componentProfileToProfileConfig(profile: any): ProfileConfig {
    const createdAt = profile.createdAt instanceof Date ? profile.createdAt.toISOString() : profile.createdAt;
    const updatedAt = profile.updatedAt instanceof Date ? profile.updatedAt.toISOString() : profile.updatedAt;
    
    return {
      id: profile.id,
      name: profile.name,
      description: profile.description,
      userId: this.userId,
      appId: this.appId,
      components: [], // Component profiles don't map directly to ProfileConfig
      layout: profile.configuration?.layout || {},
      globalSettings: profile.configuration?.globalSettings || {},
      metadata: {
        isDefault: profile.isDefault || false,
        isProtected: profile.isProtected || false,
        tags: profile.metadata?.tags || [],
        category: profile.metadata?.category || 'general',
        icon: profile.metadata?.icon
      },
      createdAt,
      updatedAt,
      lastAccessedAt: updatedAt
    };
  }
  
  private componentProfileToUserProfile(profile: any): UserProfile {
    return {
      id: profile.id,
      userId: this.userId,
      displayName: profile.name,
      description: profile.description,
      isDefault: profile.isDefault || false,
      settings: profile.configuration || {},
      metadata: {
        created: profile.createdAt.toISOString(),
        lastModified: profile.updatedAt.toISOString(),
        lastActivity: profile.updatedAt.toISOString()
      }
    };
  }
  
  private profileConfigToUserProfile(config: ProfileConfig): UserProfile {
    return {
      id: config.id,
      userId: config.userId,
      displayName: config.name,
      description: config.description,
      isDefault: config.metadata?.isDefault || false,
      settings: config.globalSettings || {},
      metadata: {
        created: config.createdAt,
        lastModified: config.updatedAt,
        lastActivity: config.lastAccessedAt
      }
    };
  }
}