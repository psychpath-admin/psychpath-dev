import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLocation } from 'react-router-dom'
import { BookOpen, GraduationCap } from 'lucide-react'

interface PathwaySwitcherProps {
  userRole?: string
  hasRegistrarProgram?: boolean
  hasProvisionalProgram?: boolean
}

const PathwaySwitcher: React.FC<PathwaySwitcherProps> = ({ 
  userRole, 
  hasRegistrarProgram = false, 
  hasProvisionalProgram = false 
}) => {
  const location = useLocation()
  
  const isRegistrarPath = location.pathname.startsWith('/registrar')
  const isProvisionalPath = location.pathname.startsWith('/section-') || 
                           location.pathname.startsWith('/logbook') ||
                           location.pathname === '/'

  // Only show for users who can access both pathways
  if (userRole !== 'REGISTRAR' || (!hasRegistrarProgram && !hasProvisionalProgram)) {
    return null
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">Pathway:</span>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant={isProvisionalPath ? "default" : "ghost"}
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={() => {
            if (!isProvisionalPath) {
              window.location.href = '/'
            }
          }}
          disabled={!hasProvisionalProgram}
        >
          <BookOpen className="h-3 w-3 mr-1" />
          Provisional
        </Button>
        
        <Button
          variant={isRegistrarPath ? "default" : "ghost"}
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={() => {
            if (!isRegistrarPath) {
              window.location.href = '/registrar'
            }
          }}
          disabled={!hasRegistrarProgram}
        >
          <GraduationCap className="h-3 w-3 mr-1" />
          Registrar
        </Button>
      </div>
      
      {!hasRegistrarProgram && isRegistrarPath && (
        <Badge variant="outline" className="text-xs">
          No Program
        </Badge>
      )}
      
      {!hasProvisionalProgram && isProvisionalPath && (
        <Badge variant="outline" className="text-xs">
          No Program
        </Badge>
      )}
    </div>
  )
}

export default PathwaySwitcher
