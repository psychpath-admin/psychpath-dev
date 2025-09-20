import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save } from 'lucide-react'

interface CRAFormProps {
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
  showClientIdInput?: boolean
  onClientIdChange?: (value: string) => void
  clientSuggestions?: string[]
  isEditing?: boolean
}

export default function CRAForm({
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
  title = 'Section A: Client Related Activity',
  showClientIdInput = false,
  onClientIdChange,
  clientSuggestions = [],
  isEditing = false
}: CRAFormProps) {
  const [validationError, setValidationError] = useState('')
  const [showReflections, setShowReflections] = useState((entryForm.reflections_on_experience || '').length > 0)
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
            if (entryForm.session_activity_types.length === 0) {
              setValidationError('Please select at least one activity type')
              return
            }
            onSubmit(entryForm)
          }} className="space-y-6">
            {/* Client Pseudonym (CRA/ICRA) */}
            {showClientIdInput && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Client Pseudonym <span className="text-red-500">*</span>
                </label>
                <Input
                  value={entryForm.client_pseudonym || entryForm.client_id}
                  onChange={(e) => {
                    setEntryForm({ ...entryForm, client_pseudonym: e.target.value })
                    if (onClientIdChange) onClientIdChange(e.target.value)
                  }}
                  placeholder="e.g., Client A, BM-1961-M"
                  required
                  list="cra-client-suggestions"
                />
                <datalist id="cra-client-suggestions">
                  {clientSuggestions.map((s, i) => (
                    <option key={i} value={s} />
                  ))}
                </datalist>
              </div>
            )}
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
                required
              />
            </div>

            {/* Client Related Activity Type */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Client Related Activity Type <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={entryForm.session_activity_types.join(', ')}
                onChange={(e) => {
                  const types = e.target.value.split(',').map(t => t.trim()).filter(t => t)
                  setEntryForm({ ...entryForm, session_activity_types: types })
                }}
                placeholder="Enter activity type..."
                required
              />
              {/* Standard activity types */}
              <div className="flex flex-wrap gap-2 mt-2">
                {['report writing', 'case formulation', 'test scoring', 'documentation', 'file review'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      const currentTypes = entryForm.session_activity_types.filter(t => t !== type)
                      const newTypes = entryForm.session_activity_types.includes(type) ? currentTypes : [...currentTypes, type]
                      setEntryForm({ ...entryForm, session_activity_types: newTypes })
                    }}
                    className={`px-2 py-1 text-xs rounded border ${
                      entryForm.session_activity_types.includes(type)
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Custom activity types */}
              {customActivityTypes.length > 0 && (
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-2 text-gray-600">
                    Your Custom Activity Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {customActivityTypes.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          const currentTypes = entryForm.session_activity_types.filter(t => t !== type.name)
                          const newTypes = entryForm.session_activity_types.includes(type.name) ? currentTypes : [...currentTypes, type.name]
                          setEntryForm({ ...entryForm, session_activity_types: newTypes })
                        }}
                        className={`px-2 py-1 text-xs rounded border flex items-center gap-1 ${
                          entryForm.session_activity_types.includes(type.name)
                            ? 'bg-green-100 text-green-800 border-green-300'
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {type.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCustomActivityType(type.id)
                          }}
                          className="ml-1 text-red-500 hover:text-red-700"
                          title="Delete custom type"
                        >
                          ×
                        </button>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add custom activity type */}
              <div className="mt-3">
                <label className="block text-sm font-medium mb-2 text-gray-600">
                  Add Custom Activity Type
                </label>
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
                <input
                  type="checkbox"
                  id="addReflections"
                  checked={showReflections}
                  onChange={(e) => {
                    setShowReflections(e.target.checked)
                    if (!e.target.checked) {
                      // Only clear the text when unchecking
                      setEntryForm({ ...entryForm, reflections_on_experience: '' })
                    }
                  }}
                  className="mr-2"
                />
                <label htmlFor="addReflections" className="text-sm font-medium">
                  Add Reflections?
                </label>
              </div>
            </div>
            
            {/* Quick duration links */}
            <div className="flex flex-wrap gap-2">
              {[15, 30, 45, 60, 75, 90, 120].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setEntryForm({ ...entryForm, duration_minutes: minutes.toString() })}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {minutes === 120 ? '2 hours' : `${minutes} Minutes`}
                </button>
              ))}
            </div>

            {/* ICRA has the same fields as CRA; only difference is no parent DCC link */}

            {/* Reflections - conditional based on checkbox */}
            {showReflections && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Reflections <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={entryForm.reflections_on_experience || ''}
                  onChange={(e) => setEntryForm({ ...entryForm, reflections_on_experience: e.target.value })}
                  placeholder="Enter your reflections on this client related activity..."
                  rows={4}
                  required
                  className="resize-y"
                />
              </div>
            )}

            {/* Hidden fields */}
            <input type="hidden" name="parent_dcc_entry" value={entryForm.parent_dcc_entry} />
            <input type="hidden" name="week_starting" value={entryForm.week_starting} />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={saving}
                className="bg-gray-200 text-gray-800 hover:bg-gray-300 border-gray-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Entry' : 'Create Entry')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
