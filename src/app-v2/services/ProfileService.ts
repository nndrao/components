import { Profile } from '../types';
import { GridState } from './GridService';
import { createLogger } from '../utils/logger';

const logger = createLogger('ProfileService');

export interface ProfileConfig extends GridState {
  // Additional profile-specific config can be added here
}

export class ProfileService {
  /**
   * Create a new profile with default configuration
   */
  static createProfile(name: string, config?: ProfileConfig): Profile {
    const profile: Profile = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      config: config || {}
    };
    
    logger.debug(`Created profile: ${profile.name}`);
    return profile;
  }
  
  /**
   * Update an existing profile
   */
  static updateProfile(profile: Profile, config: ProfileConfig): Profile {
    const updated: Profile = {
      ...profile,
      config,
      updatedAt: Date.now()
    };
    
    logger.debug(`Updated profile: ${profile.name}`);
    return updated;
  }
  
  /**
   * Get default profile name based on existing profiles
   */
  static getDefaultProfileName(existingProfiles: Profile[]): string {
    const baseNumber = existingProfiles.length + 1;
    let name = `Profile ${baseNumber}`;
    let counter = baseNumber;
    
    // Ensure unique name
    while (existingProfiles.some(p => p.name === name)) {
      counter++;
      name = `Profile ${counter}`;
    }
    
    return name;
  }
  
  /**
   * Validate profile name
   */
  static validateProfileName(name: string, existingProfiles: Profile[], currentId?: string): string | null {
    if (!name || name.trim().length === 0) {
      return 'Profile name is required';
    }
    
    if (name.trim().length > 50) {
      return 'Profile name must be less than 50 characters';
    }
    
    // Check for duplicates (excluding current profile if updating)
    const isDuplicate = existingProfiles.some(p => 
      p.name === name.trim() && p.id !== currentId
    );
    
    if (isDuplicate) {
      return 'A profile with this name already exists';
    }
    
    return null;
  }
  
  /**
   * Export profile to JSON
   */
  static exportProfile(profile: Profile): string {
    return JSON.stringify(profile, null, 2);
  }
  
  /**
   * Import profile from JSON
   */
  static importProfile(json: string): Profile {
    try {
      const data = JSON.parse(json);
      
      // Validate required fields
      if (!data.name || typeof data.name !== 'string') {
        throw new Error('Invalid profile: missing name');
      }
      
      // Create new profile with imported data
      return {
        id: crypto.randomUUID(), // Generate new ID
        name: data.name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        config: data.config || {}
      };
    } catch (error) {
      logger.error('Failed to import profile', error);
      throw new Error('Invalid profile format');
    }
  }
}