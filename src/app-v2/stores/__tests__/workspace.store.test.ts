/**
 * Workspace Store Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useWorkspaceStore,
  useActiveWorkspace,
  useWorkspaceComponent,
  useWorkspaceActions,
  useWorkspaceHasUnsavedChanges,
} from '../workspace.store';
import type { Workspace, WorkspaceComponent } from '../workspace.store';

describe('Workspace Store', () => {
  const mockWorkspace: Workspace = {
    configId: 'workspace-1',
    appId: 'test-app',
    userId: 'test-user',
    componentType: 'Workspace',
    name: 'Test Workspace',
    settings: {},
    createdBy: 'test-user',
    creationTime: Date.now(),
  };

  const mockComponent: WorkspaceComponent = {
    id: 'comp-1',
    type: 'DataGrid',
    configId: 'config-1',
    title: 'Test Grid',
    settings: {},
  };

  beforeEach(() => {
    // Reset store state
    useWorkspaceStore.setState({
      workspaces: new Map(),
      activeWorkspaceId: null,
      components: new Map(),
      layout: null,
      isDirty: false,
      lastSaveTime: null,
      saving: false,
      loading: false,
      error: null,
    });
  });

  describe('Workspace Management', () => {
    it('should create a new workspace', () => {
      const { result } = renderHook(() => useWorkspaceActions());
      
      act(() => {
        const workspace = result.current.createWorkspace({
          name: 'New Workspace',
        });
        
        expect(workspace.name).toBe('New Workspace');
        expect(workspace.configId).toBeDefined();
      });
      
      const store = useWorkspaceStore.getState();
      expect(store.workspaces.size).toBe(1);
    });

    it('should update a workspace', () => {
      // Add initial workspace
      useWorkspaceStore.setState({
        workspaces: new Map([['workspace-1', mockWorkspace]]),
      });
      
      const { result } = renderHook(() => useWorkspaceActions());
      
      act(() => {
        result.current.updateWorkspace('workspace-1', {
          name: 'Updated Workspace',
        });
      });
      
      const store = useWorkspaceStore.getState();
      const workspace = store.workspaces.get('workspace-1');
      expect(workspace?.name).toBe('Updated Workspace');
    });

    it('should delete a workspace', () => {
      // Add initial workspace
      useWorkspaceStore.setState({
        workspaces: new Map([['workspace-1', mockWorkspace]]),
        activeWorkspaceId: 'workspace-1',
      });
      
      const { result } = renderHook(() => useWorkspaceStore());
      
      act(() => {
        result.current.deleteWorkspace('workspace-1');
      });
      
      expect(result.current.workspaces.size).toBe(0);
      expect(result.current.activeWorkspaceId).toBeNull();
    });

    it('should set active workspace', () => {
      // Add workspace
      useWorkspaceStore.setState({
        workspaces: new Map([['workspace-1', mockWorkspace]]),
      });
      
      const { result } = renderHook(() => useWorkspaceStore());
      
      act(() => {
        result.current.setActiveWorkspace('workspace-1');
      });
      
      expect(result.current.activeWorkspaceId).toBe('workspace-1');
    });
  });

  describe('Component Management', () => {
    beforeEach(() => {
      // Set up workspace with active state
      useWorkspaceStore.setState({
        workspaces: new Map([['workspace-1', mockWorkspace]]),
        activeWorkspaceId: 'workspace-1',
      });
    });

    it('should add a component to workspace', () => {
      const { result } = renderHook(() => useWorkspaceActions());
      
      act(() => {
        result.current.addComponent(mockComponent);
      });
      
      const component = useWorkspaceStore.getState().components.get('comp-1');
      expect(component).toEqual(mockComponent);
    });

    it('should update a component', () => {
      // Add component first
      useWorkspaceStore.setState({
        components: new Map([['comp-1', mockComponent]]),
      });
      
      const { result } = renderHook(() => useWorkspaceActions());
      
      act(() => {
        result.current.updateComponent('comp-1', {
          settings: { position: { x: 100, y: 100, width: 500, height: 400 } },
        });
      });
      
      const component = useWorkspaceStore.getState().components.get('comp-1');
      expect(component?.settings?.position?.x).toBe(100);
      expect(component?.settings?.position?.y).toBe(100);
    });

    it('should remove a component', () => {
      // Add component first
      useWorkspaceStore.setState({
        components: new Map([['comp-1', mockComponent]]),
      });
      
      const { result } = renderHook(() => useWorkspaceActions());
      
      act(() => {
        result.current.removeComponent('comp-1');
      });
      
      expect(useWorkspaceStore.getState().components.has('comp-1')).toBe(false);
    });

  });

  describe('Dirty State Management', () => {
    beforeEach(() => {
      useWorkspaceStore.setState({
        workspaces: new Map([['workspace-1', mockWorkspace]]),
        activeWorkspaceId: 'workspace-1',
      });
    });

    it('should mark workspace as dirty', () => {
      const { result } = renderHook(() => useWorkspaceActions());
      
      act(() => {
        result.current.markDirty();
      });
      
      expect(useWorkspaceStore.getState().isDirty).toBe(true);
    });

    it('should clear dirty state', () => {
      // Mark as dirty first
      useWorkspaceStore.setState({
        isDirty: true,
      });
      
      const { result } = renderHook(() => useWorkspaceActions());
      
      act(() => {
        result.current.clearDirty();
      });
      
      expect(useWorkspaceStore.getState().isDirty).toBe(false);
    });
  });

  describe('Selectors', () => {
    it('should select active workspace', () => {
      useWorkspaceStore.setState({
        workspaces: new Map([['workspace-1', mockWorkspace]]),
        activeWorkspaceId: 'workspace-1',
      });
      
      const { result } = renderHook(() => useActiveWorkspace());
      
      expect(result.current).toEqual(mockWorkspace);
    });

    it('should select workspace component', () => {
      useWorkspaceStore.setState({
        components: new Map([['comp-1', mockComponent]]),
        activeWorkspaceId: 'workspace-1',
      });
      
      const { result } = renderHook(() => useWorkspaceComponent('comp-1'));
      
      expect(result.current).toEqual(mockComponent);
    });

    it('should check unsaved changes', () => {
      useWorkspaceStore.setState({
        activeWorkspaceId: 'workspace-1',
        isDirty: true,
      });
      
      const { result } = renderHook(() => useWorkspaceHasUnsavedChanges());
      
      expect(result.current).toBe(true);
    });
  });

  describe('Save Workspace', () => {
    it('should save workspace and gather component settings', async () => {
      const mockComponentWithRef = {
        ...mockComponent,
        isDirty: true,
      };
      
      useWorkspaceStore.setState({
        workspaces: new Map([['workspace-1', mockWorkspace]]),
        activeWorkspaceId: 'workspace-1',
        components: new Map([['comp-1', mockComponentWithRef]]),
        isDirty: true,
      });
      
      const { result } = renderHook(() => useWorkspaceActions());
      
      await act(async () => {
        await result.current.saveWorkspace();
      });
      
      expect(useWorkspaceStore.getState().isDirty).toBe(false);
    });
  });
});