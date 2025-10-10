import React from 'react'
import { BaseModal } from './BaseModal'
import { AlertTriangle, CheckCircle, Info } from 'lucide-react'

export interface ConfirmModalProps {
  trigger?: React.ReactNode
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description: string
  message?: string
  variant?: 'warning' | 'danger' | 'success' | 'info'
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

const variantConfig = {
  warning: {
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    className: 'border-amber-200'
  },
  danger: {
    icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
    className: 'border-red-200'
  },
  success: {
    icon: <CheckCircle className="h-5 w-5 text-green-600" />,
    className: 'border-green-200'
  },
  info: {
    icon: <Info className="h-5 w-5 text-blue-600" />,
    className: 'border-blue-200'
  }
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  trigger,
  isOpen,
  onOpenChange,
  title,
  description,
  message,
  variant = 'info',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  const config = variantConfig[variant]

  return (
    <BaseModal
      trigger={trigger}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      icon={config.icon}
      size="sm"
      showFooter
      submitLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onSubmit={onConfirm}
      onCancel={onCancel}
      isSubmitting={isLoading}
    >
      {message && (
        <p className="text-sm text-gray-600">{message}</p>
      )}
    </BaseModal>
  )
}

