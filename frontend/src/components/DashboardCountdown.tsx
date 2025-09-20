import React, { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Clock, Unlock } from 'lucide-react'

interface DashboardCountdownProps {
  unlockExpiresAt: string
  durationMinutes: number
  logbookWeekDisplay: string
}

export default function DashboardCountdown({
  unlockExpiresAt,
  durationMinutes,
  logbookWeekDisplay
}: DashboardCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date()
      const expiry = new Date(unlockExpiresAt)
      const diff = expiry.getTime() - now.getTime()

      if (diff <= 0) {
        setIsExpired(true)
        setTimeRemaining('00:00:00')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeRemaining(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }

    // Calculate immediately
    calculateTimeRemaining()

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [unlockExpiresAt])

  const getDurationDisplay = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours} hours`
    } else {
      const days = Math.floor(minutes / 1440)
      const remainingHours = Math.floor((minutes % 1440) / 60)
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} days`
    }
  }

  if (isExpired) {
    return (
      <Alert className="border-gray-300 bg-gray-50">
        <Clock className="h-4 w-4 text-gray-500" />
        <AlertDescription className="text-gray-600">
          <strong>Unlock Expired:</strong> The time-limited unlock for "{logbookWeekDisplay}" has expired. 
          The logbook is now locked again.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="border-green-300 bg-green-50">
      <Unlock className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800">
        <div className="flex items-center justify-between">
          <div>
            <strong>Unlocked for Editing:</strong> "{logbookWeekDisplay}" is unlocked for editing.
            <br />
            <span className="text-sm text-green-700">
              Duration: {getDurationDisplay(durationMinutes)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              <Clock className="h-3 w-3 mr-1" />
              {timeRemaining}
            </Badge>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}

