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

export function WorkspaceLoader() {
  console.log('[WorkspaceLoader] Component mounted');
  const { toast } = useToast();
  const { settings } = useSettings();
  const hasLoaded = useRef(false);
  const settingsRef = useRef(settings);
  
  // Update settings ref
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    console.log('[WorkspaceLoader] useEffect running, hasLoaded:', hasLoaded.current);
    // Only load once
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const loadDefaultWorkspace = async () => {
      // Use settings from ref to avoid closure issues
      const currentSettings = settingsRef.current;
      
      // Skip if auto-load is disabled
      if (!currentSettings.autoLoadWorkspace) {
        console.log('Auto-load workspace is disabled');
        appStateManager.setInitialLoadComplete();
        return;
      }
      
      try {
        // Check if there's a saved workspace
        const workspaceExists = localStorage.getItem('workspace-v2');
        console.log('[WorkspaceLoader] Workspace in localStorage:', !!workspaceExists);
        
        if (workspaceExists) {
          console.log('[WorkspaceLoader] Loading saved workspace...');
          const loaded = await WorkspaceManager.loadFromLocalStorage();
          console.log('[WorkspaceLoader] Workspace loaded:', loaded);
          
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
          console.log('No saved workspace found, creating default workspace');
          
          // Add a default data table component
          const { addComponent } = useAppStore.getState();
          addComponent('data-table');
          
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
        console.error('Failed to load default workspace:', error);
        // Don't show error toast on startup to avoid annoying users
        // The app will just start with an empty workspace
      } finally {
        // Mark initial load as complete
        appStateManager.setInitialLoadComplete();
      }
    };

    // Run immediately to test
    console.log('[WorkspaceLoader] Starting workspace load immediately...');
    loadDefaultWorkspace();
  }, []); // Empty deps to ensure it only runs once

  // This component doesn't render anything
  return null;
}