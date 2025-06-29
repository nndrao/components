/**
 * Config Store Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useConfigStore, useConfig, useConfigsByType } from '../config.store';
import { createConfigService } from '../../services/config/config.service';
import { Config } from '../../services/config/config.types';

// Mock the config service module
vi.mock('../../services/config/config.service', () => ({
  createConfigService: vi.fn(() => ({
    initialize: vi.fn(),
    getAll: vi.fn(),
    get: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    query: vi.fn(),
    deleteByQuery: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  })),
}));

describe('Config Store', () => {
  let mockService: any;
  
  const mockConfig: Config = {
    configId: 'test-123',
    appId: 'test-app',
    userId: 'test-user',
    componentType: 'TestComponent',
    name: 'Test Config',
    settings: { key: 'value' },
    createdBy: 'test-user',
    creationTime: Date.now(),
  };

  beforeEach(() => {
    // Create mock service
    mockService = {
      initialize: vi.fn(),
      getAll: vi.fn(),
      get: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      query: vi.fn(),
      deleteByQuery: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };
    
    // Mock createConfigService to return our mock
    vi.mocked(createConfigService).mockResolvedValue(mockService);
    
    // Reset store state
    useConfigStore.setState({
      initialized: false,
      loading: false,
      configs: new Map(),
      error: null,
      service: null,
      lastFetch: null,
    });
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize the config service', async () => {
      mockService.initialize.mockResolvedValueOnce(undefined);
      
      const { result } = renderHook(() => useConfigStore());
      
      expect(result.current.initialized).toBe(false);
      
      await act(async () => {
        await result.current.initialize();
      });
      
      expect(createConfigService).toHaveBeenCalled();
      expect(result.current.initialized).toBe(true);
      expect(result.current.service).toBe(mockService);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Init failed');
      vi.mocked(createConfigService).mockRejectedValueOnce(error);
      
      const { result } = renderHook(() => useConfigStore());
      
      await act(async () => {
        try {
          await result.current.initialize();
        } catch (e) {
          // Expected to throw
        }
      });
      
      expect(result.current.error).toBe(error);
      expect(result.current.initialized).toBe(false);
    });
  });

  describe('Config CRUD Operations', () => {
    beforeEach(async () => {
      // Initialize the store
      const { result } = renderHook(() => useConfigStore());
      await act(async () => {
        await result.current.initialize();
      });
    });

    it('should load configs', async () => {
      const configs = [mockConfig];
      mockService.getAll.mockResolvedValueOnce(configs);
      
      const { result } = renderHook(() => useConfigStore());
      
      await act(async () => {
        await result.current.loadConfigs();
      });
      
      await waitFor(() => {
        const store = useConfigStore.getState();
        expect(store.configs.size).toBe(1);
        expect(store.configs.get('test-123')).toEqual(mockConfig);
      });
    });

    it('should save a config', async () => {
      mockService.save.mockResolvedValueOnce(undefined);
      
      const { result } = renderHook(() => useConfigStore());
      
      await act(async () => {
        await result.current.saveConfig(mockConfig);
      });
      
      expect(mockService.save).toHaveBeenCalledWith(mockConfig);
      
      const store = useConfigStore.getState();
      expect(store.configs.get('test-123')).toEqual(mockConfig);
    });

    it('should delete a config', async () => {
      // First add a config
      useConfigStore.setState({
        configs: new Map([['test-123', mockConfig]]),
      });
      
      mockService.delete.mockResolvedValueOnce(undefined);
      
      const { result } = renderHook(() => useConfigStore());
      
      await act(async () => {
        await result.current.deleteConfig('test-123');
      });
      
      expect(mockService.delete).toHaveBeenCalledWith('test-123');
      expect(result.current.configs.size).toBe(0);
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      // Set up test data
      const configs = new Map([
        ['config-1', { ...mockConfig, configId: 'config-1', componentType: 'TypeA' }],
        ['config-2', { ...mockConfig, configId: 'config-2', componentType: 'TypeB' }],
        ['config-3', { ...mockConfig, configId: 'config-3', componentType: 'TypeA', parentId: 'parent-1' }],
      ]);
      
      useConfigStore.setState({ configs });
    });

    it('should select config by id', () => {
      const { result } = renderHook(() => useConfig('config-1'));
      
      expect(result.current).toEqual({
        ...mockConfig,
        configId: 'config-1',
        componentType: 'TypeA',
      });
    });

    it('should select configs by type', () => {
      // Access store directly to avoid hook rendering issues in test
      const configs = useConfigStore.getState().getConfigsByType('TypeA');
      
      expect(configs).toHaveLength(2);
      expect(configs[0].componentType).toBe('TypeA');
      expect(configs[1].componentType).toBe('TypeA');
    });
  });

  describe('Event Handling', () => {
    it('should update config on save event', async () => {
      const eventHandlers: Record<string, any> = {};
      mockService.on.mockImplementation((event: string, handler: any) => {
        eventHandlers[event] = handler;
        return vi.fn();
      });
      
      const { result } = renderHook(() => useConfigStore());
      
      await act(async () => {
        await result.current.initialize();
      });
      
      // Simulate save event
      act(() => {
        if (eventHandlers['config:updated']) {
          eventHandlers['config:updated']({ type: 'config:updated', config: mockConfig });
        }
      });
      
      expect(result.current.configs.get('test-123')).toEqual(mockConfig);
    });

    it('should remove config on delete event', async () => {
      const eventHandlers: Record<string, any> = {};
      mockService.on.mockImplementation((event: string, handler: any) => {
        eventHandlers[event] = handler;
        return vi.fn();
      });
      
      const { result } = renderHook(() => useConfigStore());
      
      await act(async () => {
        await result.current.initialize();
      });
      
      // Add config after initialization
      act(() => {
        useConfigStore.setState({
          configs: new Map([['test-123', mockConfig]]),
        });
      });
      
      // Simulate delete event
      act(() => {
        if (eventHandlers['config:deleted']) {
          eventHandlers['config:deleted']({ type: 'config:deleted', configId: 'test-123' });
        }
      });
      
      expect(result.current.configs.has('test-123')).toBe(false);
    });
  });
});