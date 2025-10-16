import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Send, MessageCircle, Clock, CheckCircle, XCircle, AlertCircle, User, Calendar, Target, GitBranch } from 'lucide-react'
import { useTicketChanges } from '@/hooks/useTicketChanges'

interface Message {
  id: number
  message: string
  sender: {
    id: number
    email: string
    first_name: string
    last_name: string
  }
  is_support: boolean
  created_at: string
  read_by_user: boolean
  read_by_support: boolean
}

interface Ticket {
  id: number
  ticket_type?: string
  subject: string
  description: string
  status: string
  priority: string
  stage?: string
  business_value?: string
  effort_estimate?: string
  implementation_notes?: string
  user_story?: string
  acceptance_criteria?: string[]
  test_plan?: any
  target_milestone?: string | null
  completed_at?: string | null
  related_tickets?: number[]
  created_at: string
  updated_at: string
  resolved_at: string | null
  assigned_to: string | null
  tags: string[]
  has_unread_messages: boolean
  last_message_at: string | null
  context_data?: any
  messages: Message[]
  session_id: number | null
}

interface SupportStatus {
  is_online: boolean
  support_name?: string
}

interface TicketDetailViewProps {
  ticketId: number
  onBack: () => void
  onTicketUpdate: () => void
}

export default function TicketDetailView({ ticketId, onBack, onTicketUpdate }: TicketDetailViewProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [supportStatus, setSupportStatus] = useState<SupportStatus>({ is_online: false })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Database-driven change detection - no more polling!
  const { resetChanges } = useTicketChanges({
    ticketId: ticketId,
    enabled: true,
    intervalMs: 600000, // 10 minutes
    onChangesDetected: () => {
      console.log('Changes detected - refreshing ticket data')
      fetchTicketDetails()
      fetchSupportStatus()
      resetChanges()
    }
  })

  useEffect(() => {
    fetchTicketDetails()
    fetchSupportStatus()
    
    console.log('TicketDetailView mounted - using database-driven updates')
  }, [ticketId])

  useEffect(() => {
    scrollToBottom()
  }, [ticket?.messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchTicketDetails = async () => {
    try {
      setLoading(true)
      setError(null) // Clear any previous errors
      const response = await apiFetch(`/support/api/tickets/${ticketId}/`)
      
             if (response.ok) {
               const data = await response.json()
               console.log('Full API response:', data) // Debug logging
               console.log('Ticket object:', data.ticket) // Debug ticket object
               console.log('Ticket status:', data.ticket?.status) // Debug status
               console.log('Ticket created_at:', data.ticket?.created_at) // Debug created date
               console.log('Messages in ticket:', data.ticket?.messages) // Debug messages
               setTicket(data.ticket) // Fix: Extract ticket from nested response
             } else {
        console.error('Failed to fetch ticket details:', response.status, response.statusText)
        setError(`Failed to load ticket details: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error)
      setError('Failed to load ticket details')
    } finally {
      setLoading(false)
    }
  }

  const fetchSupportStatus = async () => {
    try {
      const response = await apiFetch('/support/api/chat/online-status/')
      const data = await response.json()
      setSupportStatus(data)
    } catch (error) {
      console.error('Failed to fetch support status:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return

    setSendingMessage(true)
    try {
      const response = await apiFetch(`/support/api/tickets/${ticketId}/message/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() })
      })

      if (response.ok) {
        const responseData = await response.json()
        console.log('Message sent successfully:', responseData)
        setNewMessage('')
        // Force refresh ticket details to show the new message
        await fetchTicketDetails()
        onTicketUpdate()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <AlertCircle className="h-4 w-4 text-orange-500" />
      case 'IN_PROGRESS': return <Clock className="h-4 w-4 text-blue-500" />
      case 'WAITING_USER': return <MessageCircle className="h-4 w-4 text-yellow-500" />
      case 'RESOLVED': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'CLOSED': return <XCircle className="h-4 w-4 text-gray-500" />
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-200'
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ticket details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <XCircle className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-medium">Error Loading Ticket</p>
            <p className="text-sm text-gray-600 mt-1">{error}</p>
          </div>
          <Button onClick={fetchTicketDetails} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Ticket Not Found</h2>
          <p className="text-gray-600 mb-4">The ticket you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button onClick={onBack}>Back to Tickets</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Tickets
          </Button>
        </div>

        {/* Support Status */}
        <div className="mb-6">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            supportStatus.is_online 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-gray-100 text-gray-800 border border-gray-200'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              supportStatus.is_online ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            {supportStatus.is_online 
              ? `Support Online - ${supportStatus.support_name || 'Available'}` 
              : 'Support Offline - We\'ll respond via email'
            }
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(ticket.status)}
                  Ticket #{ticket.id}
                </CardTitle>
                <CardDescription>
                  Created {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'Unknown date'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Status</h3>
                  <Badge variant="outline" className="capitalize">
                    {ticket.status ? ticket.status.replace('_', ' ') : 'Unknown'}
                  </Badge>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Priority</h3>
                  <Badge className={getPriorityColor(ticket.priority)}>
                    {ticket.priority || 'Medium'}
                  </Badge>
                </div>

                {ticket.assigned_to && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Assigned To</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      {ticket.assigned_to}
                    </div>
                  </div>
                )}

                {ticket.resolved_at && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Resolved</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      {new Date(ticket.resolved_at).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {ticket.tags && ticket.tags.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {ticket.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Planning Section - Show for Feature/Task tickets */}
            {ticket.ticket_type && ['FEATURE', 'TASK'].includes(ticket.ticket_type) && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    Planning Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ticket.stage && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Stage</h3>
                      <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
                        {ticket.stage.replace('_', ' ')}
                      </Badge>
                    </div>
                  )}

                  {ticket.business_value && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Business Value</h3>
                      <Badge variant="outline">{ticket.business_value}</Badge>
                    </div>
                  )}

                  {ticket.effort_estimate && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Effort Estimate</h3>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full bg-blue-400`}></div>
                        <span className="text-sm text-gray-600">{ticket.effort_estimate}</span>
                      </div>
                    </div>
                  )}

                  {ticket.user_story && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">User Story</h3>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
                        {ticket.user_story}
                      </p>
                    </div>
                  )}

                  {ticket.acceptance_criteria && ticket.acceptance_criteria.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Acceptance Criteria</h3>
                      <ul className="space-y-1">
                        {ticket.acceptance_criteria.map((criteria, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                            {criteria}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ticket.target_milestone && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Target Milestone</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Target className="h-4 w-4" />
                        {ticket.target_milestone}
                      </div>
                    </div>
                  )}

                  {ticket.completed_at && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Completed</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {new Date(ticket.completed_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Messages */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle>{ticket.subject}</CardTitle>
                <CardDescription>{ticket.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                  {ticket.messages && ticket.messages.length > 0 ? (
                    ticket.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.is_support ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.is_support
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {message.sender.first_name && message.sender.last_name
                                ? `${message.sender.first_name} ${message.sender.last_name}`
                                : message.sender.email}
                            </span>
                            {message.is_support && (
                              <Badge variant="secondary" className="text-xs">
                                Support
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(message.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                {ticket.status !== 'CLOSED' && (
                  <div className="border-t pt-4">
                    <div className="flex gap-2">
                      <Textarea
                        value={newMessage}
               onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        rows={3}
                        className="flex-1"
                      />
                      <Button 
                        onClick={sendMessage} 
                        disabled={!newMessage.trim() || sendingMessage}
                        className="self-end"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
