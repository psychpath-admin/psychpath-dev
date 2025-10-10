import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2 } from 'lucide-react'

export interface BaseModalProps {
  trigger?: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  showFooter?: boolean
  submitLabel?: string
  cancelLabel?: string
  onSubmit?: () => void | Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
  error?: string
  icon?: React.ReactNode
  className?: string
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl'
}

export const BaseModal: React.FC<BaseModalProps> = ({
  trigger,
  title,
  description,
  children,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
  size = 'lg',
  showFooter = false,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
  icon,
  className = ''
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const setIsOpen = controlledOnOpenChange || setInternalIsOpen

  const handleSubmit = async () => {
    if (onSubmit) {
      await onSubmit()
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      setIsOpen(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      
      <DialogContent className={`${sizeClasses[size]} max-h-[90vh] overflow-y-auto ${className}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <div className="py-4">
          {children}
        </div>

        {showFooter && (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {cancelLabel}
            </Button>
            {onSubmit && (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Submitting...' : submitLabel}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

