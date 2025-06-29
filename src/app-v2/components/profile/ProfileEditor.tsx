/**
 * ProfileEditor Component
 * 
 * Form component for creating and editing profiles.
 * Handles profile metadata, settings, and sharing options.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MultiSelect } from '../ui/MultiSelect/MultiSelect';
import {
  Save,
  X,
  Users,
  Globe,
  Lock,
  Info,
  Star,
  Copy,
  AlertCircle,
} from 'lucide-react';
import { useConfigStore } from '../../stores/config.store';
import { Config } from '../../services/config';
import { generateConfigId } from '../../utils/config.utils';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useDebounce } from '../../hooks/useDebounce';

interface ProfileEditorProps {
  /**
   * Profile to edit (undefined for new profile)
   */
  profile?: Config;
  /**
   * Component type for the profile
   */
  componentType: string;
  /**
   * Initial settings for new profile
   */
  initialSettings?: any;
  /**
   * Whether dialog is open
   */
  open: boolean;
  /**
   * Callback when dialog closes
   */
  onClose: () => void;
  /**
   * Callback when profile is saved
   */
  onSave?: (profile: Config) => void;
  /**
   * Available users for sharing
   */
  availableUsers?: Array<{ id: string; name: string; email: string; avatar?: string }>;
  /**
   * Enable auto-save
   */
  enableAutoSave?: boolean;
}

export function ProfileEditor({
  profile,
  componentType,
  initialSettings,
  open,
  onClose,
  onSave,
  availableUsers = [],
  enableAutoSave = true,
}: ProfileEditorProps) {
  const { saveConfig } = useConfigStore();
  const isEditing = !!profile;

  // Form state
  const [name, setName] = useState(profile?.name || '');
  const [description, setDescription] = useState(profile?.settings?.description || '');
  const [isGlobal, setIsGlobal] = useState(profile?.isGlobal || false);
  const [isTemplate, setIsTemplate] = useState(profile?.isTemplate || false);
  const [isFavorite, setIsFavorite] = useState(profile?.settings?.isFavorite || false);
  const [sharedWith, setSharedWith] = useState<string[]>(profile?.sharedWith || []);
  const [permissions, setPermissions] = useState(profile?.permissions || 'read');
  const [tags, setTags] = useState<string[]>(profile?.settings?.tags || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation
  const [nameError, setNameError] = useState('');
  const debouncedName = useDebounce(name, 300);

  // Validate name
  useEffect(() => {
    if (!debouncedName) {
      setNameError('Profile name is required');
    } else if (debouncedName.length < 3) {
      setNameError('Profile name must be at least 3 characters');
    } else {
      setNameError('');
    }
  }, [debouncedName]);

  // Auto-save for editing
  const autoSave = useAutoSave(
    { name, description, isGlobal, isTemplate, isFavorite, sharedWith, permissions, tags },
    {
      onSave: async (data) => {
        if (isEditing && profile && !nameError) {
          const updated: Config = {
            ...profile,
            name: data.name,
            isGlobal: data.isGlobal,
            isTemplate: data.isTemplate,
            sharedWith: data.sharedWith,
            permissions: data.permissions,
            settings: {
              ...profile.settings,
              description: data.description,
              isFavorite: data.isFavorite,
              tags: data.tags,
            },
          };
          await saveConfig(updated);
        }
      },
      enabled: enableAutoSave && isEditing,
      debounceDelay: 1000,
    }
  );

  // Handle save
  const handleSave = useCallback(async () => {
    if (nameError) {
      setError(nameError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const profileData: Config = isEditing && profile
        ? {
            ...profile,
            name,
            isGlobal,
            isTemplate,
            sharedWith,
            permissions,
            settings: {
              ...profile.settings,
              description,
              isFavorite,
              tags,
            },
            lastUpdated: Date.now(),
          }
        : {
            configId: generateConfigId(componentType),
            appId: 'app',
            userId: 'current-user',
            componentType: `${componentType}.Profile`,
            name,
            isGlobal,
            isTemplate,
            sharedWith,
            permissions,
            settings: {
              ...initialSettings,
              description,
              isFavorite,
              tags,
            },
            createdBy: 'current-user',
            creationTime: Date.now(),
          };

      await saveConfig(profileData);
      onSave?.(profileData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [
    profile,
    name,
    description,
    isGlobal,
    isTemplate,
    isFavorite,
    sharedWith,
    permissions,
    tags,
    nameError,
    componentType,
    initialSettings,
    isEditing,
    saveConfig,
    onSave,
    onClose,
  ]);

  // Handle tag input
  const [tagInput, setTagInput] = useState('');
  const handleAddTag = useCallback(() => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  }, [tags]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Profile' : 'Create New Profile'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update profile settings and sharing options'
              : 'Create a new profile with your current settings'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="sharing">Sharing</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Profile Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter profile name"
                className={nameError ? 'border-destructive' : ''}
              />
              {nameError && (
                <p className="text-sm text-destructive">{nameError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this profile is for..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="favorite"
                checked={isFavorite}
                onCheckedChange={setIsFavorite}
              />
              <Label htmlFor="favorite" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Mark as favorite
              </Label>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add tags..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button onClick={handleAddTag} size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                    <button
                      className="ml-1 hover:text-destructive"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sharing" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="global"
                  checked={isGlobal}
                  onCheckedChange={setIsGlobal}
                />
                <Label htmlFor="global" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Make globally available
                </Label>
              </div>

              {!isGlobal && (
                <>
                  <div className="space-y-2">
                    <Label>Share with users</Label>
                    <MultiSelect
                      value={sharedWith}
                      onChange={setSharedWith}
                      options={availableUsers.map((user) => ({
                        value: user.id,
                        label: user.name,
                        description: user.email,
                        icon: (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>
                              {user.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ),
                      }))}
                      placeholder="Select users to share with..."
                    />
                  </div>

                  {sharedWith.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="permissions">Permissions</Label>
                      <Select value={permissions} onValueChange={(value) => setPermissions(value as 'read' | 'write' | 'admin')}>
                        <SelectTrigger id="permissions">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read">
                            <div className="flex items-center gap-2">
                              <Lock className="h-4 w-4" />
                              Read only
                            </div>
                          </SelectItem>
                          <SelectItem value="write">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Can edit
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              <div className="rounded-lg bg-muted p-3">
                <div className="flex gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    {isGlobal
                      ? 'This profile will be available to all users in the organization.'
                      : sharedWith.length > 0
                      ? `This profile will be shared with ${sharedWith.length} user${
                          sharedWith.length > 1 ? 's' : ''
                        }.`
                      : 'This profile is private and only visible to you.'}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="template"
                checked={isTemplate}
                onCheckedChange={setIsTemplate}
              />
              <Label htmlFor="template" className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Save as template
              </Label>
            </div>

            <div className="rounded-lg bg-muted p-3">
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  Templates can be used as starting points for new profiles.
                  They appear in the "Create from template" menu.
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="space-y-2">
                <Label>Profile Information</Label>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <div>Created by: {profile.createdBy}</div>
                  <div>
                    Created: {new Date(profile.creationTime).toLocaleString()}
                  </div>
                  {profile.lastUpdated && (
                    <div>
                      Last updated: {new Date(profile.lastUpdated).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive mt-4">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {enableAutoSave && isEditing && autoSave.saveState === 'saving' && (
          <div className="text-sm text-muted-foreground mt-4">
            Auto-saving...
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !!nameError}>
            {saving ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? 'Update Profile' : 'Create Profile'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}