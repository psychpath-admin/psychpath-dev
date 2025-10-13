import { useAuth } from '@/context/AuthContext'

interface UserNameDisplayProps {
  className?: string
  showRole?: boolean
  variant?: 'default' | 'large' | 'small'
}

export default function UserNameDisplay({ 
  className = '', 
  showRole = false, 
  variant = 'default' 
}: UserNameDisplayProps) {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  // Get full name from user object
  const firstName = user.first_name || ''
  const lastName = user.last_name || ''
  const fullName = `${firstName} ${lastName}`.trim()
  
  // Fallback to email if no name is available
  const displayName = fullName || user.email || 'User'

  // Style variants
  const variantClasses = {
    small: 'text-sm font-semibold text-white',
    default: 'text-lg font-semibold text-white',
    large: 'text-2xl font-bold text-white'
  }

  const roleClasses = {
    small: 'text-xs text-white/90 font-medium',
    default: 'text-sm text-white/90 font-medium',
    large: 'text-base text-white/90 font-medium'
  }

  return (
    <div className={`${className}`}>
      <div className={`${variantClasses[variant]} mb-1`}>
        {displayName}
      </div>
      {showRole && user.role && (
        <div className={`${roleClasses[variant]} bg-white/30 px-3 py-1 rounded-full inline-block shadow-sm`}>
          {user.role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
        </div>
      )}
    </div>
  )
}
