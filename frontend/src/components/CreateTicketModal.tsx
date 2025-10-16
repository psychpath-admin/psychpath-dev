import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Plus, AlertCircle, Info, Lightbulb, Bug, Settings, CheckCircle, HelpCircle } from 'lucide-react'
import { captureFullContext, formatContextForDescription, type ContextData } from '@/utils/contextCapture'

interface CreateTicketModalProps {
  onClose: () => void
  onSubmit: (data: { 
    subject: string
    description: string
    priority: string
    ticket_type: string
    tags: string[]
    current_url?: string
    browser_info?: string
    context_data?: ContextData
  }) => Promise<boolean>
  prefilledData?: {
    type?: string
    subject?: string
    description?: string
  }
}

export default function CreateTicketModal({ onClose, onSubmit, prefilledData }: CreateTicketModalProps) {
  // Template definitions for each ticket type
  const getTemplateForType = (type: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.href : ''
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    
    switch (type) {
      case 'BUG':
        return {
          subject: 'Bug Report: [Brief description]',
          description: `**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Additional Information:**
${baseUrl ? `- Page URL: ${baseUrl}` : ''}
${userAgent ? `- Browser: ${userAgent}` : ''}
- Timestamp: ${new Date().toLocaleString()}`
        }
      case 'FEATURE':
        return {
          subject: 'Feature Request: [Brief description]',
          description: `**Problem to Solve:**
[Describe the problem this feature would solve]

**Desired Outcome:**
[What you want to achieve]

**Scope/Details:**
[Additional context about how this feature should work]

**User Story:**
As a [user type], I want [desired functionality], so that [expected benefit].`
        }
      case 'TASK':
        return {
          subject: 'Task: [Brief description]',
          description: `**Task Description:**
[Detailed description of the task]

**Requirements:**
- 
- 

**Acceptance Criteria:**
[How do you know when this task is complete?]`
        }
      case 'QUESTION':
        return {
          subject: 'Question: [Brief description]',
          description: `**Question:**
[What do you need help with?]

**Context:**
[Provide any relevant background information]

**What I've tried:**
[Any steps you've already taken to resolve this]

**Expected Response:**
[What kind of help or information are you looking for?]`
        }
      default:
        return {
          subject: '',
          description: ''
        }
    }
  }

  // Initialize state with proper template
  const initialType = prefilledData?.type || 'QUESTION'
  const initialTemplate = prefilledData?.subject && prefilledData?.description 
    ? { subject: prefilledData.subject, description: prefilledData.description }
    : getTemplateForType(initialType)
  
  const [subject, setSubject] = useState(initialTemplate.subject)
  const [description, setDescription] = useState(initialTemplate.description)
  const [priority, setPriority] = useState('MEDIUM')
  const [ticketType, setTicketType] = useState(initialType)
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [includeContext, setIncludeContext] = useState(true)
  const [capturedContext, setCapturedContext] = useState<ContextData | null>(null)

  // Capture context data when modal opens (guarded against StrictMode double-invoke)
  const hasCapturedRef = React.useRef(false)
  React.useEffect(() => {
    if (!hasCapturedRef.current) {
      hasCapturedRef.current = true
      captureFullContext().then(setCapturedContext).catch(console.error)
    }
  }, [])

  // Handle ticket type changes - update template
  const handleTicketTypeChange = (newType: string) => {
    setTicketType(newType)
    
    // Get the new template
    const template = getTemplateForType(newType)
    
    // Check if current subject looks like a template or should be updated
    const isTemplateSubject = (text: string) => {
      // Always update if empty
      if (!text) return true
      
      // Update if it contains placeholder
      if (text.includes('[Brief description]')) return true
      
      // Update if it looks like "Issue on /" (from ReportIssueButton)
      if (text.startsWith('Issue on ')) return true
      
      // Update if it looks like a template prefix from any type
      const templatePrefixes = ['Bug Report:', 'Feature Request:', 'Task:', 'Question:']
      const startsWithTemplatePrefix = templatePrefixes.some(prefix => text.startsWith(prefix))
      
      // Update if it starts with a template prefix and seems unchanged
      if (startsWithTemplatePrefix && (text.length < 100)) return true
      
      return false
    }
    
    // Check if current description looks like a template
    const isTemplateDescription = (text: string) => {
      if (!text) return true
      return text.includes('[') ||
             text.includes('**Steps to Reproduce:**') ||
             text.includes('**Problem to Solve:**') ||
             text.includes('**Task Description:**') ||
             text.includes('**Question:**') ||
             text.includes('**Expected Result:**') ||
             text.includes('**Actual Result:**') ||
             text.includes('**User Story:**')
    }
    
    // Always update subject and description when type changes and content looks like a template
    if (isTemplateSubject(subject) && template.subject) {
      setSubject(template.subject)
    }
    
    if (isTemplateDescription(description) && template.description) {
      setDescription(template.description)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!subject.trim() || !description.trim()) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      // Auto-capture browser metadata
      const browserInfo = `Browser: ${navigator.userAgent.split(' ').slice(-2).join(' ')}`
      
      // Prepare description with context if requested
      let finalDescription = description.trim()
      if (includeContext && capturedContext) {
        const contextInfo = formatContextForDescription(capturedContext)
        finalDescription = `${finalDescription}\n\n---\n\n${contextInfo}`
      }
      
      const success = await onSubmit({
        subject: subject.trim(),
        description: finalDescription,
        priority,
        ticket_type: ticketType,
        tags,
        current_url: window.location.href,
        browser_info: browserInfo,
        context_data: includeContext ? capturedContext || undefined : undefined
      })
      
      // Close modal only on successful submission
      if (success) {
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'URGENT': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'HIGH': return <AlertCircle className="h-4 w-4 text-orange-500" />
      case 'MEDIUM': return <Info className="h-4 w-4 text-yellow-500" />
      case 'LOW': return <Info className="h-4 w-4 text-green-500" />
      default: return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityDescription = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'Critical issue requiring immediate attention'
      case 'HIGH': return 'Important issue that should be addressed soon'
      case 'MEDIUM': return 'Standard issue with normal priority'
      case 'LOW': return 'Minor issue or feature request'
      default: return ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Support Ticket
              </CardTitle>
              <CardDescription>
                Describe your issue and we'll get back to you as soon as possible
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Ticket Type */}
            <div className="space-y-2">
              <Label htmlFor="ticket_type">Type *</Label>
              <Select value={ticketType} onValueChange={handleTicketTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUESTION">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-blue-500" />
                      Question - Need help or clarification
                    </div>
                  </SelectItem>
                  <SelectItem value="BUG">
                    <div className="flex items-center gap-2">
                      <Bug className="h-4 w-4 text-red-500" />
                      Bug - Something isn't working
                    </div>
                  </SelectItem>
                  <SelectItem value="FEATURE">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Feature - Request new functionality
                    </div>
                  </SelectItem>
                  <SelectItem value="TASK">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Task - Work to be done
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                required
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-green-500" />
                      Low - Minor issue or feature request
                    </div>
                  </SelectItem>
                  <SelectItem value="MEDIUM">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-yellow-500" />
                      Medium - Standard issue
                    </div>
                  </SelectItem>
                  <SelectItem value="HIGH">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      High - Important issue
                    </div>
                  </SelectItem>
                  <SelectItem value="URGENT">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Urgent - Critical issue
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                {getPriorityIcon(priority)}
                {getPriorityDescription(priority)}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide detailed information about your issue, including steps to reproduce if applicable..."
                rows={6}
                required
              />
              <p className="text-sm text-gray-600">
                Include as much detail as possible to help us understand and resolve your issue quickly.
              </p>
            </div>

            {/* Context Capture */}
            {capturedContext && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-context"
                    checked={includeContext}
                    onCheckedChange={(checked) => setIncludeContext(checked as boolean)}
                  />
                  <Label htmlFor="include-context" className="text-sm font-medium">
                    Include page context and technical details
                  </Label>
                </div>
                <p className="text-xs text-gray-500 ml-6">
                  Automatically includes current page URL, form data, console errors, and browser information. 
                  We'll ask for permission before capturing sensitive data.
                </p>
              </div>
            )}

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add tags to categorize your ticket"
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Suggested Tags */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Suggested tags:</p>
                <div className="flex flex-wrap gap-2">
                  {['Technical', 'Account', 'Billing', 'Feature Request', 'Bug Report', 'Logbook', 'Supervision'].map((suggestedTag) => (
                    <Button
                      key={suggestedTag}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!tags.includes(suggestedTag)) {
                          setTags([...tags, suggestedTag])
                        }
                      }}
                      disabled={tags.includes(suggestedTag)}
                      className="text-xs"
                    >
                      {suggestedTag === 'Technical' && <Settings className="h-3 w-3 mr-1" />}
                      {suggestedTag === 'Bug Report' && <Bug className="h-3 w-3 mr-1" />}
                      {suggestedTag === 'Feature Request' && <Lightbulb className="h-3 w-3 mr-1" />}
                      {suggestedTag}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Selected Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Ticket'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
