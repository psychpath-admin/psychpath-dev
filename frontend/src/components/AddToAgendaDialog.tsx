import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, X } from 'lucide-react'
import { createAgendaItem, getSupervisionAgendas, createSupervisionAgenda } from '@/lib/api'
import { toast } from 'sonner'

interface AddToAgendaDialogProps {
  isOpen: boolean
  onClose: () => void
  sourceType: 'A' | 'B' | 'FREE'
  sourceEntryId?: number
  sourceField?: string
  sourceExcerpt?: string
  defaultTitle?: string
  defaultDetail?: string
}

export default function AddToAgendaDialog({
  isOpen,
  onClose,
  sourceType,
  sourceEntryId,
  sourceField = '',
  sourceExcerpt = '',
  defaultTitle = '',
  defaultDetail = ''
}: AddToAgendaDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: defaultTitle,
    detail: defaultDetail,
    priority: 'medium' as 'low' | 'medium' | 'high'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast.error('Please enter a title for the agenda item')
      return
    }

    try {
      setLoading(true)
      
      // Get current week's agenda
      const agendas = await getSupervisionAgendas()
      let currentAgenda = agendas.find((agenda: any) => 
        agenda.week_starting && 
        new Date(agenda.week_starting) <= new Date() &&
        new Date(agenda.week_starting).getTime() + (7 * 24 * 60 * 60 * 1000) > new Date().getTime()
      )
      
      // If no agenda for current/next week, create next week's agenda automatically
      if (!currentAgenda) {
        const today = new Date()
        const currentWeekStart = new Date(today)
        currentWeekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))
        
        // Calculate next week's Monday (current week + 7 days)
        const nextWeekStart = new Date(currentWeekStart)
        nextWeekStart.setDate(currentWeekStart.getDate() + 7)
        
        try {
          // Try to create next week's agenda
          const newAgenda = await createSupervisionAgenda({ 
            week_starting: nextWeekStart.toISOString().split('T')[0] 
          })
          currentAgenda = newAgenda
        } catch (createError: any) {
          // If creation fails due to duplicate key (agenda already exists), refetch agendas
          if (createError.message?.includes('duplicate') || createError.message?.includes('already exists')) {
            console.log('Agenda already exists, refetching...')
            const refreshedAgendas = await getSupervisionAgendas()
            currentAgenda = refreshedAgendas.find((agenda: any) => 
              agenda.week_starting === nextWeekStart.toISOString().split('T')[0]
            )
            
            if (!currentAgenda) {
              throw new Error('Could not find or create a supervision agenda for next week.')
            }
          } else {
            // Re-throw other errors
            throw createError
          }
        }
      }

      // Create agenda item
      await createAgendaItem({
        title: formData.title.trim(),
        detail: formData.detail.trim(),
        priority: formData.priority,
        source_type: sourceType,
        source_entry_id: sourceEntryId,
        source_field: sourceField,
        source_excerpt: sourceExcerpt,
        agenda: currentAgenda.id
      })

      toast.success('Added to supervision agenda')
      onClose()
      
      // Reset form
      setFormData({
        title: '',
        detail: '',
        priority: 'medium'
      })
      
    } catch (error) {
      console.error('Error adding to agenda:', error)
      toast.error('Failed to add to agenda')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Add to Supervision Agenda</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief description of what to discuss"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Details
              </label>
              <Textarea
                value={formData.detail}
                onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
                placeholder="Additional context or specific points to cover"
                className="text-base leading-relaxed min-h-[120px] placeholder:text-gray-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Priority
              </label>
              <Select
                value={formData.priority}
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sourceExcerpt && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Source Excerpt
                </label>
                <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                  {sourceExcerpt}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-primaryBlue hover:bg-primaryBlue/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                {loading ? 'Adding...' : 'Add to Agenda'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
