/**
 * WorkspaceLoader Component
 * 
 * Handles automatic loading of the default workspace on app startup.
 */

import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { WorkspaceManager } from '../../services/workspace-manager';
import { useAppStore } from '../../store';
import { useSettings } from '../../contexts/SettingsContext';
import { appStateManager } from '../../services/app-state-manager';
import { ComponentType } from '../../types';

export function WorkspaceLoader() {
  const { toast } = useToast();
  const { settings } = useSettings();
  const hasLoaded = useRef(false);
  const settingsRef = useRef(settings);
  
  // Update settings ref
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    // Only load once
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const loadDefaultWorkspace = async () => {
      // Use settings from ref to avoid closure issues
      const currentSettings = settingsRef.current;
      
      // Skip if auto-load is disabled
      if (!currentSettings.autoLoadWorkspace) {
        appStateManager.setInitialLoadComplete();
        return;
      }
      
      try {
        // Check if there's a saved workspace
        const workspaceExists = localStorage.getItem('workspace-v2');
        
        if (workspaceExists) {
          const loaded = await WorkspaceManager.loadFromLocalStorage();
          
          if (loaded) {
            // Show a subtle notification
            toast({
              title: "Workspace Restored",
              description: "Your previous workspace has been loaded",
              duration: 3000,
            });
          }
        } else {
          // No saved workspace, create a default one with a data table
          
          // Add a default data table component
          const { addComponent } = useAppStore.getState();
          addComponent(ComponentType.DataTable);
          
          // Show welcome message if enabled
          if (currentSettings.showWelcomeMessage) {
            toast({
              title: "Welcome!",
              description: "A default data table has been created for you",
              duration: 4000,
            });
          }
        }
      } catch (error) {
        // Don't show error toast on startup to avoid annoying users
        // The app will just start with an empty workspace
      } finally {
        // Mark initial load as complete
        appStateManager.setInitialLoadComplete();
      }
    };

    // Run immediately
    loadDefaultWorkspace();
  }, []); // Empty deps to ensure it only runs once

  // This component doesn't render anything
  return null;
}