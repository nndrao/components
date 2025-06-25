/**
 * ProfileList Component
 * 
 * Displays a list of profiles with management actions.
 * Supports filtering, sorting, and bulk operations.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Download,
  Upload,
  Star,
  StarOff,
  Users,
  Globe,
  User,
  Filter,
  ChevronDown,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useConfigStore, useConfigsByType } from '../../stores/config.store';
import { Config } from '../../services/config';
import { getProfileType } from '../../services/config/config.types';
import { cn } from '@/lib/utils';

interface ProfileListProps {
  /**
   * Component type for filtering profiles
   */
  componentType: string;
  /**
   * Selected profile IDs
   */
  selectedIds?: string[];
  /**
   * Callback when selection changes
   */
  onSelectionChange?: (ids: string[]) => void;
  /**
   * Callback when profile is selected
   */
  onSelect?: (profile: Config) => void;
  /**
   * Callback when user wants to create new profile
   */
  onCreateNew?: () => void;
  /**
   * Callback when user wants to edit a profile
   */
  onEdit?: (profile: Config) => void;
  /**
   * Callback when user wants to delete profiles
   */
  onDelete?: (profiles: Config[]) => void;
  /**
   * Callback when user wants to duplicate a profile
   */
  onDuplicate?: (profile: Config) => void;
  /**
   * Callback when user wants to export profiles
   */
  onExport?: (profiles: Config[]) => void;
  /**
   * Callback when user wants to import profiles
   */
  onImport?: () => void;
  /**
   * Enable multi-select mode
   */
  multiSelect?: boolean;
  /**
   * Show actions column
   */
  showActions?: boolean;
  /**
   * Class name for styling
   */
  className?: string;
}

type SortField = 'name' | 'createdAt' | 'updatedAt' | 'owner';
type SortDirection = 'asc' | 'desc';
type FilterType = 'all' | 'personal' | 'shared' | 'global' | 'favorites';

export function ProfileList({
  componentType,
  selectedIds = [],
  onSelectionChange,
  onSelect,
  onCreateNew,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onImport,
  multiSelect = false,
  showActions = true,
  className,
}: ProfileListProps) {
  const profileType = getProfileType(componentType);
  const profiles = useConfigsByType(profileType);
  const { saveConfig, deleteConfig } = useConfigStore();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Filter profiles
  const filteredProfiles = useMemo(() => {
    let filtered = profiles;

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (profile) =>
          profile.name.toLowerCase().includes(search) ||
          profile.settings?.description?.toLowerCase().includes(search) ||
          profile.settings?.tags?.some((tag: string) =>
            tag.toLowerCase().includes(search)
          )
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'personal':
        filtered = filtered.filter(
          (p) => !p.isGlobal && (!p.sharedWith || p.sharedWith.length === 0)
        );
        break;
      case 'shared':
        filtered = filtered.filter((p) => p.sharedWith && p.sharedWith.length > 0);
        break;
      case 'global':
        filtered = filtered.filter((p) => p.isGlobal);
        break;
      case 'favorites':
        filtered = filtered.filter((p) => p.settings?.isFavorite);
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let result = 0;
      switch (sortField) {
        case 'name':
          result = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          result = a.creationTime - b.creationTime;
          break;
        case 'updatedAt':
          result = (a.lastUpdated || a.creationTime) - (b.lastUpdated || b.creationTime);
          break;
        case 'owner':
          result = a.createdBy.localeCompare(b.createdBy);
          break;
      }
      return sortDirection === 'asc' ? result : -result;
    });

    return filtered;
  }, [profiles, searchTerm, filterType, sortField, sortDirection]);

  // Selection handling
  const isAllSelected = filteredProfiles.length > 0 && 
    filteredProfiles.every((p) => selectedIds.includes(p.configId));
  const isPartiallySelected = !isAllSelected && 
    filteredProfiles.some((p) => selectedIds.includes(p.configId));

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    
    if (isAllSelected) {
      // Deselect all
      onSelectionChange([]);
    } else {
      // Select all filtered
      onSelectionChange(filteredProfiles.map((p) => p.configId));
    }
  }, [isAllSelected, filteredProfiles, onSelectionChange]);

  const handleSelectProfile = useCallback(
    (profile: Config) => {
      if (multiSelect && onSelectionChange) {
        if (selectedIds.includes(profile.configId)) {
          onSelectionChange(selectedIds.filter((id) => id !== profile.configId));
        } else {
          onSelectionChange([...selectedIds, profile.configId]);
        }
      } else {
        onSelect?.(profile);
      }
    },
    [multiSelect, selectedIds, onSelectionChange, onSelect]
  );

  // Toggle favorite
  const handleToggleFavorite = useCallback(
    async (profile: Config, e: React.MouseEvent) => {
      e.stopPropagation();
      await saveConfig({
        ...profile,
        settings: {
          ...profile.settings,
          isFavorite: !profile.settings?.isFavorite,
        },
      });
    },
    [saveConfig]
  );

  // Bulk actions
  const handleBulkDelete = useCallback(() => {
    const selected = profiles.filter((p) => selectedIds.includes(p.configId));
    onDelete?.(selected);
  }, [profiles, selectedIds, onDelete]);

  const handleBulkExport = useCallback(() => {
    const selected = profiles.filter((p) => selectedIds.includes(p.configId));
    onExport?.(selected);
  }, [profiles, selectedIds, onExport]);

  // Get icon for profile visibility
  const getVisibilityIcon = (profile: Config) => {
    if (profile.isGlobal) return <Globe className="h-4 w-4 text-muted-foreground" />;
    if (profile.sharedWith && profile.sharedWith.length > 0) 
      return <Users className="h-4 w-4 text-muted-foreground" />;
    return <User className="h-4 w-4 text-muted-foreground" />;
  };

  // Get profile counts
  const counts = useMemo(() => {
    return {
      all: profiles.length,
      personal: profiles.filter(
        (p) => !p.isGlobal && (!p.sharedWith || p.sharedWith.length === 0)
      ).length,
      shared: profiles.filter((p) => p.sharedWith && p.sharedWith.length > 0).length,
      global: profiles.filter((p) => p.isGlobal).length,
      favorites: profiles.filter((p) => p.settings?.isFavorite).length,
    };
  }, [profiles]);

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Profiles</CardTitle>
              <CardDescription>
                Manage and organize your {componentType} profiles
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {onImport && (
                <Button variant="outline" size="sm" onClick={onImport}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
              )}
              {onCreateNew && (
                <Button size="sm" onClick={onCreateNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters and Search */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search profiles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  {filterType === 'all' ? 'All' : filterType}
                  <Badge variant="secondary" className="ml-2">
                    {counts[filterType]}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilterType('all')}>
                  All profiles ({counts.all})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('personal')}>
                  Personal ({counts.personal})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('shared')}>
                  Shared ({counts.shared})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('global')}>
                  Global ({counts.global})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterType('favorites')}>
                  <Star className="mr-2 h-4 w-4" />
                  Favorites ({counts.favorites})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Bulk Actions */}
          {multiSelect && selectedIds.length > 0 && (
            <div className="flex items-center gap-2 mb-4 p-2 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} selected
              </span>
              <div className="flex-1" />
              {onExport && (
                <Button variant="outline" size="sm" onClick={handleBulkExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          )}

          {/* Profile Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {multiSelect && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => {
                      if (sortField === 'name') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('name');
                        setSortDirection('asc');
                      }
                    }}
                  >
                    Name
                    {sortField === 'name' && (
                      <ChevronDown
                        className={cn(
                          'ml-2 h-4 w-4 inline',
                          sortDirection === 'desc' && 'rotate-180'
                        )}
                      />
                    )}
                  </TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => {
                      if (sortField === 'updatedAt') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('updatedAt');
                        setSortDirection('desc');
                      }
                    }}
                  >
                    Last Updated
                    {sortField === 'updatedAt' && (
                      <ChevronDown
                        className={cn(
                          'ml-2 h-4 w-4 inline',
                          sortDirection === 'desc' && 'rotate-180'
                        )}
                      />
                    )}
                  </TableHead>
                  {showActions && <TableHead className="w-20">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={multiSelect ? 6 : 5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {searchTerm || filterType !== 'all'
                        ? 'No profiles found matching your criteria'
                        : 'No profiles created yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProfiles.map((profile) => (
                    <TableRow
                      key={profile.configId}
                      className={cn(
                        'cursor-pointer',
                        selectedIds.includes(profile.configId) && 'bg-muted/50'
                      )}
                      onClick={() => handleSelectProfile(profile)}
                    >
                      {multiSelect && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(profile.configId)}
                            onCheckedChange={() => handleSelectProfile(profile)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{profile.name}</div>
                            {profile.settings?.description && (
                              <div className="text-sm text-muted-foreground">
                                {profile.settings.description}
                              </div>
                            )}
                          </div>
                          {profile.settings?.isFavorite && (
                            <Star className="h-4 w-4 fill-current text-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getVisibilityIcon(profile)}
                          <span className="text-sm text-muted-foreground">
                            {profile.isGlobal
                              ? 'Global'
                              : profile.sharedWith && profile.sharedWith.length > 0
                              ? `Shared (${profile.sharedWith.length})`
                              : 'Personal'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {profile.settings?.tags?.map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(
                            profile.lastUpdated || profile.creationTime
                          ).toLocaleDateString()}
                        </span>
                      </TableCell>
                      {showActions && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => handleToggleFavorite(profile, e)}
                                >
                                  {profile.settings?.isFavorite ? (
                                    <Star className="h-4 w-4 fill-current" />
                                  ) : (
                                    <StarOff className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {profile.settings?.isFavorite
                                  ? 'Remove from favorites'
                                  : 'Add to favorites'}
                              </TooltipContent>
                            </Tooltip>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {onEdit && (
                                  <DropdownMenuItem onClick={() => onEdit(profile)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {onDuplicate && (
                                  <DropdownMenuItem onClick={() => onDuplicate(profile)}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplicate
                                  </DropdownMenuItem>
                                )}
                                {onExport && (
                                  <DropdownMenuItem onClick={() => onExport([profile])}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export
                                  </DropdownMenuItem>
                                )}
                                {onDelete && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => onDelete([profile])}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}