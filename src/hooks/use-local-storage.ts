
"use client";

import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  // Effect to read from localStorage on mount (client-side only)
  useEffect(() => {
    // Prevent reading localStorage during SSR
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      const value = item ? JSON.parse(item) : initialValue;
      setStoredValue(value);
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      setStoredValue(initialValue); // Fallback to initial value on error
    } finally {
      setIsInitialized(true); // Mark as initialized after first read attempt
    }
  }, [key, initialValue]); // Rerun only if key or initialValue changes (unlikely for key)

   // Effect to update localStorage whenever storedValue changes (client-side only)
  useEffect(() => {
    // Only save to localStorage if initialized and on the client
    if (!isInitialized || typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, storedValue, isInitialized]); // Depend on storedValue and initialization status

  // Return a wrapped version of useState's setter function
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue(prevValue => {
      // Allow value to be a function like useState's setter
      const valueToStore = value instanceof Function ? value(prevValue) : value;
      return valueToStore;
    });
  }, []); // No dependencies needed for the setter wrapper itself

  // Return the state value and the setter function
  // Ensure initialValue is returned until hydration completes
  return [isInitialized ? storedValue : initialValue, setValue];
}

export default useLocalStorage;
