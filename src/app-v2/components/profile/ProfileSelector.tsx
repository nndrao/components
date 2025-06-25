/**
 * ProfileSelector Component
 * 
 * Dropdown component for selecting and applying profiles to components.
 * Supports quick selection, preview, and profile management.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  Settings,
  Star,
  StarOff,
  Copy,
  Trash2,
  Download,
  Upload,
  MoreVertical,
  User,
  Users,
  Globe,
} from 'lucide-react';
import { useConfigStore, useConfigsByType } from '../../stores/config.store';
import { Config } from '../../services/config';
import { getProfileType } from '../../services/config/config.types';

interface ProfileSelectorProps {
  /**
   * Component type for filtering profiles
   */
  componentType: string;
  /**
   * Currently selected profile ID
   */
  value?: string;
  /**
   * Callback when profile is selected
   */
  onChange: (profileId: string | undefined) => void;
  /**
   * Callback when user wants to create new profile
   */
  onCreateNew?: () => void;
  /**
   * Callback when user wants to edit a profile
   */
  onEdit?: (profileId: string) => void;
  /**
   * Callback when user wants to delete a profile
   */
  onDelete?: (profileId: string) => void;
  /**
   * Callback when user wants to duplicate a profile
   */
  onDuplicate?: (profileId: string) => void;
  /**
   * Show profile management actions
   */
  showActions?: boolean;
  /**
   * Component is disabled
   */
  disabled?: boolean;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Class name for styling
   */
  className?: string;
}

export function ProfileSelector({
  componentType,
  value,
  onChange,
  onCreateNew,
  onEdit,
  onDelete,
  onDuplicate,
  showActions = true,
  disabled = false,
  placeholder = 'Select a profile...',
  className,
}: ProfileSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const profileType = getProfileType(componentType);
  const profiles = useConfigsByType(profileType);
  const { saveConfig, deleteConfig } = useConfigStore();

  // Group profiles by ownership
  const groupedProfiles = useMemo(() => {
    const groups = {
      personal: [] as Config[],
      shared: [] as Config[],
      global: [] as Config[],
    };

    profiles.forEach((profile) => {
      if (profile.isGlobal) {
        groups.global.push(profile);
      } else if (profile.sharedWith && profile.sharedWith.length > 0) {
        groups.shared.push(profile);
      } else {
        groups.personal.push(profile);
      }
    });

    // Sort each group by name
    Object.values(groups).forEach((group) => {
      group.sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [profiles]);

  // Toggle favorite status
  const handleToggleFavorite = useCallback(
    async (profileId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const profile = profiles.find((p) => p.configId === profileId);
      if (profile) {
        await saveConfig({
          ...profile,
          settings: {
            ...profile.settings,
            isFavorite: !profile.settings?.isFavorite,
          },
        });
      }
    },
    [profiles, saveConfig]
  );

  // Handle profile actions
  const handleAction = useCallback(
    (action: string, profileId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      switch (action) {
        case 'edit':
          onEdit?.(profileId);
          break;
        case 'duplicate':
          onDuplicate?.(profileId);
          break;
        case 'delete':
          onDelete?.(profileId);
          break;
      }
    },
    [onEdit, onDuplicate, onDelete]
  );

  // Get icon for profile visibility
  const getVisibilityIcon = (profile: Config) => {
    if (profile.isGlobal) return <Globe className="h-3 w-3" />;
    if (profile.sharedWith && profile.sharedWith.length > 0) return <Users className="h-3 w-3" />;
    return <User className="h-3 w-3" />;
  };

  // Get selected profile
  const selectedProfile = profiles.find((p) => p.configId === value);

  return (
    <TooltipProvider>
      <div className={className}>
        <Select
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          open={isOpen}
          onOpenChange={setIsOpen}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder}>
              {selectedProfile && (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-left">{selectedProfile.name}</span>
                  {selectedProfile.settings?.isFavorite && (
                    <Star className="h-3 w-3 fill-current text-yellow-500" />
                  )}
                  {getVisibilityIcon(selectedProfile)}
                </div>
              )}
            </SelectValue>
          </SelectTrigger>

          <SelectContent>
            {/* Create new profile option */}
            {onCreateNew && (
              <>
                <SelectItem value="__new__" className="font-medium">
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsOpen(false);
                      onCreateNew();
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Create New Profile
                  </div>
                </SelectItem>
                <SelectSeparator />
              </>
            )}

            {/* Personal profiles */}
            {groupedProfiles.personal.length > 0 && (
              <SelectGroup>
                <SelectLabel>Personal Profiles</SelectLabel>
                {groupedProfiles.personal.map((profile) => (
                  <SelectItem key={profile.configId} value={profile.configId}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 flex-1">
                        <span>{profile.name}</span>
                        {profile.settings?.isFavorite && (
                          <Star className="h-3 w-3 fill-current text-yellow-500" />
                        )}
                      </div>
                      {showActions && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => handleToggleFavorite(profile.configId, e)}
                              >
                                {profile.settings?.isFavorite ? (
                                  <Star className="h-3 w-3 fill-current" />
                                ) : (
                                  <StarOff className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {profile.settings?.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            </TooltipContent>
                          </Tooltip>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => handleAction('edit', profile.configId, e)}>
                                <Settings className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => handleAction('duplicate', profile.configId, e)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => handleAction('delete', profile.configId, e)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}

            {/* Shared profiles */}
            {groupedProfiles.shared.length > 0 && (
              <>
                {groupedProfiles.personal.length > 0 && <SelectSeparator />}
                <SelectGroup>
                  <SelectLabel>Shared Profiles</SelectLabel>
                  {groupedProfiles.shared.map((profile) => (
                    <SelectItem key={profile.configId} value={profile.configId}>
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>{profile.name}</span>
                        {profile.settings?.isFavorite && (
                          <Star className="h-3 w-3 fill-current text-yellow-500" />
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {profile.sharedWith?.length} users
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </>
            )}

            {/* Global profiles */}
            {groupedProfiles.global.length > 0 && (
              <>
                {(groupedProfiles.personal.length > 0 || groupedProfiles.shared.length > 0) && (
                  <SelectSeparator />
                )}
                <SelectGroup>
                  <SelectLabel>Global Profiles</SelectLabel>
                  {groupedProfiles.global.map((profile) => (
                    <SelectItem key={profile.configId} value={profile.configId}>
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <span>{profile.name}</span>
                        {profile.settings?.isFavorite && (
                          <Star className="h-3 w-3 fill-current text-yellow-500" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </>
            )}

            {/* No profiles message */}
            {profiles.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No profiles available
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
    </TooltipProvider>
  );
}