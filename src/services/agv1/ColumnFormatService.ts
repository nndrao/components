import type { ColumnFormat } from '@/types/agv1/common.types';
import type { IStorageAdapter } from '@/types/agv1/storage.interfaces';
import type { INotificationService } from '@/types/agv1/service.interfaces';

export interface ColumnFormatConfig {
  [columnId: string]: ColumnFormat;
}

export interface FormatProfile {
  id: string;
  name: string;
  description?: string;
  formats: ColumnFormatConfig;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEY = 'agv1-column-formats';
const PROFILES_KEY = 'agv1-format-profiles';
const DEFAULT_PROFILE_KEY = 'agv1-default-format-profile';

export class ColumnFormatService {
  private storageService: IStorageAdapter;
  private notificationService: INotificationService;
  private userId: string;
  private appId: string;
  private currentFormats: ColumnFormatConfig = {};
  private profiles: FormatProfile[] = [];
  private currentProfileId?: string;

  constructor(context: {
    storageService: IStorageAdapter;
    notificationService: INotificationService;
    userId: string;
    appId: string;
  }) {
    this.storageService = context.storageService;
    this.notificationService = context.notificationService;
    this.userId = context.userId;
    this.appId = context.appId;
    
    // Defer loading to avoid initialization errors
    setTimeout(() => {
      this.loadFormats();
      this.loadProfiles();
    }, 0);
  }

  /**
   * Get format for a specific column
   */
  getColumnFormat(columnId: string): ColumnFormat | undefined {
    return this.currentFormats[columnId];
  }

  /**
   * Set format for a specific column
   */
  setColumnFormat(columnId: string, format: ColumnFormat): void {
    this.currentFormats[columnId] = format;
    this.saveFormats();
    this.updateCurrentProfile();
  }

  /**
   * Remove format for a specific column
   */
  removeColumnFormat(columnId: string): void {
    delete this.currentFormats[columnId];
    this.saveFormats();
    this.updateCurrentProfile();
  }

  /**
   * Get all column formats
   */
  getAllFormats(): ColumnFormatConfig {
    return { ...this.currentFormats };
  }

  /**
   * Set all column formats at once
   */
  setAllFormats(formats: ColumnFormatConfig): void {
    this.currentFormats = { ...formats };
    this.saveFormats();
    this.updateCurrentProfile();
  }

  /**
   * Clear all formats
   */
  clearAllFormats(): void {
    this.currentFormats = {};
    this.saveFormats();
    this.updateCurrentProfile();
  }

  /**
   * Create a new format profile
   */
  createProfile(name: string, description?: string): FormatProfile {
    const profile: FormatProfile = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      description,
      formats: { ...this.currentFormats },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.profiles.push(profile);
    this.saveProfiles();
    return profile;
  }

  /**
   * Get all format profiles
   */
  getProfiles(): FormatProfile[] {
    return [...this.profiles];
  }

  /**
   * Get a specific profile by ID
   */
  getProfile(profileId: string): FormatProfile | undefined {
    return this.profiles.find(p => p.id === profileId);
  }

  /**
   * Update an existing profile
   */
  updateProfile(profileId: string, updates: Partial<FormatProfile>): void {
    const index = this.profiles.findIndex(p => p.id === profileId);
    if (index >= 0) {
      this.profiles[index] = {
        ...this.profiles[index],
        ...updates,
        updatedAt: new Date(),
      };
      this.saveProfiles();
    }
  }

  /**
   * Delete a profile
   */
  deleteProfile(profileId: string): void {
    this.profiles = this.profiles.filter(p => p.id !== profileId);
    this.saveProfiles();
    
    if (this.currentProfileId === profileId) {
      this.currentProfileId = undefined;
    }
  }

  /**
   * Apply a profile (load its formats)
   */
  applyProfile(profileId: string): void {
    const profile = this.getProfile(profileId);
    if (profile) {
      this.currentFormats = { ...profile.formats };
      this.currentProfileId = profileId;
      this.saveFormats();
    }
  }

  /**
   * Set default profile
   */
  setDefaultProfile(profileId: string): void {
    // Remove default flag from all profiles
    this.profiles.forEach(p => p.isDefault = false);
    
    // Set new default
    const profile = this.getProfile(profileId);
    if (profile) {
      profile.isDefault = true;
      this.saveProfiles();
      localStorage.setItem(DEFAULT_PROFILE_KEY, profileId);
    }
  }

  /**
   * Get default profile
   */
  getDefaultProfile(): FormatProfile | undefined {
    const defaultId = localStorage.getItem(DEFAULT_PROFILE_KEY);
    if (defaultId) {
      return this.getProfile(defaultId);
    }
    return this.profiles.find(p => p.isDefault);
  }

  /**
   * Export formats to JSON
   */
  exportFormats(): string {
    return JSON.stringify({
      formats: this.currentFormats,
      profiles: this.profiles,
      defaultProfileId: localStorage.getItem(DEFAULT_PROFILE_KEY),
    }, null, 2);
  }

  /**
   * Import formats from JSON
   */
  importFormats(jsonString: string): void {
    try {
      const data = JSON.parse(jsonString);
      
      if (data.formats) {
        this.currentFormats = data.formats;
        this.saveFormats();
      }
      
      if (data.profiles) {
        this.profiles = data.profiles.map((p: FormatProfile) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        }));
        this.saveProfiles();
      }
      
      if (data.defaultProfileId) {
        localStorage.setItem(DEFAULT_PROFILE_KEY, data.defaultProfileId);
      }
    } catch (error: unknown) {
      throw new Error('Invalid format data: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * Export a single profile
   */
  exportProfile(profileId: string): string {
    const profile = this.getProfile(profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }
    return JSON.stringify(profile, null, 2);
  }

  /**
   * Import a single profile
   */
  importProfile(jsonString: string): FormatProfile {
    try {
      const profileData = JSON.parse(jsonString);
      const profile: FormatProfile = {
        ...profileData,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Generate new ID
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false,
      };
      
      this.profiles.push(profile);
      this.saveProfiles();
      return profile;
    } catch (error: unknown) {
      throw new Error('Invalid profile data: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * Private helper methods
   */
  private loadFormats(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.currentFormats = JSON.parse(stored);
      }
    } catch (error: unknown) {
      console.error('Failed to load column formats:', error);
      this.currentFormats = {};
    }
  }

  private saveFormats(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentFormats));
    } catch (error: unknown) {
      console.error('Failed to save column formats:', error);
    }
  }

  private loadProfiles(): void {
    try {
      const stored = localStorage.getItem(PROFILES_KEY);
      if (stored) {
        this.profiles = JSON.parse(stored).map((p: FormatProfile) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        }));
      }
    } catch (error: unknown) {
      console.error('Failed to load format profiles:', error);
      this.profiles = [];
    }
  }

  private saveProfiles(): void {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(this.profiles));
    } catch (error: unknown) {
      console.error('Failed to save format profiles:', error);
    }
  }

  private updateCurrentProfile(): void {
    if (this.currentProfileId) {
      const profile = this.getProfile(this.currentProfileId);
      if (profile) {
        profile.formats = { ...this.currentFormats };
        profile.updatedAt = new Date();
        this.saveProfiles();
      }
    }
  }
}