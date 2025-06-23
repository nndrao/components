/**
 * Profile Management Example
 * 
 * Complete example showing how to use all profile components together
 */

import React, { useRef, useState } from 'react';
import { AGV1Provider } from '../providers';
import { ProfileManager } from './ProfileManager';
import { ProfileSelectionDialog, IProfileSelectionDialog } from './ProfileSelectionDialog';
import { ProfileConfigurationDialog, IProfileConfigDialog } from './ProfileConfigurationDialog';
import { UserProfile } from '@/types';
import { UserPlus, Users } from 'lucide-react';

/**
 * Profile management demo content
 */
const ProfileManagementContent: React.FC = () => {
  // Dialog refs
  const selectionDialogRef = useRef<IProfileSelectionDialog>(null);
  const configDialogRef = useRef<IProfileConfigDialog>(null);
  
  // State
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Handle profile change
   */
  const handleProfileChange = (profile: UserProfile) => {
    console.log('Profile changed:', profile);
  };

  /**
   * Handle configure profile
   */
  const handleConfigureProfile = (profile: UserProfile) => {
    setEditingProfile(profile);
    setIsCreating(false);
    configDialogRef.current?.open(profile);
  };

  /**
   * Handle create profile
   */
  const handleCreateProfile = () => {
    setEditingProfile(null);
    setIsCreating(true);
    configDialogRef.current?.open();
  };

  /**
   * Handle profile saved
   */
  const handleProfileSaved = (profile: UserProfile) => {
    console.log('Profile saved:', profile);
    // The ProfileManager will automatically update via profile events
  };

  /**
   * Handle profile selected
   */
  const handleProfileSelected = (profile: UserProfile) => {
    console.log('Profile selected:', profile);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Profile Management Example</h1>
            
            {/* Profile Manager */}
            <ProfileManager
              extended={true}
              onProfileChange={handleProfileChange}
              onConfigureProfile={handleConfigureProfile}
              onCreateProfile={handleCreateProfile}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Actions */}
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Profile Actions</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => selectionDialogRef.current?.open()}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Select Profile
              </button>
              <button
                onClick={handleCreateProfile}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Create Profile
              </button>
            </div>
          </div>

          {/* Profile Manager Variations */}
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Profile Manager Variations</h2>
            <div className="space-y-6">
              {/* Compact View */}
              <div>
                <h3 className="text-sm font-medium mb-2">Compact View</h3>
                <div className="flex items-center gap-4">
                  <ProfileManager
                    extended={false}
                    onProfileChange={handleProfileChange}
                    onConfigureProfile={handleConfigureProfile}
                    onCreateProfile={handleCreateProfile}
                  />
                  <span className="text-sm text-muted-foreground">
                    Compact profile selector for toolbars
                  </span>
                </div>
              </div>

              {/* Extended View */}
              <div>
                <h3 className="text-sm font-medium mb-2">Extended View</h3>
                <div className="flex items-center gap-4">
                  <ProfileManager
                    extended={true}
                    onProfileChange={handleProfileChange}
                    onConfigureProfile={handleConfigureProfile}
                    onCreateProfile={handleCreateProfile}
                  />
                  <span className="text-sm text-muted-foreground">
                    Extended view with email display
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">How to Use</h2>
            <ol className="space-y-2 list-decimal list-inside">
              <li>Click on the profile dropdown in the header to see available profiles</li>
              <li>Select a profile to switch to it</li>
              <li>Click the gear icon to edit a profile</li>
              <li>Use "Create Profile" to add new profiles</li>
              <li>Use "Select Profile" to open the selection dialog</li>
              <li>Profiles are automatically saved to IndexedDB</li>
            </ol>
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <ProfileSelectionDialog
        ref={selectionDialogRef}
        instanceId="profile-selection-1"
        initialConfig={{
          allowCreate: true,
          allowDelete: true,
          showStats: true
        }}
        onSelect={handleProfileSelected}
        onEditProfile={handleConfigureProfile}
        onCreateProfile={handleCreateProfile}
      />

      <ProfileConfigurationDialog
        ref={configDialogRef}
        instanceId="profile-config-1"
        profile={editingProfile || undefined}
        onSave={handleProfileSaved}
        initialConfig={{
          mode: isCreating ? 'create' : 'edit',
          showAdvanced: true,
          allowSetDefault: true,
          validateEmail: true
        }}
      />
    </div>
  );
};

/**
 * Profile Management Example App
 */
export const ProfileManagementExample: React.FC = () => {
  return (
    <AGV1Provider
      userId="demo-user"
      appId="profile-demo"
      storageMode="local"
      autoInitialize={true}
    >
      <ProfileManagementContent />
    </AGV1Provider>
  );
};

export default ProfileManagementExample;