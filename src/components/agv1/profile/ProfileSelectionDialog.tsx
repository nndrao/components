/**
 * Profile Selection Dialog
 * 
 * Dialog for selecting a profile from available profiles.
 * Used during startup or when switching profiles.
 */

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useService } from '../providers';
import { 
  UserProfile,
  IConfigurableComponent,
  ConfigurableComponentProps,
  ComponentState,
  ValidationResult
} from '@/types';
import { BaseDialog } from '@/components/ui-components/base-dialog';
import { User, Check, Star, Trash2, Edit2 } from 'lucide-react';

/**
 * Profile selection dialog configuration
 */
export interface ProfileSelectionConfig {
  /** Allow creating new profiles from dialog */
  allowCreate?: boolean;
  /** Allow deleting profiles from dialog */
  allowDelete?: boolean;
  /** Show profile statistics */
  showStats?: boolean;
  /** Auto-select default profile */
  autoSelectDefault?: boolean;
}

/**
 * Profile selection dialog props
 */
export interface ProfileSelectionDialogProps extends ConfigurableComponentProps<ProfileSelectionConfig> {
  /** Dialog open state */
  open?: boolean;
  /** Callback when dialog closes */
  onClose?: () => void;
  /** Callback when profile is selected */
  onSelect?: (profile: UserProfile) => void;
  /** Callback to edit profile */
  onEditProfile?: (profile: UserProfile) => void;
  /** Callback to create new profile */
  onCreateProfile?: () => void;
}

/**
 * Profile selection dialog interface
 */
export interface IProfileSelectionDialog extends IConfigurableComponent<ProfileSelectionConfig> {
  /** Open the dialog */
  open(): void;
  /** Close the dialog */
  close(): void;
  /** Select a profile programmatically */
  selectProfile(profileId: string): Promise<boolean>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ProfileSelectionConfig = {
  allowCreate: true,
  allowDelete: false,
  showStats: true,
  autoSelectDefault: false
};

/**
 * Profile Selection Dialog Component
 */
export const ProfileSelectionDialog = forwardRef<
  IProfileSelectionDialog,
  ProfileSelectionDialogProps
>(({ 
  instanceId, 
  initialConfig,
  open: controlledOpen,
  onClose,
  onSelect,
  onEditProfile,
  onCreateProfile
}, ref) => {
  const profileService = useService('profile');
  const notificationService = useService('notification');
  
  // State
  const [config, setConfig] = useState<ProfileSelectionConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig
  });
  const [isOpen, setIsOpen] = useState(controlledOpen || false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);

  /**
   * Load profiles
   */
  const loadProfiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const allProfiles = await profileService.getAllProfiles();
      setProfiles(allProfiles);
      
      // Auto-select default if configured
      if (config.autoSelectDefault) {
        const defaultProfile = allProfiles.find(p => p.isDefault);
        if (defaultProfile) {
          setSelectedProfile(defaultProfile);
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load profiles:', error);
      notificationService.error('Failed to load profiles');
      setIsLoading(false);
    }
  }, [profileService, notificationService, config.autoSelectDefault]);

  /**
   * Handle profile selection
   */
  const handleSelectProfile = useCallback(async () => {
    if (!selectedProfile) {
      notificationService.warning('Please select a profile');
      return;
    }

    try {
      const success = await profileService.switchProfile(selectedProfile.id);
      
      if (success) {
        notificationService.success(`Selected profile: ${selectedProfile.displayName}`);
        
        if (onSelect) {
          onSelect(selectedProfile);
        }
        
        setIsOpen(false);
      } else {
        notificationService.error('Failed to select profile');
      }
    } catch (error) {
      console.error('Failed to select profile:', error);
      notificationService.error('Failed to select profile');
    }
  }, [selectedProfile, profileService, notificationService, onSelect]);

  /**
   * Handle profile deletion
   */
  const handleDeleteProfile = useCallback(async (profile: UserProfile) => {
    if (!config.allowDelete) return;
    
    // Don't allow deleting the default profile
    if (profile.isDefault) {
      notificationService.warning('Cannot delete the default profile');
      return;
    }

    // Confirm deletion
    setDeletingProfileId(profile.id);
    
    try {
      await profileService.deleteProfile(profile.id);
      const success = true; // deleteProfile returns void
      
      if (success) {
        notificationService.success(`Deleted profile: ${profile.displayName}`);
        
        // Reload profiles
        await loadProfiles();
        
        // Clear selection if deleted profile was selected
        if (selectedProfile?.id === profile.id) {
          setSelectedProfile(null);
        }
      } else {
        notificationService.error('Failed to delete profile');
      }
    } catch (error) {
      console.error('Failed to delete profile:', error);
      notificationService.error('Failed to delete profile');
    } finally {
      setDeletingProfileId(null);
    }
  }, [config.allowDelete, profileService, notificationService, loadProfiles, selectedProfile]);

  /**
   * Open dialog
   */
  const open = useCallback(() => {
    setIsOpen(true);
    loadProfiles();
  }, [loadProfiles]);

  /**
   * Close dialog
   */
  const close = useCallback(() => {
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  /**
   * Select profile programmatically
   */
  const selectProfile = useCallback(async (profileId: string): Promise<boolean> => {
    const profile = profiles.find(p => p.id === profileId);
    
    if (!profile) {
      return false;
    }
    
    setSelectedProfile(profile);
    
    try {
      const success = await profileService.switchProfile(profileId);
      
      if (success && onSelect) {
        onSelect(profile);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to select profile:', error);
      return false;
    }
  }, [profiles, profileService, onSelect]);

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

  /**
   * Expose component interface
   */
  useImperativeHandle(ref, () => ({
    // IConfigurableComponent implementation
    componentId: instanceId,
    componentType: 'profile-selection' as const,
    
    getConfiguration: () => config,
    setConfiguration: (newConfig: ProfileSelectionConfig) => {
      setConfig({ ...DEFAULT_CONFIG, ...newConfig });
    },
    resetConfiguration: () => {
      setConfig(DEFAULT_CONFIG);
    },
    
    getState: (): ComponentState => ({
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        selectedProfileId: selectedProfile?.id,
        isOpen
      }
    }),
    
    setState: (state: ComponentState) => {
      if (state.data?.selectedProfileId) {
        const profile = profiles.find(p => p.id === state.data.selectedProfileId);
        if (profile) {
          setSelectedProfile(profile);
        }
      }
      if (typeof state.data?.isOpen === 'boolean') {
        setIsOpen(state.data.isOpen);
      }
    },
    
    validateConfiguration: (_configToValidate: ProfileSelectionConfig): ValidationResult => {
      return { valid: true };
    },
    
    // IProfileSelectionDialog methods
    open,
    close,
    selectProfile
  }), [instanceId, config, selectedProfile, isOpen, profiles, open, close, selectProfile]);

  // Load profiles on mount or when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen, loadProfiles]);

  // Sync controlled open state
  useEffect(() => {
    if (controlledOpen !== undefined) {
      setIsOpen(controlledOpen);
    }
  }, [controlledOpen]);

  return (
    <BaseDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close();
        setIsOpen(open);
      }}
      title="Select Profile"
      description="Choose a profile to continue"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {/* Profile Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {profiles.map(profile => (
              <div
                key={profile.id}
                onClick={() => setSelectedProfile(profile)}
                className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedProfile?.id === profile.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {/* Selection Indicator */}
                {selectedProfile?.id === profile.id && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                )}

                {/* Profile Info */}
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${getProfileColor(profile)}`}>
                    {getProfileInitials(profile)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{profile.displayName}</h3>
                      {profile.isDefault && (
                        <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
                      )}
                    </div>
                    {profile.email && (
                      <p className="text-sm text-muted-foreground">{profile.email}</p>
                    )}
                    {profile.description && (
                      <p className="text-sm text-muted-foreground mt-1">{profile.description}</p>
                    )}
                    
                    {/* Stats */}
                    {config.showStats && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Last active: {profile.lastActivity 
                          ? new Date(profile.lastActivity).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  {onEditProfile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditProfile(profile);
                      }}
                      className="p-1 hover:bg-accent rounded"
                      title="Edit profile"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {config.allowDelete && !profile.isDefault && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProfile(profile);
                      }}
                      disabled={deletingProfileId === profile.id}
                      className="p-1 hover:bg-destructive/10 text-destructive rounded disabled:opacity-50"
                      title="Delete profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && profiles.length === 0 && (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No profiles found</p>
            {config.allowCreate && onCreateProfile && (
              <button
                onClick={onCreateProfile}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Create First Profile
              </button>
            )}
          </div>
        )}

        {/* Footer Actions */}
        {!isLoading && profiles.length > 0 && (
          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              {config.allowCreate && onCreateProfile && (
                <button
                  onClick={onCreateProfile}
                  className="px-4 py-2 text-sm hover:bg-accent rounded"
                >
                  Create New Profile
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={close}
                className="px-4 py-2 text-sm hover:bg-accent rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSelectProfile}
                disabled={!selectedProfile}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Select Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </BaseDialog>
  );
});

ProfileSelectionDialog.displayName = 'ProfileSelectionDialog';