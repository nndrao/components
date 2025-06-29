/**
 * useUpdateGuard Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUpdateGuard } from '../useUpdateGuard';

describe('useUpdateGuard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow initial update', () => {
    const { result } = renderHook(() => useUpdateGuard());
    
    expect(result.current.canUpdate()).toBe(true);
    expect(result.current.getUpdateCount()).toBe(1);
  });

  it('should block updates within minimum interval', () => {
    const onBlocked = vi.fn();
    const { result } = renderHook(() => 
      useUpdateGuard({ minInterval: 100, onBlocked })
    );

    // First update should pass
    expect(result.current.canUpdate()).toBe(true);

    // Immediate second update should be blocked
    expect(result.current.canUpdate()).toBe(false);
    expect(onBlocked).toHaveBeenCalledWith(
      'Update too soon, minimum interval is 100ms'
    );
  });

  it('should allow update after minimum interval', () => {
    const { result } = renderHook(() => 
      useUpdateGuard({ minInterval: 100 })
    );

    // First update
    result.current.canUpdate();

    // Advance time
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Should allow update now
    expect(result.current.canUpdate()).toBe(true);
  });

  it('should detect update storms', () => {
    const onBlocked = vi.fn();
    const { result } = renderHook(() => 
      useUpdateGuard({
        minInterval: 10,
        maxUpdates: 3,
        timeWindow: 1000,
        onBlocked,
      })
    );

    // Perform rapid updates
    for (let i = 0; i < 3; i++) {
      act(() => {
        vi.advanceTimersByTime(10);
      });
      expect(result.current.canUpdate()).toBe(true);
    }

    // Next update should be blocked
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(result.current.canUpdate()).toBe(false);
    expect(onBlocked).toHaveBeenCalledWith(
      'Update storm detected: 3 updates within 1000ms'
    );
  });

  it('should reset guard state', () => {
    const { result } = renderHook(() => 
      useUpdateGuard({ minInterval: 100 })
    );

    // Make some updates
    result.current.canUpdate();
    result.current.canUpdate(); // This should be blocked

    // Reset
    act(() => {
      result.current.reset();
    });

    // Should allow update again
    expect(result.current.canUpdate()).toBe(true);
    expect(result.current.getUpdateCount()).toBe(1);
  });

  it('should track blocked state', () => {
    const { result } = renderHook(() => 
      useUpdateGuard({
        minInterval: 10,
        maxUpdates: 2,
        timeWindow: 1000,
      })
    );

    expect(result.current.isBlocked()).toBe(false);

    // Trigger update storm
    result.current.canUpdate();
    act(() => {
      vi.advanceTimersByTime(10);
    });
    result.current.canUpdate();
    act(() => {
      vi.advanceTimersByTime(10);
    });
    result.current.canUpdate(); // This triggers blocking

    expect(result.current.isBlocked()).toBe(true);

    // Should unblock after time window
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isBlocked()).toBe(false);
  });

  it('should clean old timestamps', () => {
    const { result } = renderHook(() => 
      useUpdateGuard({
        minInterval: 10,
        maxUpdates: 3,
        timeWindow: 1000,
      })
    );

    // Make updates spread over time
    result.current.canUpdate();
    
    act(() => {
      vi.advanceTimersByTime(500);
    });
    result.current.canUpdate();
    
    act(() => {
      vi.advanceTimersByTime(600); // Total: 1100ms
    });
    
    // Old timestamp should be cleaned, allowing this update
    expect(result.current.canUpdate()).toBe(true);
    
    // One more should still work
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(result.current.canUpdate()).toBe(true);
  });

  it('should count total updates', () => {
    const { result } = renderHook(() => 
      useUpdateGuard({ minInterval: 50 })
    );

    expect(result.current.getUpdateCount()).toBe(0);

    for (let i = 0; i < 5; i++) {
      act(() => {
        vi.advanceTimersByTime(50);
      });
      result.current.canUpdate();
    }

    expect(result.current.getUpdateCount()).toBe(5);
  });
});