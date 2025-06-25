/**
 * useDebouncedCallback Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedCallback } from '../useDebouncedCallback';

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce function calls', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useDebouncedCallback(callback, 500)
    );

    // Call multiple times
    act(() => {
      result.current('first');
      result.current('second');
      result.current('third');
    });

    // Callback should not be called yet
    expect(callback).not.toHaveBeenCalled();

    // Advance time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should be called once with last arguments
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('third');
  });

  it('should respect maxWait option', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useDebouncedCallback(callback, 500, { maxWait: 1000 })
    );

    // Start calling
    act(() => {
      result.current('first');
    });

    // Keep calling before debounce timeout
    for (let i = 0; i < 5; i++) {
      act(() => {
        vi.advanceTimersByTime(400);
        result.current(`call-${i}`);
      });
    }

    // Should have been called due to maxWait
    expect(callback).toHaveBeenCalled();
  });

  it('should cancel pending calls', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useDebouncedCallback(callback, 500)
    );

    act(() => {
      result.current('test');
      result.current.cancel();
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should flush pending calls', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useDebouncedCallback(callback, 500)
    );

    act(() => {
      result.current('test');
      result.current.flush();
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('test');
  });

  it('should indicate pending state', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useDebouncedCallback(callback, 500)
    );

    expect(result.current.pending()).toBe(false);

    act(() => {
      result.current('test');
    });

    expect(result.current.pending()).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.pending()).toBe(false);
  });

  it('should handle multiple arguments', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useDebouncedCallback(callback, 100)
    );

    act(() => {
      result.current('arg1', 'arg2', { key: 'value' });
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' });
  });

  it('should handle leading option', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useDebouncedCallback(callback, 500, { leading: true })
    );

    act(() => {
      result.current('first');
      result.current('second');
    });

    // With leading, first call should execute immediately
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('first');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Trailing call should also execute
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('second');
  });

  it('should handle trailing false option', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useDebouncedCallback(callback, 500, { 
        leading: true, 
        trailing: false 
      })
    );

    act(() => {
      result.current('first');
      result.current('second');
    });

    // Only leading call
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('first');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // No trailing call
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle function reference changes', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    
    const { result, rerender } = renderHook(
      ({ fn }) => useDebouncedCallback(fn, 500),
      { initialProps: { fn: callback1 } }
    );

    act(() => {
      result.current('test1');
    });

    // Change callback
    rerender({ fn: callback2 });

    act(() => {
      result.current('test2');
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Only new callback should be called
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledWith('test2');
  });
});