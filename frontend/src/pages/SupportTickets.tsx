import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, MessageCircle, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import CreateTicketModal from '@/components/CreateTicketModal'
import TicketDetailView from '@/components/TicketDetailView'
import ChatWidget from '@/components/ChatWidget'

interface Ticket {
  id: number
  ticket_type?: string
  subject: string
  description?: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  has_unread_messages: boolean
  last_message_at: string | null
  assigned_to: string | null
  tags: string[]
}

interface SupportStatus {
  is_online: boolean
  support_name?: string
}

export default function SupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [supportStatus, setSupportStatus] = useState<SupportStatus>({ is_online: false })

  useEffect(() => {
    fetchTickets()
    fetchSupportStatus()
    
    // Poll for support status every 30 seconds
    const interval = setInterval(fetchSupportStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/support/api/tickets/')
      const data = await response.json()
      setTickets(data.tickets || [])
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
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

  const handleCreateTicket = async (ticketData: { 
    subject: string
    description: string
    priority: string
    ticket_type: string
    tags: string[]
    current_url?: string
    browser_info?: string
    context_data?: any
  }): Promise<boolean> => {
    try {
      const response = await apiFetch('/support/api/tickets/create/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData)
      })
      
      if (response.ok) {
        fetchTickets()
        return true
      } else {
        try {
          const error = await response.json()
          alert(error.error || error.detail || 'Failed to create ticket')
        } catch (parseError) {
          // If response is not JSON, get as text
          const errorText = await response.text()
          alert(`Failed to create ticket: ${response.status} ${response.statusText}\n\n${errorText}`)
        }
        return false
      }
    } catch (error) {
      console.error('Failed to create ticket:', error)
      alert(`Network error: ${error instanceof Error ? error.message : 'Failed to create ticket'}`)
      return false
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

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (selectedTicket) {
    return (
      <TicketDetailView
        ticketId={selectedTicket.id}
        onBack={() => setSelectedTicket(null)}
        onTicketUpdate={fetchTickets}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Chat Widget */}
      <ChatWidget supportStatus={supportStatus} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Support Tickets</h1>
          <p className="text-gray-600">
            Get help with your PsychPATH account and logbook entries
          </p>
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

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="WAITING_USER">Waiting for User</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Ticket
          </Button>
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
              <p className="text-gray-600 mb-4">
                {tickets.length === 0 
                  ? "You haven't created any support tickets yet."
                  : "No tickets match your search criteria."
                }
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                Create Your First Ticket
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <Card 
                key={ticket.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedTicket(ticket)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(ticket.status)}
                        <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                        {ticket.has_unread_messages && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            New
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        Created {new Date(ticket.created_at).toLocaleDateString()}
                        {ticket.last_message_at && (
                          <span> • Last message {new Date(ticket.last_message_at).toLocaleDateString()}</span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                      <Badge variant="outline">
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {ticket.assigned_to && (
                    <p className="text-sm text-gray-600 mb-2">
                      Assigned to: {ticket.assigned_to}
                    </p>
                  )}
                  {ticket.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ticket.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTicket}
        />
      )}
    </div>
  )
}
