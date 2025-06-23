/**
 * Profile Configuration Dialog
 * 
 * Dialog for creating and editing user profiles.
 * Provides form validation and profile management capabilities.
 */

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useService } from '../providers';
import { 
  UserProfile,
  IConfigurableComponent,
  ConfigurableComponentProps,
  ComponentState,
  ValidationResult,
  ValidationError
} from '@/types';
import { BaseDialog } from '@/components/ui-components/base-dialog';
import { User, Mail, FileText, Star, AlertCircle } from 'lucide-react';

/**
 * Profile configuration dialog config
 */
export interface ProfileConfigDialogConfig {
  /** Mode: create or edit */
  mode?: 'create' | 'edit';
  /** Show advanced settings */
  showAdvanced?: boolean;
  /** Allow setting as default */
  allowSetDefault?: boolean;
  /** Validate email format */
  validateEmail?: boolean;
}

/**
 * Profile configuration dialog props
 */
export interface ProfileConfigDialogProps extends ConfigurableComponentProps<ProfileConfigDialogConfig> {
  /** Dialog open state */
  open?: boolean;
  /** Callback when dialog closes */
  onClose?: () => void;
  /** Profile to edit (for edit mode) */
  profile?: UserProfile;
  /** Callback when profile is saved */
  onSave?: (profile: UserProfile) => void;
}

/**
 * Profile configuration dialog interface
 */
export interface IProfileConfigDialog extends IConfigurableComponent<ProfileConfigDialogConfig> {
  /** Open the dialog */
  open(profile?: UserProfile): void;
  /** Close the dialog */
  close(): void;
  /** Get current form data */
  getFormData(): Partial<UserProfile>;
  /** Validate current form */
  validateForm(): ValidationResult;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ProfileConfigDialogConfig = {
  mode: 'create',
  showAdvanced: true,
  allowSetDefault: true,
  validateEmail: true
};

/**
 * Profile form data
 */
interface ProfileFormData {
  displayName: string;
  email: string;
  description: string;
  isDefault: boolean;
  settings: Record<string, any>;
}

/**
 * Profile Configuration Dialog Component
 */
export const ProfileConfigurationDialog = forwardRef<
  IProfileConfigDialog,
  ProfileConfigDialogProps
>(({ 
  instanceId, 
  initialConfig,
  open: controlledOpen,
  onClose,
  profile: initialProfile,
  onSave
}, ref) => {
  const profileService = useService('profile');
  const notificationService = useService('notification');
  
  // State
  const [config, setConfig] = useState<ProfileConfigDialogConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig
  });
  const [isOpen, setIsOpen] = useState(controlledOpen || false);
  const [formData, setFormData] = useState<ProfileFormData>({
    displayName: '',
    email: '',
    description: '',
    isDefault: false,
    settings: {}
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);

  /**
   * Initialize form data from profile
   */
  const initializeFormData = useCallback((profile: UserProfile) => {
    setFormData({
      displayName: profile.displayName || '',
      email: profile.email || '',
      description: profile.description || '',
      isDefault: profile.isDefault || false,
      settings: profile.settings || {}
    });
    setEditingProfile(profile);
    setConfig(prev => ({ ...prev, mode: 'edit' }));
  }, []);

  /**
   * Reset form
   */
  const resetForm = useCallback(() => {
    setFormData({
      displayName: '',
      email: '',
      description: '',
      isDefault: false,
      settings: {}
    });
    setErrors({});
    setEditingProfile(null);
    setConfig(prev => ({ ...prev, mode: 'create' }));
  }, []);

  /**
   * Validate form
   */
  const validateForm = useCallback((): ValidationResult => {
    const newErrors: Record<string, string> = {};
    const validationErrors: ValidationError[] = [];

    // Validate display name
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
      validationErrors.push({
        field: 'displayName',
        message: 'Display name is required',
        severity: 'error'
      });
    } else if (formData.displayName.length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters';
      validationErrors.push({
        field: 'displayName',
        message: 'Display name must be at least 2 characters',
        severity: 'error'
      });
    }

    // Validate email
    if (config.validateEmail && formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Invalid email format';
        validationErrors.push({
          field: 'email',
          message: 'Invalid email format',
          severity: 'error'
        });
      }
    }

    setErrors(newErrors);

    return {
      valid: Object.keys(newErrors).length === 0,
      errors: validationErrors.length > 0 ? validationErrors : undefined
    };
  }, [formData, config.validateEmail]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    // Validate form
    const validation = validateForm();
    if (!validation.valid) {
      notificationService.warning('Please fix the form errors');
      return;
    }

    setIsSaving(true);

    try {
      let savedProfile: UserProfile | null = null;

      if (config.mode === 'create') {
        // Create new profile
        const newProfile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> = {
          userId: '', // Will be set by the service
          displayName: formData.displayName.trim(),
          email: formData.email.trim() || undefined,
          description: formData.description.trim() || undefined,
          isDefault: formData.isDefault,
          settings: formData.settings,
          metadata: {
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            lastActivity: new Date().toISOString()
          },
          lastActivity: new Date().toISOString()
        };

        savedProfile = await profileService.createUserProfile!(newProfile);
        
        if (savedProfile) {
          notificationService.success('Profile created successfully');
        }
      } else if (config.mode === 'edit' && editingProfile) {
        // Update existing profile
        const updates: Partial<UserProfile> = {
          displayName: formData.displayName.trim(),
          email: formData.email.trim() || undefined,
          description: formData.description.trim() || undefined,
          isDefault: formData.isDefault,
          settings: formData.settings
        };

        const success = await profileService.updateUserProfile!(editingProfile.id, updates);
        
        if (success) {
          savedProfile = await profileService.getUserProfile!(editingProfile.id);
          notificationService.success('Profile updated successfully');
        }
      }

      if (savedProfile) {
        // If set as default, update other profiles
        if (formData.isDefault && !editingProfile?.isDefault) {
          await profileService.setDefaultProfile(savedProfile.id);
        }

        // Callback
        if (onSave) {
          onSave(savedProfile);
        }

        // Close dialog
        setIsOpen(false);
        resetForm();
      } else {
        notificationService.error('Failed to save profile');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      notificationService.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  }, [config.mode, formData, editingProfile, validateForm, profileService, notificationService, onSave, resetForm]);

  /**
   * Open dialog
   */
  const open = useCallback((profile?: UserProfile) => {
    if (profile) {
      initializeFormData(profile);
    } else {
      resetForm();
    }
    setIsOpen(true);
  }, [initializeFormData, resetForm]);

  /**
   * Close dialog
   */
  const close = useCallback(() => {
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
    // Reset form after animation
    setTimeout(resetForm, 200);
  }, [onClose, resetForm]);

  /**
   * Get form data
   */
  const getFormData = useCallback((): Partial<UserProfile> => {
    return {
      displayName: formData.displayName,
      email: formData.email || undefined,
      description: formData.description || undefined,
      isDefault: formData.isDefault,
      settings: formData.settings
    };
  }, [formData]);

  /**
   * Handle input change
   */
  const handleInputChange = (field: keyof ProfileFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Expose component interface
   */
  useImperativeHandle(ref, () => ({
    // IConfigurableComponent implementation
    componentId: instanceId,
    componentType: 'profile-config' as const,
    
    getConfiguration: () => config,
    setConfiguration: (newConfig: ProfileConfigDialogConfig) => {
      setConfig({ ...DEFAULT_CONFIG, ...newConfig });
    },
    resetConfiguration: () => {
      setConfig(DEFAULT_CONFIG);
    },
    
    getState: (): ComponentState => ({
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        formData,
        mode: config.mode,
        editingProfileId: editingProfile?.id,
        isOpen
      }
    }),
    
    setState: (state: ComponentState) => {
      if (state.data?.formData) {
        setFormData(state.data.formData);
      }
      if (state.data?.mode) {
        setConfig(prev => ({ ...prev, mode: state.data.mode }));
      }
      if (typeof state.data?.isOpen === 'boolean') {
        setIsOpen(state.data.isOpen);
      }
    },
    
    validateConfiguration: (_configToValidate: ProfileConfigDialogConfig): ValidationResult => {
      return { valid: true };
    },
    
    // IProfileConfigDialog methods
    open,
    close,
    getFormData,
    validateForm
  }), [instanceId, config, formData, editingProfile, isOpen, open, close, getFormData, validateForm]);

  // Initialize form if profile provided
  useEffect(() => {
    if (initialProfile && isOpen) {
      initializeFormData(initialProfile);
    }
  }, [initialProfile, isOpen, initializeFormData]);

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
      title={config.mode === 'create' ? 'Create Profile' : 'Edit Profile'}
      description={config.mode === 'create' 
        ? 'Create a new user profile'
        : 'Edit profile settings and information'
      }
      className="max-w-md"
    >
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
        {/* Display Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            Display Name *
          </label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => handleInputChange('displayName', e.target.value)}
            placeholder="Enter display name"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.displayName ? 'border-destructive' : 'border-input'
            }`}
            autoFocus
          />
          {errors.displayName && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.displayName}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter email address"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.email ? 'border-destructive' : 'border-input'
            }`}
          />
          {errors.email && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.email}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Enter profile description"
            rows={3}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Advanced Settings */}
        {config.showAdvanced && (
          <div className="space-y-2 pt-2 border-t">
            <h3 className="text-sm font-medium">Advanced Settings</h3>
            
            {/* Default Profile */}
            {config.allowSetDefault && (
              <label className="flex items-center gap-3 p-2 hover:bg-accent rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                  className="w-4 h-4 rounded border-input"
                />
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">Set as default profile</span>
                </div>
              </label>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <button
            type="button"
            onClick={close}
            className="px-4 py-2 text-sm hover:bg-accent rounded"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : config.mode === 'create' ? 'Create Profile' : 'Save Changes'}
          </button>
        </div>
      </form>
    </BaseDialog>
  );
});

ProfileConfigurationDialog.displayName = 'ProfileConfigurationDialog';