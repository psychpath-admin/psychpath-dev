/**
 * Week calculation utilities
 * Fixed to handle Sunday properly (Sunday belongs to the following week)
 */

/**
 * Calculate week starting date based on session date.
 * Week starting = Monday of the week containing the session date.
 * Sunday belongs to the following week (not the previous week).
 */
export const calculateWeekStarting = (dateString: string): string => {
  const date = new Date(dateString)
  
  // Get the day of the week (0=Sunday, 1=Monday, ..., 6=Saturday)
  const dayOfWeek = date.getDay()
  
  let weekStart: Date
  
  if (dayOfWeek === 0) {
    // Sunday belongs to the NEXT week (next Monday)
    weekStart = new Date(date)
    weekStart.setDate(date.getDate() + 1)
  } else {
    // Calculate the Monday of the current week
    const daysToMonday = dayOfWeek - 1 // 1=Monday is 0 days, 2=Tuesday is 1 day, etc.
    weekStart = new Date(date)
    weekStart.setDate(date.getDate() - daysToMonday)
  }
  
  return weekStart.toISOString().split('T')[0]
}

/**
 * Legacy function name for backward compatibility
 * @deprecated Use calculateWeekStarting instead
 */
export const calculateWeekStartingLegacy = (dateString: string): string => {
  const date = new Date(dateString)
  const dayOfWeek = date.getDay() // 0 for Sunday, 1 for Monday, etc.
  const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust to Monday
  const weekStart = new Date(date.setDate(diff))
  return weekStart.toISOString().split('T')[0]
}

/**
 * Test function to verify week calculation logic
 */
export const testWeekCalculation = () => {
  console.log('Testing week calculation logic:')
  
  // Test cases
  const testCases = [
    { date: '2024-09-01', day: 'Sunday', expected: '2024-09-02' }, // Sunday -> Next Monday
    { date: '2024-08-26', day: 'Monday', expected: '2024-08-26' }, // Monday -> Same Monday
    { date: '2024-08-27', day: 'Tuesday', expected: '2024-08-26' }, // Tuesday -> Previous Monday
    { date: '2024-09-06', day: 'Friday', expected: '2024-09-02' }, // Friday -> Previous Monday
    { date: '2024-09-07', day: 'Saturday', expected: '2024-09-02' }, // Saturday -> Previous Monday
  ]
  
  testCases.forEach(testCase => {
    const result = calculateWeekStarting(testCase.date)
    const correct = result === testCase.expected
    console.log(`${testCase.date} (${testCase.day}) → ${result} ${correct ? '✅' : '❌'} (expected: ${testCase.expected})`)
  })
}
