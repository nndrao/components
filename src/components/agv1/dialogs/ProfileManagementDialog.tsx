/**
 * Profile Management Dialog
 * 
 * Manages component configuration profiles - NOT user profiles.
 * Profiles are named configuration sets that components can save/load.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { DraggableDialog } from '@/components/ui-components/draggable-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { 
  Plus, 
  Save, 
  Download, 
  Upload, 
  Trash2, 
  Edit2, 
  Copy,
  Shield,
  Star,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComponentProfile } from '@/types/agv1/profile.types';

interface ProfileManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  componentInstanceId: string;
  componentType: string;
  profiles: ComponentProfile[];
  activeProfileId?: string;
  onCreateProfile: (name: string, description?: string) => Promise<ComponentProfile>;
  onLoadProfile: (profileId: string) => Promise<void>;
  onUpdateProfile: (profileId: string, updates: Partial<ComponentProfile>) => Promise<void>;
  onDeleteProfile: (profileId: string) => Promise<void>;
  onDuplicateProfile: (profileId: string, newName: string) => Promise<ComponentProfile>;
  onExportProfile: (profileId: string) => void;
  onImportProfile: (data: string) => Promise<ComponentProfile>;
  onSetDefault: (profileId: string) => Promise<void>;
}

export const ProfileManagementDialog: React.FC<ProfileManagementDialogProps> = ({
  open,
  onOpenChange,
  componentInstanceId,
  componentType,
  profiles,
  activeProfileId,
  onCreateProfile,
  onLoadProfile,
  onUpdateProfile,
  onDeleteProfile,
  onDuplicateProfile,
  onExportProfile,
  onImportProfile,
  onSetDefault
}) => {
  const [selectedProfile, setSelectedProfile] = useState<ComponentProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDescription, setNewProfileDescription] = useState('');
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  useEffect(() => {
    if (profiles.length > 0 && !selectedProfile) {
      const activeProfile = profiles.find(p => p.id === activeProfileId);
      setSelectedProfile(activeProfile || profiles[0]);
    }
  }, [profiles, activeProfileId, selectedProfile]);
  
  const handleCreateProfile = useCallback(async () => {
    if (!newProfileName.trim()) return;
    
    try {
      const profile = await onCreateProfile(newProfileName, newProfileDescription);
      setSelectedProfile(profile);
      setNewProfileName('');
      setNewProfileDescription('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create profile:', error);
    }
  }, [newProfileName, newProfileDescription, onCreateProfile]);
  
  const handleLoadProfile = useCallback(async (profile: ComponentProfile) => {
    try {
      await onLoadProfile(profile.id);
      setSelectedProfile(profile);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }, [onLoadProfile]);
  
  const handleDeleteProfile = useCallback(async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;
    
    try {
      await onDeleteProfile(profileId);
      if (selectedProfile?.id === profileId) {
        setSelectedProfile(profiles.find(p => p.id !== profileId) || null);
      }
    } catch (error) {
      console.error('Failed to delete profile:', error);
    }
  }, [onDeleteProfile, selectedProfile, profiles]);
  
  const handleDuplicateProfile = useCallback(async (profile: ComponentProfile) => {
    const newName = prompt('Name for duplicated profile:', `${profile.name} (Copy)`);
    if (!newName) return;
    
    try {
      const duplicated = await onDuplicateProfile(profile.id, newName);
      setSelectedProfile(duplicated);
    } catch (error) {
      console.error('Failed to duplicate profile:', error);
    }
  }, [onDuplicateProfile]);
  
  const handleExportProfile = useCallback((profile: ComponentProfile) => {
    onExportProfile(profile.id);
  }, [onExportProfile]);
  
  const handleImportProfile = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const text = await file.text();
        try {
          const imported = await onImportProfile(text);
          setSelectedProfile(imported);
        } catch (error) {
          console.error('Failed to import profile:', error);
        }
      }
    };
    input.click();
  }, [onImportProfile]);
  
  const handleRenameProfile = useCallback(async (profile: ComponentProfile) => {
    if (!editingName.trim() || editingName === profile.name) {
      setEditingProfile(null);
      return;
    }
    
    try {
      await onUpdateProfile(profile.id, { name: editingName });
      setEditingProfile(null);
    } catch (error) {
      console.error('Failed to rename profile:', error);
    }
  }, [editingName, onUpdateProfile]);
  
  const handleSetDefault = useCallback(async (profile: ComponentProfile) => {
    try {
      await onSetDefault(profile.id);
    } catch (error) {
      console.error('Failed to set default profile:', error);
    }
  }, [onSetDefault]);
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };
  
  return (
    <DraggableDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Profile Management"
      width={700}
      height={500}
    >
      <div className="flex flex-col h-full">
        <div className="flex flex-1 overflow-hidden">
          {/* Profile List */}
          <div className="w-64 border-r flex flex-col bg-muted/30">
            <div className="p-4 border-b flex-shrink-0">
              <h3 className="font-semibold text-sm mb-3">PROFILES</h3>
              <Button
                size="sm"
                className="w-full"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                New Profile
              </Button>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className={cn(
                      "p-3 rounded-md cursor-pointer transition-colors mb-2",
                      selectedProfile?.id === profile.id 
                        ? "bg-accent" 
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => setSelectedProfile(profile)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {editingProfile === profile.id ? (
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => handleRenameProfile(profile)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameProfile(profile);
                              if (e.key === 'Escape') setEditingProfile(null);
                            }}
                            className="h-6 text-sm"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <h4 className="font-medium text-sm truncate">{profile.name}</h4>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Updated {formatDate(profile.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {profile.isDefault && (
                          <Star className="h-3 w-3 text-yellow-500" />
                        )}
                        {profile.isProtected && (
                          <Shield className="h-3 w-3 text-blue-500" />
                        )}
                        {profile.id === activeProfileId && (
                          <Check className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t flex-shrink-0">
              <p className="text-sm text-muted-foreground">
                {profiles.length} profile{profiles.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          {/* Profile Details */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                {isCreating ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Create New Profile</h3>
                    
                    <div>
                      <Label htmlFor="profile-name">Profile Name *</Label>
                      <Input
                        id="profile-name"
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        placeholder="Enter profile name"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="profile-description">Description</Label>
                      <Input
                        id="profile-description"
                        value={newProfileDescription}
                        onChange={(e) => setNewProfileDescription(e.target.value)}
                        placeholder="Optional description"
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleCreateProfile}>
                        Create Profile
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsCreating(false);
                          setNewProfileName('');
                          setNewProfileDescription('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : selectedProfile ? (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Profile Details</h3>
                        <div className="flex items-center gap-2">
                          {selectedProfile.isDefault && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                          {selectedProfile.isProtected && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Protected
                            </span>
                          )}
                          {selectedProfile.id === activeProfileId && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Card className="p-4 space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Name</Label>
                          <p className="font-medium">{selectedProfile.name}</p>
                        </div>
                        
                        {selectedProfile.description && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Description</Label>
                            <p className="text-sm">{selectedProfile.description}</p>
                          </div>
                        )}
                        
                        <div>
                          <Label className="text-xs text-muted-foreground">Component Type</Label>
                          <p className="text-sm font-mono">{selectedProfile.componentType}</p>
                        </div>
                        
                        <div>
                          <Label className="text-xs text-muted-foreground">Created</Label>
                          <p className="text-sm">{formatDate(selectedProfile.createdAt)}</p>
                        </div>
                        
                        <div>
                          <Label className="text-xs text-muted-foreground">Last Updated</Label>
                          <p className="text-sm">{formatDate(selectedProfile.updatedAt)}</p>
                        </div>
                        
                        <div>
                          <Label className="text-xs text-muted-foreground">Version</Label>
                          <p className="text-sm">{selectedProfile.version}</p>
                        </div>
                      </Card>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-3">Actions</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoadProfile(selectedProfile)}
                          disabled={selectedProfile.id === activeProfileId}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Load Profile
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingProfile(selectedProfile.id);
                            setEditingName(selectedProfile.name);
                          }}
                          disabled={selectedProfile.isProtected}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Rename
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateProfile(selectedProfile)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Duplicate
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportProfile(selectedProfile)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Export
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(selectedProfile)}
                          disabled={selectedProfile.isDefault}
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Set Default
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteProfile(selectedProfile.id)}
                          disabled={selectedProfile.isProtected || selectedProfile.isDefault}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <p>No profiles available</p>
                    <Button
                      className="mt-4"
                      onClick={() => setIsCreating(true)}
                    >
                      Create First Profile
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportProfile}
          >
            <Upload className="h-4 w-4 mr-1" />
            Import
          </Button>
          
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </div>
    </DraggableDialog>
  );
};