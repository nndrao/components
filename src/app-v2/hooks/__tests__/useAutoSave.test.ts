/**
 * useAutoSave Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave } from '../useAutoSave';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock window.addEventListener
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should have initial idle state', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => 
      useAutoSave('initial', { onSave })
    );

    expect(result.current.saveState).toBe('idle');
    expect(result.current.lastSaved).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should debounce saves on data changes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { 
        onSave, 
        debounceDelay: 1000 
      }),
      { initialProps: { data: 'initial' } }
    );

    // Change data
    rerender({ data: 'updated' });

    // Should not save immediately
    expect(onSave).not.toHaveBeenCalled();

    // Advance time
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Should have saved
    expect(onSave).toHaveBeenCalledWith('updated');
    expect(result.current.saveState).toBe('saved');
    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('should handle save errors', async () => {
    const error = new Error('Save failed');
    const onSave = vi.fn().mockRejectedValue(error);
    const onSaveError = vi.fn();
    
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { 
        onSave,
        onSaveError,
        debounceDelay: 100,
        interval: 0 // Disable periodic saves
      }),
      { initialProps: { data: 'initial' } }
    );

    // Trigger save
    rerender({ data: 'updated' });

    await act(async () => {
      vi.advanceTimersByTime(100);
      // Wait for the promise to resolve
      await vi.runAllTimersAsync();
    });

    expect(result.current.saveState).toBe('error');
    expect(result.current.error).toBe(error);
    expect(onSaveError).toHaveBeenCalledWith(error);
  });

  it('should perform periodic saves', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ data }) => useAutoSave(data, { 
        onSave,
        interval: 5000,
        debounceDelay: 100
      }),
      { initialProps: { data: 'initial' } }
    );

    // Change data to trigger first save
    rerender({ data: 'updated' });
    
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(onSave).toHaveBeenCalledTimes(1);

    // Advance to interval
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // Should not save again if data hasn't changed
    expect(onSave).toHaveBeenCalledTimes(1);

    // Change data
    rerender({ data: 'updated again' });

    // Wait for interval
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // Should save due to interval
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it('should handle manual save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { 
        onSave,
        debounceDelay: 5000, // Long delay
        interval: 0 // Disable periodic saves
      }),
      { initialProps: { data: 'initial' } }
    );

    // Change data to trigger a save
    rerender({ data: 'updated' });

    // Manual save should cancel the debounce and save immediately
    await act(async () => {
      await result.current.save();
    });

    expect(onSave).toHaveBeenCalledWith('updated');
    expect(result.current.saveState).toBe('saved');
  });

  it('should cancel pending saves', () => {
    const onSave = vi.fn();
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { onSave }),
      { initialProps: { data: 'initial' } }
    );

    // Trigger save
    rerender({ data: 'updated' });
    expect(result.current.isPending()).toBe(true);

    // Cancel
    act(() => {
      result.current.cancel();
    });

    expect(result.current.isPending()).toBe(false);

    // Advance time
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should not have saved
    expect(onSave).not.toHaveBeenCalled();
  });

  it('should reset state', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { 
        onSave,
        debounceDelay: 100
      }),
      { initialProps: { data: 'initial' } }
    );

    // Trigger save
    rerender({ data: 'updated' });
    
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.saveState).toBe('saved');

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.saveState).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('should handle beforeunload event', () => {
    const onSave = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ data }) => useAutoSave(data, { onSave }),
      { initialProps: { data: 'initial' } }
    );

    // Change data
    rerender({ data: 'updated' });

    // Simulate beforeunload
    const event = new Event('beforeunload') as BeforeUnloadEvent;
    const preventDefault = vi.spyOn(event, 'preventDefault');
    
    window.dispatchEvent(event);

    expect(preventDefault).toHaveBeenCalled();

    // Cleanup
    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    );
  });

  it('should not save when disabled', () => {
    const onSave = vi.fn();
    const { rerender } = renderHook(
      ({ data }) => useAutoSave(data, { 
        onSave,
        enabled: false,
        debounceDelay: 100
      }),
      { initialProps: { data: 'initial' } }
    );

    // Change data
    rerender({ data: 'updated' });

    // Advance time
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('should use custom isEqual function', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const isEqual = vi.fn((a, b) => a.id === b.id);
    
    const { rerender } = renderHook(
      ({ data }) => useAutoSave(data, { 
        onSave,
        isEqual,
        debounceDelay: 100
      }),
      { initialProps: { data: { id: 1, value: 'a' } } }
    );

    // Change data but same id
    rerender({ data: { id: 1, value: 'b' } });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Should not save because isEqual returned true
    expect(onSave).not.toHaveBeenCalled();
    expect(isEqual).toHaveBeenCalled();

    // Change id
    rerender({ data: { id: 2, value: 'b' } });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Now should save
    expect(onSave).toHaveBeenCalledWith({ id: 2, value: 'b' });
  });

  it('should handle save callbacks', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onSaveStart = vi.fn();
    const onSaveComplete = vi.fn();
    
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { 
        onSave,
        onSaveStart,
        onSaveComplete,
        debounceDelay: 100,
        interval: 0 // Disable periodic saves
      }),
      { initialProps: { data: 'initial' } }
    );

    // Trigger save
    rerender({ data: 'updated' });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // Wait for save to complete
    await vi.waitFor(() => {
      expect(onSaveStart).toHaveBeenCalled();
      expect(onSaveComplete).toHaveBeenCalled();
    });
    
    // Check state immediately after save
    expect(result.current.saveState).toBe('saved');
  });
});