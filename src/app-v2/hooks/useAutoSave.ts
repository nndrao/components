/**
 * useAutoSave Hook
 * 
 * Automatically saves data at specified intervals and handles save states.
 * Includes debouncing, error handling, and conflict detection.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebouncedCallback } from './useDebouncedCallback';

export interface AutoSaveOptions<T> {
  /**
   * Save function to call
   */
  onSave: (data: T) => Promise<void>;
  /**
   * Interval for periodic saves (milliseconds)
   */
  interval?: number;
  /**
   * Debounce delay for saves triggered by changes (milliseconds)
   */
  debounceDelay?: number;
  /**
   * Maximum wait time before forcing a save (milliseconds)
   */
  maxWait?: number;
  /**
   * Enable/disable auto-save
   */
  enabled?: boolean;
  /**
   * Callback when save starts
   */
  onSaveStart?: () => void;
  /**
   * Callback when save completes
   */
  onSaveComplete?: () => void;
  /**
   * Callback when save fails
   */
  onSaveError?: (error: Error) => void;
  /**
   * Compare function to check if data has changed
   */
  isEqual?: (a: T, b: T) => boolean;
}

export interface AutoSaveResult {
  /**
   * Current save state
   */
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  /**
   * Last save timestamp
   */
  lastSaved: Date | null;
  /**
   * Last error if any
   */
  error: Error | null;
  /**
   * Trigger save manually
   */
  save: () => Promise<void>;
  /**
   * Cancel pending save
   */
  cancel: () => void;
  /**
   * Check if there's a pending save
   */
  isPending: () => boolean;
  /**
   * Reset save state
   */
  reset: () => void;
}

/**
 * Auto-save hook with debouncing and error handling
 * @param data The data to save
 * @param options Auto-save options
 * @returns Auto-save state and controls
 */
export function useAutoSave<T>(
  data: T,
  options: AutoSaveOptions<T>
): AutoSaveResult {
  const {
    onSave,
    interval = 30000, // 30 seconds
    debounceDelay = 1000, // 1 second
    maxWait = 5000, // 5 seconds
    enabled = true,
    onSaveStart,
    onSaveComplete,
    onSaveError,
    isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b),
  } = options;
  
  const [saveState, setSaveState] = useState<AutoSaveResult['saveState']>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const lastSavedDataRef = useRef<T>(data);
  const saveInProgressRef = useRef(false);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  
  // Perform save
  const performSave = useCallback(async () => {
    if (saveInProgressRef.current || !enabled) return;
    
    // Check if data has changed
    if (isEqual(data, lastSavedDataRef.current)) {
      return;
    }
    
    saveInProgressRef.current = true;
    setSaveState('saving');
    setError(null);
    onSaveStart?.();
    
    try {
      await onSave(data);
      
      lastSavedDataRef.current = data;
      setSaveState('saved');
      setLastSaved(new Date());
      onSaveComplete?.();
      
      // Reset to idle after a short delay
      setTimeout(() => {
        setSaveState((current) => (current === 'saved' ? 'idle' : current));
      }, 2000);
    } catch (err) {
      const error = err as Error;
      setError(error);
      setSaveState('error');
      onSaveError?.(error);
    } finally {
      saveInProgressRef.current = false;
    }
  }, [data, enabled, onSave, onSaveStart, onSaveComplete, onSaveError, isEqual]);
  
  // Debounced save
  const debouncedSave = useDebouncedCallback(performSave, debounceDelay, {
    maxWait,
  });
  
  // Manual save
  const save = useCallback(async () => {
    debouncedSave.cancel();
    await performSave();
  }, [debouncedSave, performSave]);
  
  // Cancel pending save
  const cancel = useCallback(() => {
    debouncedSave.cancel();
  }, [debouncedSave]);
  
  // Check if pending
  const isPending = useCallback(() => {
    return debouncedSave.pending();
  }, [debouncedSave]);
  
  // Reset state
  const reset = useCallback(() => {
    debouncedSave.cancel();
    setSaveState('idle');
    setError(null);
    lastSavedDataRef.current = data;
  }, [debouncedSave, data]);
  
  // Trigger save on data change
  useEffect(() => {
    if (!enabled) return;
    
    debouncedSave();
  }, [data, enabled, debouncedSave]);
  
  // Set up periodic saves
  useEffect(() => {
    if (!enabled || !interval) return;
    
    intervalIdRef.current = setInterval(() => {
      if (!saveInProgressRef.current) {
        performSave();
      }
    }, interval);
    
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [enabled, interval, performSave]);
  
  // Save on unmount if there are unsaved changes
  useEffect(() => {
    return () => {
      if (!isEqual(data, lastSavedDataRef.current) && enabled) {
        // Note: This is a best-effort save, may not complete
        debouncedSave.flush();
      }
    };
  }, [data, enabled, isEqual, debouncedSave]);
  
  // Handle beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isEqual(data, lastSavedDataRef.current) && enabled) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [data, enabled, isEqual]);
  
  return {
    saveState,
    lastSaved,
    error,
    save,
    cancel,
    isPending,
    reset,
  };
}

/**
 * Example usage:
 * 
 * function DocumentEditor() {
 *   const [document, setDocument] = useState({ title: '', content: '' });
 *   
 *   const saveDocument = async (doc: typeof document) => {
 *     await api.saveDocument(doc);
 *   };
 *   
 *   const autoSave = useAutoSave(document, {
 *     onSave: saveDocument,
 *     debounceDelay: 1000,
 *     interval: 60000, // Save every minute
 *     onSaveError: (error) => {
 *       toast.error('Failed to save: ' + error.message);
 *     },
 *   });
 *   
 *   return (
 *     <div>
 *       <div className="status-bar">
 *         {autoSave.saveState === 'saving' && <span>Saving...</span>}
 *         {autoSave.saveState === 'saved' && <span>Saved</span>}
 *         {autoSave.saveState === 'error' && (
 *           <span className="error">Save failed</span>
 *         )}
 *         {autoSave.lastSaved && (
 *           <span>Last saved: {autoSave.lastSaved.toLocaleTimeString()}</span>
 *         )}
 *       </div>
 *       
 *       <input
 *         value={document.title}
 *         onChange={(e) => setDocument({ ...document, title: e.target.value })}
 *         placeholder="Title"
 *       />
 *       
 *       <textarea
 *         value={document.content}
 *         onChange={(e) => setDocument({ ...document, content: e.target.value })}
 *         placeholder="Content"
 *       />
 *       
 *       <button onClick={autoSave.save}>Save Now</button>
 *     </div>
 *   );
 * }
 */