import { useState, useEffect, useRef, useCallback } from 'react'

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

interface UseChatWebSocketProps {
  ticketId: string | number | null
  enabled?: boolean
}

interface UseChatWebSocketReturn {
  messages: Message[]
  sendMessage: (message: string) => void
  isConnected: boolean
  error: string | null
  isLoading: boolean
}

export function useChatWebSocket({ 
  ticketId, 
  enabled = true 
}: UseChatWebSocketProps): UseChatWebSocketReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (!enabled || !ticketId) return

    try {
      setIsLoading(true)
      setError(null)
      
      // Use 'general' for general chat or the actual ticket ID
      const chatTicketId = ticketId === 'general' ? 'general' : ticketId
      const wsUrl = `ws://localhost:8000/ws/chat/${chatTicketId}/`
      
      wsRef.current = new WebSocket(wsUrl)
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setIsLoading(false)
        reconnectAttempts.current = 0
      }
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'chat_history') {
            setMessages(data.messages || [])
          } else if (data.type === 'message') {
            setMessages(prev => [...prev, data.message])
          } else if (data.type === 'error') {
            setError(data.error)
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        setIsLoading(false)
        
        // Attempt to reconnect if it wasn't a clean close and we haven't exceeded max attempts
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`)
            connect()
          }, delay)
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Failed to connect to chat. Please refresh the page.')
        }
      }
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setError('Connection error occurred')
        setIsLoading(false)
      }
      
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err)
      setError('Failed to connect to chat')
      setIsLoading(false)
    }
  }, [enabled, ticketId])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting')
      wsRef.current = null
    }
    
    setIsConnected(false)
    setError(null)
  }, [])

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ message }))
      } catch (err) {
        console.error('Failed to send message:', err)
        setError('Failed to send message')
      }
    } else {
      setError('Not connected to chat')
    }
  }, [])

  useEffect(() => {
    if (enabled && ticketId) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, ticketId, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    messages,
    sendMessage,
    isConnected,
    error,
    isLoading
  }
}
