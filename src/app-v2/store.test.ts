import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './store';

describe('AppStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      components: new Map(),
      profiles: new Map(),
      activeProfiles: new Map(),
      layout: null,
      isClearing: false,
    });
  });

  describe('Component Management', () => {
    it('should add a new component', () => {
      const id = useAppStore.getState().addComponent('data-table');
      
      expect(id).toBeTruthy();
      
      const state = useAppStore.getState();
      expect(state.components.get(id)).toBeDefined();
      expect(state.components.get(id)?.type).toBe('data-table');
    });

    it('should remove a component', () => {
      const id = useAppStore.getState().addComponent('data-table');
      
      useAppStore.getState().removeComponent(id);
      
      const state = useAppStore.getState();
      expect(state.components.get(id)).toBeUndefined();
      expect(state.profiles.get(id)).toBeUndefined();
      expect(state.activeProfiles.get(id)).toBeUndefined();
    });

    it('should update a component', () => {
      const id = useAppStore.getState().addComponent('data-table');
      
      useAppStore.getState().updateComponent(id, { title: 'Updated Title' });
      
      const state = useAppStore.getState();
      expect(state.components.get(id)?.title).toBe('Updated Title');
    });
  });

  describe('Profile Management', () => {
    it('should create a default profile when adding a component', () => {
      const id = useAppStore.getState().addComponent('data-table');
      
      const state = useAppStore.getState();
      const profiles = state.profiles.get(id);
      expect(profiles).toBeDefined();
      expect(profiles?.length).toBe(1);
      expect(profiles?.[0].name).toBe('Default');
    });

    it('should create a new profile', () => {
      const id = useAppStore.getState().addComponent('data-table');
      
      useAppStore.getState().createProfile(id, 'Custom Profile');
      
      const state = useAppStore.getState();
      const profiles = state.profiles.get(id);
      expect(profiles?.length).toBe(2);
      expect(profiles?.[1].name).toBe('Custom Profile');
    });

    it('should switch active profile', () => {
      const id = useAppStore.getState().addComponent('data-table');
      useAppStore.getState().createProfile(id, 'Custom Profile');
      
      const state = useAppStore.getState();
      const profiles = state.profiles.get(id);
      const customProfileId = profiles?.[1].id;
      
      useAppStore.getState().switchProfile(id, customProfileId!);
      
      const newState = useAppStore.getState();
      expect(newState.activeProfiles.get(id)).toBe(customProfileId);
    });

    it('should not delete the last profile', () => {
      const id = useAppStore.getState().addComponent('data-table');
      
      const state = useAppStore.getState();
      const profiles = state.profiles.get(id);
      const defaultProfileId = profiles?.[0].id;
      
      useAppStore.getState().deleteProfile(id, defaultProfileId!);
      
      // Should still have the profile
      const newState = useAppStore.getState();
      expect(newState.profiles.get(id)?.length).toBe(1);
    });
  });

  describe('Workspace Operations', () => {
    it('should save workspace data', () => {
      useAppStore.getState().addComponent('data-table');
      
      const data = useAppStore.getState().saveWorkspace();
      
      expect(data.version).toBe('1.0');
      expect(data.components.length).toBe(1);
      expect(data.profiles.length).toBe(1);
      expect(data.activeProfiles.length).toBe(1);
    });

    it('should load workspace data', () => {
      useAppStore.getState().addComponent('data-table');
      const savedData = useAppStore.getState().saveWorkspace();
      
      // Clear and reload
      useAppStore.getState().clearWorkspace();
      useAppStore.getState().loadWorkspace(savedData);
      
      const state = useAppStore.getState();
      expect(state.components.size).toBe(1);
      expect(state.profiles.size).toBe(1);
      expect(state.activeProfiles.size).toBe(1);
    });

    it('should clear workspace', () => {
      useAppStore.getState().addComponent('data-table');
      
      useAppStore.getState().clearWorkspace();
      
      const state = useAppStore.getState();
      expect(state.components.size).toBe(0);
      expect(state.profiles.size).toBe(0);
      expect(state.activeProfiles.size).toBe(0);
      expect(state.layout).toBeNull();
    });
  });
});