import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { getProgramSummary } from '@/lib/api'
import type { ProgramSummary, ProgramAlert } from '@/types/program'

interface RegistrarSummaryCardProps {
  className?: string
}

export default function RegistrarSummaryCard({ className = '' }: RegistrarSummaryCardProps) {
  const [summary, setSummary] = useState<ProgramSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true)
        const data = await getProgramSummary()
        setSummary(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching registrar summary:', err)
        setError('Failed to fetch registrar summary')
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [])

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Registrar Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-gray-500">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (error || !summary) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Registrar Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-red-500">{error || 'No data available'}</div>
        </CardContent>
      </Card>
    )
  }

  // Check if user is actually a registrar
  if (summary.role !== 'REGISTRAR') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Registrar Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-gray-500">
            This section is for Registrar Psychologists only.
            <br />
            Current role: {summary.role}
          </div>
        </CardContent>
      </Card>
    )
  }

  const { progress, requirements, pace_estimates, alerts, profile_data } = summary

  // Calculate progress percentages
  const practiceProgress = requirements.practice_hours 
    ? (progress.total_practice_hours / requirements.practice_hours) * 100 
    : 0
  const pdProgress = requirements.pd_hours 
    ? (progress.pd_hours / requirements.pd_hours) * 100 
    : 0
  const supervisionProgress = requirements.supervision_hours 
    ? (progress.supervision_hours / requirements.supervision_hours) * 100 
    : 0

  const getQualificationDisplay = () => {
    if (!profile_data.qualification_level) return 'Registrar'
    
    const qualificationMap: Record<string, string> = {
      'MASTERS': 'Masters',
      'COMBINED': 'Combined Masters/PhD',
      'DOCTORATE': 'Doctorate',
      'SECOND_AOPE': 'Second AoPE'
    }
    
    return qualificationMap[profile_data.qualification_level] || profile_data.qualification_level
  }

  const getAopeDisplay = () => {
    if (!profile_data.aope) return 'Psychology'
    
    const aopeMap: Record<string, string> = {
      'CLINICAL': 'Clinical',
      'FORENSIC': 'Forensic',
      'ORGANISATIONAL': 'Organisational',
      'SPORT_EXERCISE': 'Sport & Exercise',
      'COMMUNITY': 'Community',
      'COUNSELLING': 'Counselling',
      'EDUCATIONAL_DEVELOPMENTAL': 'Educational & Developmental',
      'HEALTH': 'Health',
      'NEUROPSYCHOLOGY': 'Neuropsychology'
    }
    
    return aopeMap[profile_data.aope] || profile_data.aope
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Registrar Progress</span>
          <Badge variant="secondary">
            {getAopeDisplay()} {getQualificationDisplay()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Program Overview */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium text-gray-600">Duration</div>
            <div>{requirements.duration_weeks || 'N/A'} weeks</div>
          </div>
          <div>
            <div className="font-medium text-gray-600">Weekly Commitment</div>
            <div>{profile_data.weekly_commitment || 'N/A'} hrs/week</div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Practice Hours</span>
              <span>{progress.total_practice_hours} / {requirements.practice_hours || 'N/A'}</span>
            </div>
            <Progress value={practiceProgress} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Professional Development</span>
              <span>{progress.pd_hours} / {requirements.pd_hours || 'N/A'}</span>
            </div>
            <Progress value={pdProgress} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Supervision</span>
              <span>{progress.supervision_hours} / {requirements.supervision_hours || 'N/A'}</span>
            </div>
            <Progress value={supervisionProgress} className="h-2" />
          </div>
        </div>

        {/* Pace Estimates */}
        {pace_estimates.estimated_completion && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-blue-900 mb-1">Estimated Completion</div>
            <div className="text-sm text-blue-700">
              {new Date(pace_estimates.estimated_completion).toLocaleDateString()}
              {pace_estimates.weeks_remaining && (
                <span className="ml-2 text-gray-600">
                  ({pace_estimates.weeks_remaining} weeks remaining)
                </span>
              )}
            </div>
            {pace_estimates.on_pace !== null && (
              <div className="text-xs mt-1">
                {pace_estimates.on_pace ? (
                  <span className="text-green-600">✓ On pace</span>
                ) : (
                  <span className="text-orange-600">⚠ Behind pace</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert: ProgramAlert, index: number) => (
              <Alert key={index} variant={alert.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription className="text-sm">
                  {alert.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Program Details */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          <div>DCC: {progress.dcc_hours}h | CRA: {progress.cra_hours}h</div>
          <div>Total Hours: {progress.total_hours}h</div>
        </div>
      </CardContent>
    </Card>
  )
}

