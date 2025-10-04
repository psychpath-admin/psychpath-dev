import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Users, 
  UserPlus, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import EnrolSuperviseesModal from './EnrolSuperviseesModal'

interface SupervisionStats {
  total_invitations: number
  pending_invitations: number
  accepted_invitations: number
  rejected_invitations: number
  expired_invitations: number
  primary_supervisions: number
  secondary_supervisions: number
}

interface Supervision {
  id: number
  supervisor_name: string
  supervisee_name: string
  supervisee_email: string
  role: string
  status: string
  created_at: string
  expires_at: string
  accepted_at: string | null
  rejected_at: string | null
  is_expired: boolean
  can_be_accepted: boolean
}

interface SupervisionManagementProps {
  onUpdate?: () => void // Callback to refresh parent dashboard
}

export const SupervisionManagement: React.FC<SupervisionManagementProps> = ({ onUpdate }) => {
  const [stats, setStats] = useState<SupervisionStats | null>(null)
  const [supervisions, setSupervisions] = useState<Supervision[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [refreshing, setRefreshing] = useState(false)
  const [pollMs, setPollMs] = useState(5000) // 5s, will backoff on errors

  useEffect(() => {
    fetchData()
  }, [])

  // Auto-refresh supervision data on interval (pause when hidden)
  useEffect(() => {
    if (document.hidden) return
    const id = setInterval(() => {
      fetchData(true) // Background refresh - no refreshing indicator
    }, pollMs)
    return () => clearInterval(id)
  }, [pollMs])

  // Refresh immediately on tab focus or visibility change
  useEffect(() => {
    const onFocus = () => fetchData(true) // Background refresh
    const onVisibility = () => {
      if (!document.hidden) fetchData(true) // Background refresh
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const fetchData = async (isBackgroundRefresh = false) => {
    // Only show refreshing indicator on manual refresh, not background refreshes
    if (!isBackgroundRefresh) {
      setRefreshing(true)
    }
    try {
      await Promise.all([
        fetchStats(),
        fetchSupervisions()
      ])
      // Reset poll interval on success
      if (pollMs !== 5000) setPollMs(5000)
    } catch (error) {
      console.error('Error fetching supervision data:', error)
      // Exponential backoff on errors
      setPollMs(Math.min(pollMs * 2, 60000)) // backoff up to 60s
    } finally {
      if (!isBackgroundRefresh) {
        setRefreshing(false)
      }
    }
  }

  const fetchStats = async () => {
    try {
      const response = await apiFetch('/api/supervisions/stats/')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchSupervisions = async () => {
    try {
      const response = await apiFetch('/api/supervisions/')
      if (response.ok) {
        const data = await response.json()
        setSupervisions(data)
      } else {
        toast.error('Failed to fetch supervisions')
      }
    } catch (error) {
      console.error('Error fetching supervisions:', error)
      toast.error('Error fetching supervisions')
    } finally {
      setLoading(false)
    }
  }

  const cancelInvitation = async (supervisionId: number) => {
    try {
      const response = await apiFetch(`/api/supervisions/${supervisionId}/cancel/`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Invitation cancelled successfully')
        await fetchData()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to cancel invitation')
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      toast.error('Error cancelling invitation')
    }
  }

  const removeSupervisee = async (supervisionId: number, superviseeEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${superviseeEmail} from your supervision stable? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await apiFetch(`/api/supervisions/${supervisionId}/remove/`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Supervisee removed successfully')
        await fetchData()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to remove supervisee')
      }
    } catch (error) {
      console.error('Error removing supervisee:', error)
      toast.error('Error removing supervisee')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING': { variant: 'secondary' as const, label: 'Pending', icon: Clock },
      'ACCEPTED': { variant: 'default' as const, label: 'Accepted', icon: CheckCircle },
      'REJECTED': { variant: 'destructive' as const, label: 'Rejected', icon: XCircle },
      'EXPIRED': { variant: 'outline' as const, label: 'Expired', icon: AlertCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getRoleBadge = (role: string) => {
    const isPrimary = role === 'PRIMARY'
    return (
      <Badge variant={isPrimary ? 'default' : 'secondary'}>
        {isPrimary ? 'Primary' : 'Secondary'}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const filteredSupervisions = supervisions.filter(supervision => {
    if (statusFilter === 'ALL') return true
    return supervision.status === statusFilter
  })

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Supervision Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Invitations</p>
                  <p className="text-2xl font-bold">{stats.total_invitations}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending_invitations}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Accepted</p>
                  <p className="text-2xl font-bold text-green-600">{stats.accepted_invitations}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Supervisions</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.primary_supervisions + stats.secondary_supervisions}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Management Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Supervision Invitations</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <EnrolSuperviseesModal
                trigger={
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Enrol Supervisees
                  </Button>
                }
                onEnrolmentComplete={() => {
                  fetchData()
                  if (onUpdate) {
                    onUpdate()
                  }
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter */}
          <div className="mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {filteredSupervisions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4" />
              <p>No supervision invitations found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSupervisions.map((supervision) => (
                <div key={supervision.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div>
                          <p className="font-medium text-sm truncate">{supervision.supervisee_name}</p>
                          <p className="text-xs text-gray-600 truncate">{supervision.supervisee_email}</p>
                        </div>
                        {getRoleBadge(supervision.role)}
                        {getStatusBadge(supervision.status)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Invited: {formatDate(supervision.created_at)}</span>
                        <span className={supervision.is_expired ? 'text-red-600' : ''}>
                          Expires: {formatDate(supervision.expires_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      {supervision.status === 'PENDING' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelInvitation(supervision.id)}
                          className="text-xs px-3 py-1 h-7"
                        >
                          Cancel
                        </Button>
                      )}
                      {supervision.status === 'ACCEPTED' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeSupervisee(supervision.id, supervision.supervisee_email)}
                          className="text-xs px-3 py-1 h-7"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default SupervisionManagement
