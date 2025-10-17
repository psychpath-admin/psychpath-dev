import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Target, 
  Users, 
  Filter,
  Search,
  Eye,
  BarChart3
} from 'lucide-react'

interface RoadmapItem {
  id: number
  subject: string
  ticket_type: string
  stage: string
  business_value: string
  effort_estimate: string
  target_milestone: string | null
  priority: string
  created_at: string
  user: {
    name: string
  }
}

interface RoadmapFilters {
  stage: string[]
  ticketType: string[]
  milestone: string
  priority: string[]
}

const STAGE_COLORS = {
  'PLANNED': 'bg-blue-100 text-blue-800 border-blue-200',
  'IN_DEVELOPMENT': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'TESTING': 'bg-purple-100 text-purple-800 border-purple-200',
  'DEPLOYED': 'bg-green-100 text-green-800 border-green-200'
}


const BUSINESS_VALUE_COLORS = {
  'CRITICAL': 'text-red-600',
  'HIGH': 'text-orange-600',
  'MEDIUM': 'text-blue-600',
  'LOW': 'text-gray-600'
}

const EFFORT_SIZES = {
  'XS': 'w-4 h-4',
  'S': 'w-6 h-6',
  'M': 'w-8 h-8',
  'L': 'w-10 h-10',
  'XL': 'w-12 h-12'
}

export default function Roadmap() {
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<RoadmapFilters>({
    stage: [],
    ticketType: [],
    milestone: 'ALL',
    priority: []
  })

  useEffect(() => {
    fetchRoadmap()
  }, [])

  const fetchRoadmap = async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/support/api/roadmap/')
      if (response.ok) {
        const data = await response.json()
        setRoadmapItems(data.roadmap || [])
      } else {
        setError('Failed to load roadmap')
      }
    } catch (error) {
      console.error('Error fetching roadmap:', error)
      setError('Failed to load roadmap')
    } finally {
      setLoading(false)
    }
  }

  // Filter and search logic
  const filteredItems = roadmapItems.filter(item => {
    // Search filter
    if (searchTerm && !item.subject.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    
    // Stage filter
    if (filters.stage.length > 0 && !filters.stage.includes(item.stage)) {
      return false
    }
    
    // Ticket type filter
    if (filters.ticketType.length > 0 && !filters.ticketType.includes(item.ticket_type)) {
      return false
    }
    
    // Milestone filter
    if (filters.milestone !== 'ALL' && item.target_milestone !== filters.milestone) {
      return false
    }
    
    // Priority filter
    if (filters.priority.length > 0 && !filters.priority.includes(item.priority)) {
      return false
    }
    
    return true
  })

  // Group by business value for fishbone/timeline view
  const groupedItems = filteredItems.reduce((acc, item) => {
    const key = item.business_value
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(item)
    return acc
  }, {} as Record<string, RoadmapItem[]>)

  // Sort business values by priority
  const businessValueOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
  const sortedGroups = businessValueOrder.filter(bv => groupedItems[bv]?.length > 0)

  const handleFilterChange = (filterType: keyof RoadmapFilters, value: string | string[]) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }

  const toggleArrayFilter = (filterType: 'stage' | 'ticketType' | 'priority', value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter(v => v !== value)
        : [...prev[filterType], value]
    }))
  }

  // Get unique milestones
  const milestones = [...new Set(roadmapItems.map(item => item.target_milestone).filter(Boolean))]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading roadmap...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchRoadmap}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-8 w-8" />
                Development Roadmap
              </h1>
              <p className="text-gray-600 mt-2">
                Visual timeline of planned features and tasks
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Eye className="h-4 w-4" />
              Read-only view for all users
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {roadmapItems.filter(item => item.stage === 'PLANNED').length}
                </div>
                <p className="text-sm text-gray-600">Planned</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {roadmapItems.filter(item => item.stage === 'IN_DEVELOPMENT').length}
                </div>
                <p className="text-sm text-gray-600">In Development</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {roadmapItems.filter(item => item.stage === 'TESTING').length}
                </div>
                <p className="text-sm text-gray-600">Testing</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {roadmapItems.filter(item => item.stage === 'DEPLOYED').length}
                </div>
                <p className="text-sm text-gray-600">Deployed</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Milestone Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Milestone
                </label>
                <Select value={filters.milestone} onValueChange={(value) => handleFilterChange('milestone', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All milestones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All milestones</SelectItem>
                    {milestones.map(milestone => (
                      <SelectItem key={milestone} value={milestone!}>
                        {milestone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stage Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stage
                </label>
                <div className="space-y-2">
                  {['PLANNED', 'IN_DEVELOPMENT', 'TESTING', 'DEPLOYED'].map(stage => (
                    <div key={stage} className="flex items-center space-x-2">
                      <Checkbox
                        id={`stage-${stage}`}
                        checked={filters.stage.includes(stage)}
                        onCheckedChange={() => toggleArrayFilter('stage', stage)}
                      />
                      <label htmlFor={`stage-${stage}`} className="text-sm text-gray-700">
                        {stage.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <div className="space-y-2">
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(priority => (
                    <div key={priority} className="flex items-center space-x-2">
                      <Checkbox
                        id={`priority-${priority}`}
                        checked={filters.priority.includes(priority)}
                        onCheckedChange={() => toggleArrayFilter('priority', priority)}
                      />
                      <label htmlFor={`priority-${priority}`} className="text-sm text-gray-700">
                        {priority}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roadmap Timeline View */}
        <div className="space-y-8">
          {sortedGroups.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No roadmap items found matching your filters.</p>
              </CardContent>
            </Card>
          ) : (
            sortedGroups.map(businessValue => (
              <div key={businessValue}>
                {/* Business Value Header */}
                <div className="flex items-center gap-3 mb-4">
                  <h3 className={`text-xl font-semibold ${BUSINESS_VALUE_COLORS[businessValue as keyof typeof BUSINESS_VALUE_COLORS]}`}>
                    {businessValue} Priority
                  </h3>
                  <Badge variant="outline">
                    {groupedItems[businessValue].length} items
                  </Badge>
                </div>

                {/* Timeline Spine */}
                <div className="relative">
                  {/* Central spine line */}
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                  
                  <div className="space-y-4 ml-16">
                    {groupedItems[businessValue].map((item, index) => (
                      <div key={item.id} className={`relative flex items-center ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                        {/* Branch line */}
                        <div className={`absolute ${index % 2 === 0 ? 'right-full mr-4' : 'left-full ml-4'} top-1/2 w-16 h-0.5 bg-gray-400`}></div>
                        
                        {/* Item card */}
                        <Card className={`w-80 ${index % 2 === 0 ? 'mr-24' : 'ml-24'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge className={`${STAGE_COLORS[item.stage as keyof typeof STAGE_COLORS]} text-xs`}>
                                  {item.stage.replace('_', ' ')}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {item.ticket_type}
                                </Badge>
                              </div>
                              <div className={`w-3 h-3 rounded-full ${EFFORT_SIZES[item.effort_estimate as keyof typeof EFFORT_SIZES]} bg-blue-400`}></div>
                            </div>
                            
                            <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
                              {item.subject}
                            </h4>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {item.user.name}
                              </div>
                              {item.target_milestone && (
                                <div className="flex items-center gap-1">
                                  <Target className="h-3 w-3" />
                                  {item.target_milestone}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
