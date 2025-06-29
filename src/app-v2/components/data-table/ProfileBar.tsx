import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { ChevronDown, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Profile } from '../../types';

interface ProfileBarProps {
  componentId: string;
  onSaveState?: () => boolean;
}

const emptyProfiles: Profile[] = [];

export function ProfileBar({ componentId, onSaveState }: ProfileBarProps) {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const profiles = useAppStore(state => state.profiles.get(componentId)) || emptyProfiles;
  const activeProfileId = useAppStore(state => state.activeProfiles.get(componentId));
  const { createProfile, switchProfile, deleteProfile } = useAppStore();
  
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  
  const handleCreateProfile = () => {
    if (newProfileName.trim()) {
      try {
        createProfile(componentId, newProfileName.trim());
        setNewProfileName('');
        setShowNewDialog(false);
      } catch (error) {
        console.error('Error creating profile:', error);
      }
    }
  };
  
  const handleSaveProfile = () => {
    if (onSaveState && activeProfile) {
      const saved = onSaveState();
      if (saved) {
        setShowSaveConfirm(true);
        setTimeout(() => setShowSaveConfirm(false), 2000);
      }
    }
  };
  
  return (
    <>
      <div className="flex items-center gap-2">
      {/* Save Button */}
      {activeProfile && onSaveState && (
        <Button
          variant="outline"
          size="sm"
          className="h-7"
          onClick={handleSaveProfile}
          title={`Save current state to ${activeProfile.name}`}
        >
          <Save className="h-4 w-4" />
          {showSaveConfirm && (
            <span className="ml-2 text-xs text-green-600">Saved!</span>
          )}
        </Button>
      )}
      
      {/* Profile Dropdown */}
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7">
            <span>{activeProfile?.name || 'Select Profile'}</span>
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {profiles.map(profile => (
            <DropdownMenuItem
              key={profile.id}
              className="flex items-center justify-between"
              onSelect={(e) => {
                e.preventDefault();
                switchProfile(componentId, profile.id);
              }}
            >
              <span className={profile.id === activeProfileId ? 'font-semibold' : ''}>
                {profile.name}
              </span>
              {profiles.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProfile(componentId, profile.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setDropdownOpen(false);
              // Use setTimeout to ensure dropdown closes before dialog opens
              setTimeout(() => {
                setShowNewDialog(true);
              }, 100);
            }}
            className="flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Profile
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
      
      {showNewDialog && (
        <Dialog 
          open={showNewDialog} 
          onOpenChange={(open) => {
            setShowNewDialog(open);
            if (!open) {
              setNewProfileName('');
            }
          }}
        >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Profile</DialogTitle>
            <DialogDescription>
              Enter a name for your new profile configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
                placeholder="Profile name"
                className="col-span-3"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProfile}>Create</Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
      )}
    </>
  );
}