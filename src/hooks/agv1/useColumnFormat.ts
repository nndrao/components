import { useState, useEffect, useCallback } from 'react';
import { useServices } from '@/components/agv1/providers/ServicesProvider';
import type { ColumnFormat } from '@/types/agv1/common.types';
import type { ColumnFormatConfig, FormatProfile } from '@/services/agv1/ColumnFormatService';

export function useColumnFormat() {
  const { columnFormatService } = useServices();
  const [formats, setFormats] = useState<ColumnFormatConfig>({});
  const [profiles, setProfiles] = useState<FormatProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<FormatProfile | undefined>();

  // Load initial data
  useEffect(() => {
    if (columnFormatService) {
      setFormats(columnFormatService.getAllFormats());
      setProfiles(columnFormatService.getProfiles());
      
      const defaultProfile = columnFormatService.getDefaultProfile();
      if (defaultProfile) {
        setCurrentProfile(defaultProfile);
      }
    }
  }, [columnFormatService]);

  // Get format for a specific column
  const getColumnFormat = useCallback((columnId: string): ColumnFormat | undefined => {
    return formats[columnId];
  }, [formats]);

  // Set format for a specific column
  const setColumnFormat = useCallback((columnId: string, format: ColumnFormat) => {
    if (columnFormatService) {
      columnFormatService.setColumnFormat(columnId, format);
      setFormats(columnFormatService.getAllFormats());
    }
  }, [columnFormatService]);

  // Remove format for a specific column
  const removeColumnFormat = useCallback((columnId: string) => {
    if (columnFormatService) {
      columnFormatService.removeColumnFormat(columnId);
      setFormats(columnFormatService.getAllFormats());
    }
  }, [columnFormatService]);

  // Clear all formats
  const clearAllFormats = useCallback(() => {
    if (columnFormatService) {
      columnFormatService.clearAllFormats();
      setFormats({});
    }
  }, [columnFormatService]);

  // Create a new profile
  const createProfile = useCallback((name: string, description?: string) => {
    if (columnFormatService) {
      const profile = columnFormatService.createProfile(name, description);
      setProfiles(columnFormatService.getProfiles());
      return profile;
    }
  }, [columnFormatService]);

  // Apply a profile
  const applyProfile = useCallback((profileId: string) => {
    if (columnFormatService) {
      columnFormatService.applyProfile(profileId);
      setFormats(columnFormatService.getAllFormats());
      setCurrentProfile(columnFormatService.getProfile(profileId));
    }
  }, [columnFormatService]);

  // Update a profile
  const updateProfile = useCallback((profileId: string, updates: Partial<FormatProfile>) => {
    if (columnFormatService) {
      columnFormatService.updateProfile(profileId, updates);
      setProfiles(columnFormatService.getProfiles());
      
      if (currentProfile?.id === profileId) {
        setCurrentProfile(columnFormatService.getProfile(profileId));
      }
    }
  }, [columnFormatService, currentProfile]);

  // Delete a profile
  const deleteProfile = useCallback((profileId: string) => {
    if (columnFormatService) {
      columnFormatService.deleteProfile(profileId);
      setProfiles(columnFormatService.getProfiles());
      
      if (currentProfile?.id === profileId) {
        setCurrentProfile(undefined);
      }
    }
  }, [columnFormatService, currentProfile]);

  // Set default profile
  const setDefaultProfile = useCallback((profileId: string) => {
    if (columnFormatService) {
      columnFormatService.setDefaultProfile(profileId);
      setProfiles(columnFormatService.getProfiles());
    }
  }, [columnFormatService]);

  // Export formats
  const exportFormats = useCallback((): string => {
    if (columnFormatService) {
      return columnFormatService.exportFormats();
    }
    return '{}';
  }, [columnFormatService]);

  // Import formats
  const importFormats = useCallback((jsonString: string) => {
    if (columnFormatService) {
      columnFormatService.importFormats(jsonString);
      setFormats(columnFormatService.getAllFormats());
      setProfiles(columnFormatService.getProfiles());
    }
  }, [columnFormatService]);

  // Export a single profile
  const exportProfile = useCallback((profileId: string): string => {
    if (columnFormatService) {
      return columnFormatService.exportProfile(profileId);
    }
    return '{}';
  }, [columnFormatService]);

  // Import a single profile
  const importProfile = useCallback((jsonString: string) => {
    if (columnFormatService) {
      const profile = columnFormatService.importProfile(jsonString);
      setProfiles(columnFormatService.getProfiles());
      return profile;
    }
  }, [columnFormatService]);

  return {
    formats,
    profiles,
    currentProfile,
    getColumnFormat,
    setColumnFormat,
    removeColumnFormat,
    clearAllFormats,
    createProfile,
    applyProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,
    exportFormats,
    importFormats,
    exportProfile,
    importProfile,
  };
}