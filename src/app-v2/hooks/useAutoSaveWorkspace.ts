/**
 * useAutoSaveWorkspace Hook
 * 
 * Automatically saves the workspace when changes are detected.
 * Uses the generic useAutoSave hook for debouncing and state management.
 */

import { useMemo } from 'react';
import { useAppStore } from '../store';
import { WorkspaceManager } from '../services/workspace-manager';
import { appStateManager } from '../services/app-state-manager';
import { useAutoSave } from './useAutoSave';

export function useAutoSaveWorkspace(enabled: boolean = true, debounceMs: number = 2000) {
  const components = useAppStore(state => state.components);
  const profiles = useAppStore(state => state.profiles);
  const activeProfiles = useAppStore(state => state.activeProfiles);
  const layout = useAppStore(state => state.layout);
  
  // Create workspace data object
  const workspaceData = useMemo(() => ({
    components: Array.from(components.values()),
    profiles: Array.from(profiles.values()),
    activeProfiles: Array.from(activeProfiles.entries()),
    layout
  }), [components, profiles, activeProfiles, layout]);
  
  // Save function
  const saveWorkspace = async () => {
    // Don't save until initial load is complete
    if (!appStateManager.isInitialLoadComplete) {
      return;
    }
    
    await WorkspaceManager.saveToLocalStorage();
  };
  
  // Use the generic auto-save hook
  const autoSave = useAutoSave(workspaceData, {
    onSave: saveWorkspace,
    debounceDelay: debounceMs,
    enabled: enabled && appStateManager.isInitialLoadComplete,
    interval: 0, // Disable periodic saves, only save on changes
  });
  
  return {
    save: autoSave.save,
    saveState: autoSave.saveState,
    lastSaved: autoSave.lastSaved,
    error: autoSave.error
  };
}