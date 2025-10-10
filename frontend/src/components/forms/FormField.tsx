import React from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface FormFieldProps {
  label: string
  name: string
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'datetime-local' | 'textarea' | 'select'
  value: string | number
  onChange: (value: string | number) => void
  error?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
  className?: string
  options?: Array<{ value: string | number; label: string }>
  rows?: number
  helperText?: string
  autoComplete?: string
  list?: string
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  placeholder,
  disabled = false,
  className,
  options = [],
  rows = 3,
  helperText,
  autoComplete,
  list
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
    onChange(newValue)
  }

  const handleSelectChange = (newValue: string) => {
    onChange(newValue)
  }

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <Textarea
            id={name}
            name={name}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={cn(error && 'border-red-500 focus-visible:ring-red-500')}
          />
        )
      
      case 'select':
        return (
          <Select value={String(value)} onValueChange={handleSelectChange} disabled={disabled}>
            <SelectTrigger className={cn(error && 'border-red-500 focus-visible:ring-red-500')}>
              <SelectValue placeholder={placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      default:
        return (
          <Input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoComplete={autoComplete}
            list={list}
            className={cn(error && 'border-red-500 focus-visible:ring-red-500')}
          />
        )
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {renderInput()}
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}
    </div>
  )
}

