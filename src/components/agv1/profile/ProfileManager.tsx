/**
 * Profile Manager Component
 * 
 * Main component for managing user profiles. Displays current profile,
 * allows switching between profiles, and provides access to profile
 * configuration dialogs.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useService } from '../providers';
import { 
  UserProfile, 
  ProfileEvent
} from '@/types';
import { ChevronDown, Settings, Plus, Check } from 'lucide-react';

/**
 * Profile manager props
 */
export interface ProfileManagerProps {
  /** Show extended view with more details */
  extended?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback when profile changes */
  onProfileChange?: (profile: UserProfile) => void;
  /** Callback to open profile configuration */
  onConfigureProfile?: (profile: UserProfile) => void;
  /** Callback to create new profile */
  onCreateProfile?: () => void;
}


/**
 * Profile Manager Component
 */
export const ProfileManager: React.FC<ProfileManagerProps> = ({
  extended = false,
  className = '',
  onProfileChange,
  onConfigureProfile,
  onCreateProfile
}) => {
  const profileService = useService('profile');
  const notificationService = useService('notification');
  
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load profiles and current profile
   */
  const loadProfiles = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get all profiles
      const allProfiles = await profileService.getAllProfiles!();
      setProfiles(allProfiles);
      
      // Get current profile
      const current = await profileService.getCurrentUserProfile!();
      setCurrentProfile(current);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load profiles:', error);
      notificationService.error('Failed to load profiles');
      setIsLoading(false);
    }
  }, [profileService, notificationService]);

  /**
   * Switch to a different profile
   */
  const switchProfile = useCallback(async (profileId: string) => {
    try {
      const success = await profileService.switchProfile!(profileId);
      
      if (success) {
        const newProfile = await profileService.getCurrentUserProfile!();
        setCurrentProfile(newProfile);
        setIsDropdownOpen(false);
        
        notificationService.success(`Switched to profile: ${newProfile?.displayName || 'Unknown'}`);
        
        // Callback
        if (newProfile && onProfileChange) {
          onProfileChange(newProfile);
        }
      } else {
        notificationService.error('Failed to switch profile');
      }
    } catch (error) {
      console.error('Failed to switch profile:', error);
      notificationService.error('Failed to switch profile');
    }
  }, [profileService, notificationService, onProfileChange]);

  /**
   * Handle profile configuration
   */
  const handleConfigureProfile = useCallback((profile: UserProfile) => {
    if (onConfigureProfile) {
      onConfigureProfile(profile);
    } else {
      notificationService.info('Profile configuration not implemented');
    }
  }, [onConfigureProfile, notificationService]);

  /**
   * Handle create new profile
   */
  const handleCreateProfile = useCallback(() => {
    if (onCreateProfile) {
      onCreateProfile();
    } else {
      notificationService.info('Profile creation not implemented');
    }
  }, [onCreateProfile, notificationService]);

  /**
   * Subscribe to profile events
   */
  useEffect(() => {
    // Load initial data
    loadProfiles();
    
    // Subscribe to profile events
    const unsubscribe = profileService.subscribe!((event: ProfileEvent) => {
      console.log('Profile event:', event);
      
      switch (event.type) {
        case 'created':
        case 'updated':
        case 'deleted':
          // Reload profiles
          loadProfiles();
          break;
        case 'switched':
          // Update current profile
          if (event.profile) {
            setCurrentProfile(event.profile);
            if (onProfileChange) {
              onProfileChange(event.profile);
            }
          }
          break;
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [profileService, loadProfiles, onProfileChange]);

  /**
   * Get profile initials
   */
  const getProfileInitials = (profile: UserProfile): string => {
    if (profile.displayName) {
      return profile.displayName
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return profile.id.slice(0, 2).toUpperCase();
  };

  /**
   * Get profile color
   */
  const getProfileColor = (profile: UserProfile): string => {
    // Generate color from profile ID
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-cyan-500'
    ];
    
    const index = profile.id.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-pulse">
          <div className="w-8 h-8 bg-muted rounded-full" />
        </div>
        {extended && (
          <div className="animate-pulse">
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
        )}
      </div>
    );
  }

  // No current profile
  if (!currentProfile) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={handleCreateProfile}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          <span>Create Profile</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Profile Button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-card hover:bg-accent rounded-lg transition-colors"
      >
        {/* Profile Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${getProfileColor(currentProfile)}`}>
          {getProfileInitials(currentProfile)}
        </div>
        
        {/* Profile Info */}
        {extended && (
          <div className="text-left">
            <div className="text-sm font-medium">{currentProfile.displayName}</div>
            {currentProfile.email && (
              <div className="text-xs text-muted-foreground">{currentProfile.email}</div>
            )}
          </div>
        )}
        
        {/* Dropdown Icon */}
        <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-2 w-64 bg-card border rounded-lg shadow-lg z-50">
            {/* Current Profile Section */}
            <div className="p-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${getProfileColor(currentProfile)}`}>
                    {getProfileInitials(currentProfile)}
                  </div>
                  <div>
                    <div className="font-medium">{currentProfile.displayName}</div>
                    {currentProfile.email && (
                      <div className="text-xs text-muted-foreground">{currentProfile.email}</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleConfigureProfile(currentProfile)}
                  className="p-1 hover:bg-accent rounded"
                  title="Configure profile"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Profile List */}
            <div className="max-h-64 overflow-y-auto">
              {profiles.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => switchProfile(profile.id)}
                  className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-accent transition-colors ${
                    profile.id === currentProfile.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${getProfileColor(profile)}`}>
                    {getProfileInitials(profile)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{profile.displayName}</div>
                    {profile.isDefault && (
                      <div className="text-xs text-muted-foreground">Default</div>
                    )}
                  </div>
                  {profile.id === currentProfile.id && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="p-2 border-t">
              <button
                onClick={handleCreateProfile}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-accent rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Create New Profile</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Profile stats component
 */
export const ProfileStats: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  const configurationService = useService('configuration');
  const [stats, setStats] = useState({
    configurations: 0,
    lastActivity: profile.lastActivity
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const configs = await configurationService.listConfigurations!();
        setStats({
          configurations: configs.length,
          lastActivity: profile.lastActivity
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };
    
    loadStats();
  }, [profile, configurationService]);

  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <div className="text-muted-foreground">Configurations</div>
        <div className="font-medium">{stats.configurations}</div>
      </div>
      <div>
        <div className="text-muted-foreground">Last Activity</div>
        <div className="font-medium">
          {stats.lastActivity ? new Date(stats.lastActivity).toLocaleDateString() : 'Never'}
        </div>
      </div>
    </div>
  );
};