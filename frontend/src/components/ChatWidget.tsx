import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { MessageCircle, X, Minimize2, Send, User, Bot, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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
}

interface SupportStatus {
  is_online: boolean
  support_name?: string
}

interface ChatWidgetProps {
  supportStatus: SupportStatus
}

export default function ChatWidget({ supportStatus }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (isOpen && !isMinimized) {
      fetchMessages()
    }
  }, [isOpen, isMinimized])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Poll for new messages when widget is open
    let interval: NodeJS.Timeout
    if (isOpen && !isMinimized) {
      interval = setInterval(fetchMessages, 5000) // Poll every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isOpen, isMinimized])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    try {
      setLoading(true)
      // For general chat, we'll use a special ticket ID or create a general session
      const response = await apiFetch('/support/api/tickets/')
      const data = await response.json()
      
      // For now, we'll create a simple message history
      // In a real implementation, this would fetch from a general chat session
      if (data.tickets && data.tickets.length > 0) {
        // Get the most recent ticket's messages as a demo
        const latestTicket = data.tickets[0]
        if (latestTicket.has_unread_messages) {
          setUnreadCount(1)
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return

    setSendingMessage(true)
    try {
      // Create a new ticket for this chat
      const response = await apiFetch('/support/api/tickets/create/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `Live Chat - ${new Date().toLocaleString()}`,
          description: newMessage.trim(),
          priority: 'MEDIUM',
          tags: ['Live Chat']
        })
      })

      if (response.ok) {
        const ticket = await response.json()
        setNewMessage('')
        navigate(`/support-tickets/${ticket.id}`)
        setIsOpen(false)
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

  const toggleChat = () => {
    if (isOpen) {
      if (isMinimized) {
        setIsMinimized(false)
      } else {
        setIsMinimized(true)
      }
    } else {
      setIsOpen(true)
      setIsMinimized(false)
    }
  }

  const closeChat = () => {
    setIsOpen(false)
    setIsMinimized(false)
  }

  // Show welcome message when chat opens
  const welcomeMessage: Message = {
    id: 0,
    message: supportStatus.is_online 
      ? `Hi! I'm ${supportStatus.support_name || 'a support team member'}. How can I help you today?`
      : "Hi! Our support team is currently offline, but I can help you create a support ticket that we'll respond to via email. What can I help you with?",
    sender: {
      id: 0,
      email: supportStatus.support_name || 'support@psychpath.com.au',
      first_name: supportStatus.support_name || 'Support',
      last_name: ''
    },
    is_support: true,
    created_at: new Date().toISOString()
  }

  const displayMessages = [welcomeMessage, ...messages]

  return (
    <>
      {/* Chat Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={toggleChat}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50">
          <Card className={`w-80 h-96 shadow-xl transition-all duration-300 ${
            isMinimized ? 'h-12' : ''
          }`}>
            {/* Header */}
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <CardTitle className="text-sm">Support Chat</CardTitle>
                  <div className={`w-2 h-2 rounded-full ${
                    supportStatus.is_online ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="h-6 w-6 p-0"
                  >
                    <Minimize2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeChat}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <CardDescription className="text-xs">
                {supportStatus.is_online 
                  ? `Chat with ${supportStatus.support_name || 'Support'}`
                  : 'Create a support ticket'
                }
              </CardDescription>
            </CardHeader>

            {!isMinimized && (
              <CardContent className="flex flex-col h-64 p-3">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-2">
                  {displayMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.is_support ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] p-2 rounded-lg text-sm ${
                          message.is_support
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {message.is_support ? (
                            <Bot className="h-3 w-3" />
                          ) : (
                            <User className="h-3 w-3" />
                          )}
                          <span className="font-medium text-xs">
                            {message.sender.first_name || 'You'}
                          </span>
                        </div>
                        <p className="text-xs whitespace-pre-wrap">{message.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t pt-2">
                  <div className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={supportStatus.is_online ? "Type your message..." : "Describe your issue..."}
                      rows={2}
                      className="flex-1 text-sm resize-none"
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={!newMessage.trim() || sendingMessage}
                      size="sm"
                      className="self-end"
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {supportStatus.is_online 
                      ? 'Press Enter to send'
                      : 'This will create a support ticket'
                    }
                  </p>
                </div>

                {/* Offline Notice */}
                {!supportStatus.is_online && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Support is offline. We'll respond via email.
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
