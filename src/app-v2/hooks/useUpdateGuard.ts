/**
 * useUpdateGuard Hook
 * 
 * Prevents update storms and circular updates by tracking update frequency.
 * Useful for preventing infinite loops in complex state management scenarios.
 */

import { useRef, useCallback } from 'react';

export interface UpdateGuardOptions {
  /**
   * Minimum interval between updates in milliseconds
   */
  minInterval?: number;
  /**
   * Maximum number of updates allowed within the interval
   */
  maxUpdates?: number;
  /**
   * Time window for counting updates (milliseconds)
   */
  timeWindow?: number;
  /**
   * Callback when update is blocked
   */
  onBlocked?: (reason: string) => void;
}

export interface UpdateGuardResult {
  /**
   * Check if an update can proceed
   */
  canUpdate: () => boolean;
  /**
   * Reset the guard state
   */
  reset: () => void;
  /**
   * Get current update count
   */
  getUpdateCount: () => number;
  /**
   * Check if currently blocked
   */
  isBlocked: () => boolean;
}

/**
 * Create an update guard to prevent update storms
 * @param options Guard options
 * @returns Update guard methods
 */
export function useUpdateGuard(options: UpdateGuardOptions = {}): UpdateGuardResult {
  const {
    minInterval = 100,
    maxUpdates = 10,
    timeWindow = 1000,
    onBlocked,
  } = options;
  
  const lastUpdateRef = useRef<number>(0);
  const updateCountRef = useRef<number>(0);
  const updateTimestampsRef = useRef<number[]>([]);
  const blockedUntilRef = useRef<number>(0);
  
  // Check if update can proceed
  const canUpdate = useCallback(() => {
    const now = Date.now();
    
    // Check if currently blocked
    if (blockedUntilRef.current > now) {
      onBlocked?.('Currently blocked due to update storm');
      return false;
    }
    
    // Check minimum interval
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    if (timeSinceLastUpdate < minInterval) {
      onBlocked?.(`Update too soon, minimum interval is ${minInterval}ms`);
      return false;
    }
    
    // Clean old timestamps outside the time window
    updateTimestampsRef.current = updateTimestampsRef.current.filter(
      (timestamp) => now - timestamp < timeWindow
    );
    
    // Check update count within time window
    if (updateTimestampsRef.current.length >= maxUpdates) {
      // Block for the remaining time window
      const oldestUpdate = updateTimestampsRef.current[0];
      blockedUntilRef.current = oldestUpdate + timeWindow;
      
      onBlocked?.(
        `Update storm detected: ${maxUpdates} updates within ${timeWindow}ms`
      );
      return false;
    }
    
    // Update allowed
    lastUpdateRef.current = now;
    updateTimestampsRef.current.push(now);
    updateCountRef.current++;
    
    return true;
  }, [minInterval, maxUpdates, timeWindow, onBlocked]);
  
  // Reset guard state
  const reset = useCallback(() => {
    lastUpdateRef.current = 0;
    updateCountRef.current = 0;
    updateTimestampsRef.current = [];
    blockedUntilRef.current = 0;
  }, []);
  
  // Get current update count
  const getUpdateCount = useCallback(() => {
    return updateCountRef.current;
  }, []);
  
  // Check if currently blocked
  const isBlocked = useCallback(() => {
    return blockedUntilRef.current > Date.now();
  }, []);
  
  return {
    canUpdate,
    reset,
    getUpdateCount,
    isBlocked,
  };
}

/**
 * Example usage:
 * 
 * function DataComponent() {
 *   const [data, setData] = useState(null);
 *   const updateGuard = useUpdateGuard({
 *     minInterval: 100,
 *     maxUpdates: 5,
 *     timeWindow: 1000,
 *     onBlocked: (reason) => console.warn('Update blocked:', reason),
 *   });
 *   
 *   const updateData = useCallback((newData) => {
 *     if (!updateGuard.canUpdate()) {
 *       return;
 *     }
 *     
 *     setData(newData);
 *     // Perform expensive operation
 *   }, [updateGuard]);
 *   
 *   // Use updateData safely without worrying about update storms
 *   return (
 *     <div>
 *       {updateGuard.isBlocked() && <div>Updates temporarily blocked</div>}
 *       {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
 *     </div>
 *   );
 * }
 */