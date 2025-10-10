import React, { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export interface FormError {
  [key: string]: string
}

export interface FormProps<T> {
  onSubmit: (data: T) => void | Promise<void>
  validate?: (data: T) => FormError
  initialValues: T
  children: (props: {
    values: T
    errors: FormError
    handleChange: (name: keyof T, value: any) => void
    isSubmitting: boolean
  }) => React.ReactNode
  submitLabel?: string
  cancelLabel?: string
  onCancel?: () => void
  className?: string
  showGeneralError?: boolean
}

export function Form<T extends Record<string, any>>({
  onSubmit,
  validate,
  initialValues,
  children,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  onCancel,
  className = '',
  showGeneralError = true
}: FormProps<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<FormError>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generalError, setGeneralError] = useState<string>('')

  const handleChange = (name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }))
    // Clear error for this field when user starts typing
    if (errors[name as string]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name as string]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setGeneralError('')

    // Run validation if provided
    if (validate) {
      const validationErrors = validate(values)
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors)
        return
      }
    }

    setIsSubmitting(true)
    try {
      await onSubmit(values)
    } catch (error: any) {
      setGeneralError(error.message || 'An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {showGeneralError && generalError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-red-700 font-medium">{generalError}</span>
        </div>
      )}
      
      {children({ values, errors, handleChange, isSubmitting })}
      
      <div className="flex items-center justify-between gap-3 mt-6">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel}
          </Button>
        )}
      </div>
    </form>
  )
}

