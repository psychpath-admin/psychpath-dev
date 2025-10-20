import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Filter,
  Calendar,
  Clock,
  Star,
  BookOpen,
  Target,
  Users
} from 'lucide-react'
import { CPDActivityForm } from '@/components/cpd/CPDActivityForm'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import type { CPDActivity, CPDCategory, CPDActivitySummary } from '@/types/cpd'
import { getActivityTypeLabel, getStatusLabel, getComplianceStatusColor } from '@/types/cpd'

export default function CPDActivitiesPage() {
  const navigate = useNavigate()
  const [activities, setActivities] = useState<CPDActivitySummary[]>([])
  const [categories, setCategories] = useState<CPDCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingActivity, setEditingActivity] = useState<CPDActivity | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load activities
      const activitiesRes = await apiFetch('/api/cpd/activities/summary/')
      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json()
        setActivities(activitiesData)
      }

      // Load categories
      const categoriesRes = await apiFetch('/api/cpd/categories/')
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData)
      }
    } catch (error) {
      console.error('Error loading CPD data:', error)
      toast.error('Failed to load CPD data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (formData: Partial<CPDActivity>) => {
    setSaving(true)
    try {
      const url = editingActivity
        ? `/api/cpd/activities/${editingActivity.id}/`
        : '/api/cpd/activities/'
      const method = editingActivity ? 'PUT' : 'POST'

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast.success(editingActivity ? 'Activity updated' : 'Activity created')
        setShowForm(false)
        setEditingActivity(null)
        loadData()
      } else {
        const errorData = await res.json()
        toast.error(errorData.detail || 'Failed to save activity')
      }
    } catch (error) {
      console.error('Error saving activity:', error)
      toast.error('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this CPD activity?')) return

    try {
      const res = await apiFetch(`/api/cpd/activities/${id}/`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Activity deleted')
        loadData()
      } else {
        toast.error('Failed to delete activity')
      }
    } catch (error) {
      console.error('Error deleting activity:', error)
      toast.error('An error occurred')
    }
  }

  const handleEdit = async (id: number) => {
    try {
      const res = await apiFetch(`/api/cpd/activities/${id}/`)
      if (res.ok) {
        const activityData = await res.json()
        setEditingActivity(activityData)
        setShowForm(true)
      } else {
        toast.error('Failed to load activity details')
      }
    } catch (error) {
      console.error('Error loading activity:', error)
      toast.error('An error occurred')
    }
  }

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || activity.activity_type === filterType
    const matchesStatus = filterStatus === 'all' || activity.status === filterStatus
    const matchesYear = activity.activity_date.startsWith(filterYear)
    
    return matchesSearch && matchesType && matchesStatus && matchesYear
  })

  const activityTypes = Array.from(new Set(activities.map(a => a.activity_type)))
  const statuses = Array.from(new Set(activities.map(a => a.status)))
  const years = Array.from(new Set(activities.map(a => a.activity_date.split('-')[0]))).sort((a, b) => b.localeCompare(a))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-700 to-blue-900 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="h-8 w-8" />
                CPD Activities
              </CardTitle>
              <p className="text-blue-100 mt-1">
                Manage your Continuing Professional Development activities
              </p>
            </div>
            <Button
              onClick={() => { setEditingActivity(null); setShowForm(true) }}
              className="bg-white text-blue-700 hover:bg-gray-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Activity
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {activityTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {getActivityTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Year</label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredActivities.map((activity) => (
          <Card key={activity.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                    {activity.title}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {getActivityTypeLabel(activity.activity_type)}
                    </Badge>
                    {activity.is_active_cpd && (
                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                        Active CPD
                      </Badge>
                    )}
                    {activity.is_peer_consultation && (
                      <Badge variant="default" className="bg-purple-100 text-purple-800 text-xs">
                        Peer Consultation
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(activity.id)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(activity.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(activity.activity_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{activity.duration_hours}h</span>
                </div>
                {activity.quality_rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{activity.quality_rating}/5</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getComplianceStatusColor(activity.status)}`}
                  >
                    {getStatusLabel(activity.status)}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredActivities.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activities.length === 0 ? 'No CPD activities yet' : 'No activities match your filters'}
            </h3>
            <p className="text-gray-600 mb-4">
              {activities.length === 0 
                ? 'Start building your CPD portfolio by adding your first activity.'
                : 'Try adjusting your search criteria to find activities.'
              }
            </p>
            {activities.length === 0 && (
              <Button
                onClick={() => { setEditingActivity(null); setShowForm(true) }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Activity
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingActivity ? 'Edit CPD Activity' : 'New CPD Activity'}
            </DialogTitle>
          </DialogHeader>
          <CPDActivityForm
            activity={editingActivity}
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            saving={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
