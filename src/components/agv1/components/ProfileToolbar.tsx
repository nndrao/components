/**
 * Profile Toolbar Component
 * 
 * Provides quick access to profile management for components
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { 
  ChevronDown, 
  Save, 
  SaveAll,
  FolderOpen,
  Plus,
  Settings,
  Star,
  Check,
  Download,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComponentProfile } from '@/types/agv1/profile.types';

interface ProfileToolbarProps {
  profiles: ComponentProfile[];
  activeProfileId?: string;
  onSaveProfile: (name: string) => Promise<void>;
  onLoadProfile: (profileId: string) => Promise<void>;
  onUpdateProfile?: (profileId: string, updates: Partial<ComponentProfile>) => Promise<void>;
  onDeleteProfile?: (profileId: string) => Promise<void>;
  onOpenProfileDialog?: () => void;
  className?: string;
  size?: 'sm' | 'default';
}

export const ProfileToolbar: React.FC<ProfileToolbarProps> = ({
  profiles,
  activeProfileId,
  onSaveProfile,
  onLoadProfile,
  onUpdateProfile,
  onDeleteProfile,
  onOpenProfileDialog,
  className,
  size = 'default'
}) => {
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  
  const handleSaveNewProfile = useCallback(async () => {
    if (!newProfileName.trim()) return;
    
    setIsSaving(true);
    try {
      await onSaveProfile(newProfileName);
      setNewProfileName('');
      setShowNewProfile(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  }, [newProfileName, onSaveProfile]);
  
  const handleQuickSave = useCallback(async () => {
    if (!activeProfile) {
      setShowNewProfile(true);
      return;
    }
    
    setIsSaving(true);
    try {
      // Update the current profile
      if (onUpdateProfile) {
        await onUpdateProfile(activeProfile.id, { 
          updatedAt: new Date(),
          version: activeProfile.version + 1
        });
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  }, [activeProfile, onUpdateProfile]);
  
  const buttonSize = size === 'sm' ? 'sm' : 'default';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Quick Save Button */}
      <Button
        size={buttonSize}
        variant="outline"
        onClick={handleQuickSave}
        disabled={isSaving}
        title={activeProfile ? `Save to "${activeProfile.name}"` : 'Save as new profile'}
      >
        <Save className={cn(iconSize, "mr-1")} />
        {size !== 'sm' && 'Save'}
      </Button>
      
      {/* Profile Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size={buttonSize} variant="outline">
            {activeProfile ? (
              <>
                <span className="max-w-[150px] truncate">
                  {activeProfile.name}
                </span>
                {activeProfile.isDefault && (
                  <Star className={cn(iconSize, "ml-1 text-yellow-500")} />
                )}
              </>
            ) : (
              'No Profile'
            )}
            <ChevronDown className={cn(iconSize, "ml-1")} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Profiles</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Profile List */}
          {profiles.length > 0 && (
            <>
              <DropdownMenuRadioGroup 
                value={activeProfileId} 
                onValueChange={(value) => onLoadProfile(value)}
              >
                {profiles.map((profile) => (
                  <DropdownMenuRadioItem 
                    key={profile.id} 
                    value={profile.id}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      {profile.name}
                      {profile.isDefault && (
                        <Star className="h-3 w-3 text-yellow-500" />
                      )}
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
            </>
          )}
          
          {/* Actions */}
          <DropdownMenuItem 
            onClick={() => setShowNewProfile(true)}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Save as New Profile
          </DropdownMenuItem>
          
          {activeProfile && (
            <DropdownMenuItem 
              onClick={handleQuickSave}
              className="cursor-pointer"
            >
              <SaveAll className="h-4 w-4 mr-2" />
              Update Current Profile
            </DropdownMenuItem>
          )}
          
          {onOpenProfileDialog && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onOpenProfileDialog}
                className="cursor-pointer"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Profiles...
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* New Profile Input (shown inline when creating) */}
      {showNewProfile && (
        <div className="flex items-center gap-2">
          <Input
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveNewProfile();
              if (e.key === 'Escape') {
                setShowNewProfile(false);
                setNewProfileName('');
              }
            }}
            placeholder="Profile name..."
            className="h-8 w-40"
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleSaveNewProfile}
            disabled={!newProfileName.trim() || isSaving}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowNewProfile(false);
              setNewProfileName('');
            }}
          >
            ×
          </Button>
        </div>
      )}
    </div>
  );
};