import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'

interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  suggestions: string[]
  onSuggestionSelect?: (suggestion: string) => void
  className?: string
  required?: boolean
  minChars?: number
}

export default function AutocompleteInput({
  value,
  onChange,
  placeholder,
  suggestions,
  onSuggestionSelect,
  className,
  required,
  minChars = 2
}: AutocompleteInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Smart filtering: only show suggestions after minimum characters and when focused
  useEffect(() => {
    const hasMinChars = value.length >= minChars
    const shouldShowSuggestions = hasMinChars && isFocused && suggestions.length > 0
    
    if (shouldShowSuggestions) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10) // Limit to top 10 matches
      
      setFilteredSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
      setFilteredSuggestions([])
    }
  }, [value, suggestions, isFocused, minChars])

  // Handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion)
    }
    setShowSuggestions(false)
    inputRef.current?.blur()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const handleInputFocus = () => {
    setIsFocused(true)
  }

  const handleInputBlur = () => {
    // Small delay to allow clicking on suggestions
    setTimeout(() => {
      setIsFocused(false)
      setShowSuggestions(false)
    }, 150)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className={className}
        required={required}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        data-form-type="other"
      />

      {/* Smart dropdown suggestions - only show when focused and has enough characters */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-blue-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          <div className="px-2 py-1 text-xs text-gray-500 border-b border-gray-100 bg-blue-50">
            Previous entries
          </div>
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-100 focus:bg-blue-100 focus:outline-none border-b border-gray-50 last:border-b-0 transition-colors"
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseDown={(e) => e.preventDefault()} // Prevent input blur
            >
              <span className="font-medium text-gray-800">{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
