import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Plus, Trash2, Calendar, Clock, User, MapPin, FileText } from 'lucide-react'

// Helper function to format dates in dd/mm/yyyy format
const formatDateDDMMYYYY = (dateString: string) => {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}
import { useNavigate } from 'react-router-dom'

interface DCCEntry {
  id: number
  client_id: string
  session_date: string
  week_starting: string
  place_of_practice: string
  presenting_issues: string
  session_activity_types: string[]
  duration_minutes: string
  reflections_on_experience: string
  entry_type: 'client_contact' | 'cra' | 'icra'
  parent_dcc_entry?: number
  cra_entries: DCCEntry[]
  simulated: boolean
  simulated_hours_info?: {
    total_hours: number
    remaining_hours: number
    limit_reached: boolean
  }
  total_sessions?: number
  total_duration_minutes?: number
  total_duration_display?: string
  created_at: string
  updated_at: string
}

interface DCCDetailProps {
  entry: DCCEntry
  onEdit?: (entry: DCCEntry) => void
  onAddCRA?: (entry: DCCEntry) => void
  onDelete?: (entry: DCCEntry) => void
}

export default function DCCDetail({ entry, onEdit, onAddCRA, onDelete }: DCCDetailProps) {
  const navigate = useNavigate()

  const formatDuration = (minutes: string) => {
    const mins = parseInt(minutes)
    if (mins >= 60) {
      const hours = Math.floor(mins / 60)
      const remainingMins = mins % 60
      return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
    }
    return `${mins}m`
  }

  const handleBack = () => {
    navigate('/section-a')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Section A
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                DCC Record: {entry.client_id}
              </h1>
              <p className="text-gray-600">
                Session Date: {formatDateDDMMYYYY(entry.session_date)}
              </p>
            </div>
            
            <div className="flex gap-2">
              {onEdit && (
                <Button onClick={() => onEdit(entry)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {onAddCRA && (
                <Button onClick={() => onAddCRA(entry)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add CRA
                </Button>
              )}
              {onDelete && (
                <Button 
                  onClick={() => onDelete(entry)} 
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Session Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Session Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Session Date</label>
                    <p className="text-lg">{formatDateDDMMYYYY(entry.session_date)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Week Starting</label>
                    <p className="text-lg">{formatDateDDMMYYYY(entry.week_starting)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Duration</label>
                    <p className="text-lg flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {formatDuration(entry.duration_minutes)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Client ID</label>
                    <p className="text-lg flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {entry.client_id}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Place of Practice</label>
                  <p className="text-lg flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {entry.place_of_practice}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Session Activity Types */}
            <Card>
              <CardHeader>
                <CardTitle>Session Activity Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {entry.session_activity_types.map((type, index) => (
                    <Badge key={index} variant="default" className="text-sm">
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  ))}
                </div>
                {entry.simulated && (
                  <div className="mt-3">
                    <Badge variant="secondary" className="text-sm">
                      Simulated Contact
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Presenting Issues */}
            <Card>
              <CardHeader>
                <CardTitle>Presenting Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {entry.presenting_issues}
                </p>
              </CardContent>
            </Card>

            {/* Reflections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Reflections on Experience
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {entry.reflections_on_experience}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Simulated Hours Info */}
            {entry.simulated_hours_info && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Simulated Hours Tracking</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Total Simulated Hours</label>
                    <p className="text-lg font-semibold">
                      {entry.simulated_hours_info.total_hours.toFixed(1)}h
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Remaining Hours</label>
                    <p className={`text-lg font-semibold ${
                      entry.simulated_hours_info.remaining_hours <= 10 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {entry.simulated_hours_info.remaining_hours.toFixed(1)}h
                    </p>
                  </div>
                  {entry.simulated_hours_info.limit_reached && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-600 font-medium">
                        ⚠️ 60-hour limit reached for simulated contact
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* CRA Entries */}
            {entry.cra_entries && entry.cra_entries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Client Related Activities ({entry.cra_entries.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {entry.cra_entries.map((craEntry) => (
                      <div key={craEntry.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-sm text-green-800">
                              {craEntry.session_activity_types.join(', ')}
                            </p>
                            <p className="text-xs text-green-600">
                              {formatDuration(craEntry.duration_minutes)}
                            </p>
                          </div>
                        </div>
                        {craEntry.reflections_on_experience && (
                          <p className="text-xs text-green-700 whitespace-pre-wrap">
                            {craEntry.reflections_on_experience.substring(0, 100)}
                            {craEntry.reflections_on_experience.length > 100 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Session Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Session Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Sessions</label>
                  <p className="text-lg font-semibold">{entry.total_sessions || 1}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Duration</label>
                  <p className="text-lg font-semibold">{entry.total_duration_display || formatDuration(entry.duration_minutes)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-sm text-gray-600">
                    {formatDateDDMMYYYY(entry.created_at)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="text-sm text-gray-600">
                    {formatDateDDMMYYYY(entry.updated_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
