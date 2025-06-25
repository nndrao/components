/**
 * useDebouncedCallback Hook
 * 
 * Creates a debounced version of a callback function.
 * Includes support for maximum wait time and cancellation.
 */

import { useCallback, useRef, useEffect } from 'react';

export interface DebouncedOptions {
  /**
   * Maximum time to wait before forcing execution
   */
  maxWait?: number;
  /**
   * Execute on the leading edge instead of trailing
   */
  leading?: boolean;
  /**
   * Execute on the trailing edge
   */
  trailing?: boolean;
}

export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
  pending: () => boolean;
}

/**
 * Create a debounced callback
 * @param callback The callback to debounce
 * @param delay The delay in milliseconds
 * @param options Additional options
 * @returns The debounced function with cancel and flush methods
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: DebouncedOptions = {}
): DebouncedFunction<T> {
  const { maxWait, leading = false, trailing = true } = options;
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallTimeRef = useRef<number | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);
  const leadingCalledRef = useRef(false);
  
  // Cancel any pending executions
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
    lastCallTimeRef.current = null;
    lastArgsRef.current = null;
    leadingCalledRef.current = false;
  }, []);
  
  // Execute immediately
  const flush = useCallback(() => {
    if (timeoutRef.current && lastArgsRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      callback(...lastArgsRef.current);
      lastArgsRef.current = null;
    }
  }, [callback]);
  
  // Check if there's a pending execution
  const pending = useCallback(() => {
    return timeoutRef.current !== null;
  }, []);
  
  // The debounced function
  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      lastArgsRef.current = args;
      
      // Handle leading edge
      if (leading && !timeoutRef.current && !leadingCalledRef.current) {
        callback(...args);
        leadingCalledRef.current = true;
      }
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set up trailing edge execution
      if (trailing) {
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          timeoutRef.current = null;
          lastCallTimeRef.current = null;
          lastArgsRef.current = null;
          leadingCalledRef.current = false;
          
          // Clear max timeout if it exists
          if (maxTimeoutRef.current) {
            clearTimeout(maxTimeoutRef.current);
            maxTimeoutRef.current = null;
          }
        }, delay);
      }
      
      // Set up max wait timeout
      if (maxWait && !maxTimeoutRef.current) {
        const timeElapsed = lastCallTimeRef.current ? now - lastCallTimeRef.current : 0;
        const timeToWait = Math.max(0, maxWait - timeElapsed);
        
        maxTimeoutRef.current = setTimeout(() => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          if (lastArgsRef.current) {
            callback(...lastArgsRef.current);
          }
          maxTimeoutRef.current = null;
          lastCallTimeRef.current = null;
          lastArgsRef.current = null;
          leadingCalledRef.current = false;
        }, timeToWait);
      }
      
      lastCallTimeRef.current = lastCallTimeRef.current || now;
    },
    [callback, delay, maxWait, leading, trailing]
  );
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);
  
  // Create the enhanced function
  const enhancedFunction = debouncedCallback as DebouncedFunction<T>;
  enhancedFunction.cancel = cancel;
  enhancedFunction.flush = flush;
  enhancedFunction.pending = pending;
  
  return enhancedFunction;
}

/**
 * Example usage:
 * 
 * function AutoSaveComponent() {
 *   const [content, setContent] = useState('');
 *   
 *   const saveContent = useCallback((text: string) => {
 *     console.log('Saving:', text);
 *     // API call to save
 *   }, []);
 *   
 *   const debouncedSave = useDebouncedCallback(saveContent, 1000, {
 *     maxWait: 5000, // Force save after 5 seconds
 *   });
 *   
 *   const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
 *     const text = e.target.value;
 *     setContent(text);
 *     debouncedSave(text);
 *   };
 *   
 *   const handleSaveNow = () => {
 *     debouncedSave.flush();
 *   };
 *   
 *   return (
 *     <div>
 *       <textarea value={content} onChange={handleChange} />
 *       <button onClick={handleSaveNow}>Save Now</button>
 *       {debouncedSave.pending() && <span>Saving...</span>}
 *     </div>
 *   );
 * }
 */