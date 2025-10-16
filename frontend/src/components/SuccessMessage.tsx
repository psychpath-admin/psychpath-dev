import React, { useEffect } from 'react'
import { CheckCircle } from 'lucide-react'

interface SuccessMessageProps {
  show: boolean
  message: string
  onClose: () => void
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({ show, message, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose()
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Success!</h3>
            <p className="text-gray-600">{message}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SuccessMessage

