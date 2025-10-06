import { useState, useEffect } from 'react'

/**
 * Custom hook for persisting filter state across page reloads
 * @param key - Unique key for this filter set (e.g., 'logbook-dashboard', 'section-a')
 * @param defaultFilters - Default filter values
 * @returns [filters, setFilters, clearFilters]
 */
export function useFilterPersistence<T extends Record<string, any>>(
  key: string,
  defaultFilters: T
): [T, (filters: T | ((prev: T) => T)) => void, () => void] {
  const storageKey = `psychpath-filters-${key}`
  
  // Initialize state with saved filters or defaults
  const [filters, setFiltersState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Merge with defaults to handle new filter properties
        return { ...defaultFilters, ...parsed }
      }
    } catch (error) {
      console.warn(`Failed to load saved filters for ${key}:`, error)
    }
    return defaultFilters
  })

  // Save to localStorage whenever filters change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters))
    } catch (error) {
      console.warn(`Failed to save filters for ${key}:`, error)
    }
  }, [filters, storageKey])

  // Wrapper function to update filters
  const setFilters = (newFilters: T | ((prev: T) => T)) => {
    setFiltersState(newFilters)
  }

  // Function to clear all filters and reset to defaults
  const clearFilters = () => {
    setFiltersState(defaultFilters)
    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn(`Failed to clear filters for ${key}:`, error)
    }
  }

  return [filters, setFilters, clearFilters]
}

/**
 * Hook for simple filter persistence (single value)
 * @param key - Unique key for this filter
 * @param defaultValue - Default value
 * @returns [value, setValue, clearValue]
 */
export function useSimpleFilterPersistence<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void, () => void] {
  const storageKey = `psychpath-filter-${key}`
  
  const [value, setValueState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.warn(`Failed to load saved filter for ${key}:`, error)
    }
    return defaultValue
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value))
    } catch (error) {
      console.warn(`Failed to save filter for ${key}:`, error)
    }
  }, [value, storageKey])

  const setValue = (newValue: T) => {
    setValueState(newValue)
  }

  const clearValue = () => {
    setValueState(defaultValue)
    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn(`Failed to clear filter for ${key}:`, error)
    }
  }

  return [value, setValue, clearValue]
}
