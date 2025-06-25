/**
 * useAutoSaveWorkspace Hook
 * 
 * Automatically saves the workspace when changes are detected.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store';
import { WorkspaceManager } from '../services/workspace-manager';
import { appStateManager } from '../services/app-state-manager';

export function useAutoSaveWorkspace(enabled: boolean = true, debounceMs: number = 2000) {
  const components = useAppStore(state => state.components);
  const profiles = useAppStore(state => state.profiles);
  const activeProfiles = useAppStore(state => state.activeProfiles);
  const layout = useAppStore(state => state.layout);
  
  // Create a stable reference to track if we should save
  const shouldSave = useRef(false);
  const saveTimer = useRef<NodeJS.Timeout>();
  const hasInitialized = useRef(false);
  
  // Create a debounced save function
  const debouncedSave = useCallback(() => {
    // Clear any existing timer
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    
    // Set a new timer
    saveTimer.current = setTimeout(async () => {
      if (!shouldSave.current || !enabled) return;
      
      // Don't save until initial load is complete
      if (!appStateManager.isInitialLoadComplete) {
        console.log('Skipping auto-save - initial load not complete');
        return;
      }
      
      try {
        await WorkspaceManager.saveToLocalStorage();
        console.log('Auto-saved workspace');
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, debounceMs);
  }, [enabled, debounceMs]);
  
  // Watch for changes
  useEffect(() => {
    // Skip the first few renders to allow workspace to load
    if (!hasInitialized.current) {
      // Wait for components to be loaded before starting auto-save
      if (components.size > 0 || !enabled) {
        hasInitialized.current = true;
        shouldSave.current = true;
      }
      return;
    }
    
    if (enabled && shouldSave.current) {
      debouncedSave();
    }
  }, [components, profiles, activeProfiles, layout, enabled, debouncedSave]);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, []);
  
  return {
    save: () => WorkspaceManager.saveToLocalStorage(),
  };
}