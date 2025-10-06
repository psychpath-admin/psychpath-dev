/**
 * Utility functions for duration formatting and conversion
 */

/**
 * Convert minutes to hh:mm format
 * @param minutes - Duration in minutes
 * @returns Formatted string like "3:45" or "0:30"
 */
export function minutesToHoursMinutes(minutes: number | string | null | undefined): string {
  const numMinutes = typeof minutes === 'string' ? parseInt(minutes, 10) : Number(minutes)
  
  if (!Number.isFinite(numMinutes) || numMinutes < 0) {
    return '0:00'
  }
  
  // Round to avoid floating point precision issues
  const roundedMinutes = Math.round(numMinutes)
  const hours = Math.floor(roundedMinutes / 60)
  const mins = roundedMinutes % 60
  
  return `${hours}:${mins.toString().padStart(2, '0')}`
}

/**
 * Convert minutes to decimal hours (for calculations)
 * @param minutes - Duration in minutes
 * @returns Decimal hours
 */
export function minutesToDecimalHours(minutes: number | string | null | undefined): number {
  const numMinutes = typeof minutes === 'string' ? parseInt(minutes, 10) : Number(minutes)
  
  if (!Number.isFinite(numMinutes) || numMinutes < 0) {
    return 0
  }
  
  return Math.round((numMinutes / 60) * 10) / 10
}

/**
 * Convert decimal hours to hh:mm format
 * @param decimalHours - Duration in decimal hours (e.g., 3.75)
 * @returns Formatted string like "3:45"
 */
export function decimalHoursToHoursMinutes(decimalHours: number): string {
  if (!Number.isFinite(decimalHours) || decimalHours < 0) {
    return '0:00'
  }
  
  // Round to avoid floating point precision issues
  const totalMinutes = Math.round(decimalHours * 60)
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  
  return `${hours}:${mins.toString().padStart(2, '0')}`
}

/**
 * Format duration with unit (e.g., "3:45h" or "0:30h")
 * @param minutes - Duration in minutes
 * @returns Formatted string with unit
 */
export function formatDurationWithUnit(minutes: number | string | null | undefined): string {
  return `${minutesToHoursMinutes(minutes)}h`
}

/**
 * Format duration for display in cards/summaries (e.g., "3h 45m" or "30m")
 * @param minutes - Duration in minutes
 * @returns Formatted string for display
 */
export function formatDurationDisplay(minutes: number | string | null | undefined): string {
  const numMinutes = typeof minutes === 'string' ? parseInt(minutes, 10) : Number(minutes)
  
  if (!Number.isFinite(numMinutes) || numMinutes < 0) {
    return '0m'
  }
  
  const hours = Math.floor(numMinutes / 60)
  const mins = numMinutes % 60
  
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  } else {
    return `${mins}m`
  }
}
