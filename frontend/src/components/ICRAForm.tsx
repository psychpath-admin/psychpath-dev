import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ICRAFormProps {
  onSubmit: (data: any) => void
  onCancel: () => void
  saving: boolean
  entryForm: any
  setEntryForm: (form: any) => void
  handleActivityTypeToggle: (type: string) => void
  handleAddCustomActivityType: () => void
  newCustomActivityType: string
  setNewCustomActivityType: (value: string) => void
  customActivityTypes: any[]
  handleDeleteCustomActivityType: (id: number) => void
  calculateWeekStarting: (date: string) => string
  title?: string
  onClientIdChange?: (value: string) => void
  clientSuggestions?: string[]
  isEditing?: boolean
}

export default function ICRAForm({
  onSubmit,
  onCancel,
  saving,
  entryForm,
  setEntryForm,
  handleActivityTypeToggle,
  handleAddCustomActivityType,
  newCustomActivityType,
  setNewCustomActivityType,
  customActivityTypes,
  handleDeleteCustomActivityType,
  calculateWeekStarting,
  title = 'Add Independent Client Related Activity (ICRA)',
  onClientIdChange,
  clientSuggestions = [],
  isEditing = false
}: ICRAFormProps) {
  const [validationError, setValidationError] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleClientSelect = (client: string) => {
    setEntryForm({ ...entryForm, client_pseudonym: client })
    setShowSuggestions(false)
  }


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <span className="text-lg">×</span>
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => {
            e.preventDefault()
            setValidationError('')
            // Validate that at least one activity type is selected
            if (!entryForm.session_activity_types || entryForm.session_activity_types.length === 0) {
              setValidationError('Please select at least one activity type')
              return
            }
            // Validate that reflection is provided
            if (!entryForm.reflections_on_experience?.trim()) {
              setValidationError('Reflection is required for ICRA entries')
              return
            }
            onSubmit(entryForm)
          }} className="space-y-6">
            
            {/* Client Pseudonym - EXACT COPY from DCC form */}
            <div>
              <label className="block text-sm font-semibold text-brand mb-3">
                Client Pseudonym <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={entryForm.client_pseudonym || entryForm.client_id}
                  onChange={(e) => {
                    setEntryForm({ ...entryForm, client_pseudonym: e.target.value })
                    if (onClientIdChange) onClientIdChange(e.target.value)
                    if (e.target.value.length >= 1) {
                      setShowSuggestions(true)
                    } else {
                      setShowSuggestions(false)
                    }
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Type to search previous clients..."
                  maxLength={50}
                />
                {showSuggestions && clientSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {clientSuggestions.map((client, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 hover:bg-surfaceHover cursor-pointer text-sm text-text font-body transition-colors duration-200"
                        onClick={() => handleClientSelect(client)}
                      >
                        {client}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Activity Date */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Activity Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={entryForm.session_date || ''}
                onChange={(e) => {
                  const newDate = e.target.value
                  setEntryForm({ 
                    ...entryForm, 
                    session_date: newDate,
                    week_starting: newDate ? calculateWeekStarting(newDate) : ''
                  })
                }}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            {/* Client Related Activity Type */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Client Related Activity Type <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {['report_writing', 'case_formulation', 'test_scoring', 'documentation', 'file_review'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleActivityTypeToggle(type)}
                    className={`px-3 py-1 text-sm rounded-full border ${
                      entryForm.session_activity_types.includes(type)
                        ? 'bg-primaryBlue text-white border-primaryBlue'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
              
              {/* Custom Activity Types */}
              {customActivityTypes.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">Custom Activity Types:</p>
                  <div className="flex flex-wrap gap-2">
                    {customActivityTypes.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => handleDeleteCustomActivityType(type.id)}
                        className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                      >
                        {type.name} ×
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Add Custom Activity Type */}
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newCustomActivityType}
                  onChange={(e) => setNewCustomActivityType(e.target.value)}
                  placeholder="Enter custom activity type..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomActivityType}
                  disabled={!newCustomActivityType.trim()}
                  className="px-3"
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Duration (Minutes) */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">
                  Duration (Minutes) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={entryForm.duration_minutes || ''}
                  onChange={(e) => setEntryForm({ ...entryForm, duration_minutes: e.target.value })}
                  placeholder="15"
                  min="1"
                  required
                />
              </div>
              <div className="flex items-center mt-6">
                <span className="text-sm text-gray-600">
                  {entryForm.duration_minutes ? `${Math.floor(entryForm.duration_minutes / 60)}h ${entryForm.duration_minutes % 60}m` : ''}
                </span>
              </div>
            </div>

            {/* Quick duration links */}
            <div className="flex flex-wrap gap-1">
              {[30, 50, 60, 75, 90].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setEntryForm({ ...entryForm, duration_minutes: minutes.toString() })}
                  className={`px-2 py-1 text-xs rounded border ${
                    entryForm.duration_minutes === minutes.toString()
                      ? 'bg-primary text-white border-primary'
                      : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {minutes < 60 ? `${minutes}min` : `${minutes / 60}h`}
                </button>
              ))}
            </div>

            {/* Reflection - Always visible and required for ICRA */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Reflection <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={entryForm.reflections_on_experience || ''}
                onChange={(e) => setEntryForm({ ...entryForm, reflections_on_experience: e.target.value })}
                placeholder="Explain why this ICRA was needed and what you learned from it..."
                rows={4}
                required
                className="placeholder:text-gray-600"
              />
              <p className="text-xs text-gray-600 mt-1">
                Describe the purpose of this independent client-related activity and your learning outcomes.
              </p>
            </div>

            {/* Hidden fields */}
            <input type="hidden" name="parent_dcc_entry" value={entryForm.parent_dcc_entry} />
            <input type="hidden" name="week_starting" value={entryForm.week_starting} />

            {validationError && (
              <div className="text-red-600 text-sm">{validationError}</div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primaryBlue hover:bg-primaryBlue/90"
              >
                {saving ? 'Saving...' : 'Submit'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
