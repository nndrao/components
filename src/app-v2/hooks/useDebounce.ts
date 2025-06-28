/**
 * useDebounce Hook
 * 
 * Simple wrapper around useDebouncedCallback for debouncing values.
 */

import { useState, useEffect } from 'react';
import { useDebouncedCallback } from './useDebouncedCallback';

/**
 * Debounce a value
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  const debouncedSetValue = useDebouncedCallback(
    (newValue: T) => setDebouncedValue(newValue),
    delay
  );
  
  useEffect(() => {
    debouncedSetValue(value);
  }, [value, debouncedSetValue]);
  
  return debouncedValue;
}