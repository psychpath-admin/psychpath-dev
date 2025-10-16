import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { useModalContext } from '@/contexts/ModalContext'
import ReportIssueIcon from './ReportIssueIcon'

interface EligibleWeek {
  week_start: string
  week_end: string
  week_display: string
  section_a_count: number
  section_b_count: number
  section_c_count: number
  total_entries: number
}

interface LogbookCreationModalProps {
  onClose: () => void
  onLogbookCreated: () => void
}

export default function LogbookCreationModal({ onClose, onLogbookCreated }: LogbookCreationModalProps) {
  const [eligibleWeeks, setEligibleWeeks] = useState<EligibleWeek[]>([])
  const [selectedWeek, setSelectedWeek] = useState<EligibleWeek | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Modal context integration - only if available (when used in modal)
  let setModalOpen: ((open: boolean) => void) | null = null
  try {
    const modalContext = useModalContext()
    setModalOpen = modalContext.setModalOpen
  } catch {
    // Not in modal context, that's fine
  }
  
  useEffect(() => {
    fetchEligibleWeeks()
    if (setModalOpen) {
      setModalOpen(true)
    }
    return () => {
      if (setModalOpen) {
        setModalOpen(false)
      }
    }
  }, [setModalOpen])

  const fetchEligibleWeeks = async () => {
    try {
      const response = await apiFetch('/api/logbook/eligible-weeks/')
      if (response.ok) {
        const data = await response.json()
        setEligibleWeeks(data)
      } else {
        toast.error('Failed to fetch eligible weeks')
      }
    } catch (error) {
      console.error('Error fetching eligible weeks:', error)
      toast.error('Error fetching eligible weeks')
    } finally {
      setLoading(false)
    }
  }

  const handleWeekSelect = (week: EligibleWeek) => {
    setSelectedWeek(week)
  }

  const handleCreateLogbook = async (saveAsDraft: boolean = false) => {
    if (!selectedWeek) return

    setSubmitting(true)
    try {
      const response = await apiFetch('/api/logbook/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week_start_date: selectedWeek.week_start,
          save_as_draft: saveAsDraft
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (saveAsDraft) {
          toast.success('Logbook saved as draft successfully!')
        } else {
          toast.success('Logbook created and submitted successfully!')
        }
        onLogbookCreated()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || `Failed to ${saveAsDraft ? 'save draft' : 'submit logbook'}`)
      }
    } catch (error) {
      console.error('Error creating logbook:', error)
      toast.error(`Error ${saveAsDraft ? 'saving draft' : 'creating logbook'}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Create New Logbook</DialogTitle>
            <DialogDescription className="text-gray-600">
              Loading eligible weeks...
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-spin" />
            <p className="text-sm text-gray-600">Please wait...</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (eligibleWeeks.length === 0) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900">No Eligible Weeks</DialogTitle>
            <DialogDescription className="text-gray-600">
              You don't have any weeks with unlinked entries that can be submitted.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-6">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm text-gray-600 mb-4">
              Make sure you have created entries in Sections A, B, and C for past weeks.
              Only completed weeks (not the current week) can be submitted.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white text-gray-900">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex-1">
            <DialogTitle className="text-gray-900">Create New Logbook</DialogTitle>
            <DialogDescription className="text-gray-600">
              Select a week to compile into a logbook for supervisor review. Only past weeks with entries are available.
            </DialogDescription>
          </div>
          {setModalOpen && (
            <div className="ml-4">
              <ReportIssueIcon />
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-700">
            Available Weeks ({eligibleWeeks.length}):
          </div>
          
          <div className="max-h-96 overflow-y-auto space-y-2">
            {eligibleWeeks.map((week) => (
              <div
                key={week.week_start}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedWeek?.week_start === week.week_start
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleWeekSelect(week)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium">{week.week_display}</div>
                      <div className="text-sm text-gray-600">
                        {week.total_entries} total entries
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      A: {week.section_a_count}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      B: {week.section_b_count}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      C: {week.section_c_count}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedWeek && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Selected Week</h4>
              <p className="text-sm text-blue-800">
                {selectedWeek.week_display} - {selectedWeek.total_entries} entries will be compiled into your logbook.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={() => handleCreateLogbook(true)}
              disabled={!selectedWeek || submitting}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              {submitting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Save as Draft
                </>
              )}
            </Button>
            <Button
              onClick={() => handleCreateLogbook(false)}
              disabled={!selectedWeek || submitting}
              className="bg-blue-600 hover:bg-blue-700 !text-white flex-1 sm:flex-none"
            >
              {submitting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Create & Submit
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
