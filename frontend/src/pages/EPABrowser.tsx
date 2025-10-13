import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Search, 
  Filter,
  Award,
  Target,
  ExternalLink,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  BarChart3,
  List,
  Grid3X3,
  EyeOff
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { Link } from 'react-router-dom'

interface EPA {
  id: string
  code: string
  title: string
  description: string
  descriptors: string[]
  milestones: string[]
  tag: string
  m3_behaviours: string[]
  prompt: string
  created_at: string
  updated_at: string
}

interface Competency {
  id: string
  code: string
  title: string
  description: string
  descriptors: string[]
  created_at: string
  updated_at: string
}

export default function EPABrowser() {
  const [epas, setEpas] = useState<EPA[]>([])
  const [competencies, setCompetencies] = useState<Competency[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [competencyFilter, setCompetencyFilter] = useState('All')
  const [milestoneFilter, setMilestoneFilter] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed')
  const [showFilters, setShowFilters] = useState(false)
  const [expandedEPAs, setExpandedEPAs] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'code' | 'title' | 'descriptors'>('code')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [epasResponse, competenciesResponse] = await Promise.all([
        apiFetch('/api/epas/epas/'),
        apiFetch('/api/competencies/competencies/')
      ])
      
      if (epasResponse.ok && competenciesResponse.ok) {
        const epasData = await epasResponse.json()
        const competenciesData = await competenciesResponse.json()
        setEpas(epasData)
        setCompetencies(competenciesData)
      } else {
        console.error('Failed to fetch data')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedEPAs = useMemo(() => {
    let filtered = epas.filter(epa => {
      // Search filter
      const matchesSearch = searchQuery === '' || (
        epa.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        epa.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        epa.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        epa.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        epa.m3_behaviours.some(behaviour => 
          behaviour.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        epa.prompt.toLowerCase().includes(searchQuery.toLowerCase())
      )
      
      // Competency filter
      const matchesCompetency = competencyFilter === 'All' || 
        epa.descriptors.some(descriptor => {
          const competencyNum = competencyFilter.slice(1) // Remove 'C' prefix
          return descriptor.startsWith(competencyNum)
        })
      
      // Milestone filter
      const matchesMilestone = milestoneFilter.length === 0 || 
        milestoneFilter.some(milestone => epa.milestones.includes(milestone))
      
      return matchesSearch && matchesCompetency && matchesMilestone
    })

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'code':
          return a.code.localeCompare(b.code)
        case 'title':
          return a.title.localeCompare(b.title)
        case 'descriptors':
          return a.descriptors.length - b.descriptors.length
        default:
          return 0
      }
    })

    return filtered
  }, [epas, searchQuery, competencyFilter, milestoneFilter, sortBy])

  const getDescriptorCompetency = (descriptor: string) => {
    const competencyNum = descriptor.split('.')[0]
    const competency = competencies.find(c => c.code === `C${competencyNum}`)
    return competency
  }

  const toggleEPAExpansion = (epaId: string) => {
    const newExpanded = new Set(expandedEPAs)
    if (newExpanded.has(epaId)) {
      newExpanded.delete(epaId)
    } else {
      newExpanded.add(epaId)
    }
    setExpandedEPAs(newExpanded)
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setCompetencyFilter('All')
    setMilestoneFilter([])
  }

  const exportToCSV = () => {
    const headers = ['Code', 'Title', 'Description', 'Descriptors', 'Milestones', 'Tag', 'M3 Behaviours', 'Prompt']
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedEPAs.map(epa => [
        epa.code,
        `"${epa.title}"`,
        `"${epa.description}"`,
        `"${epa.descriptors.join('; ')}"`,
        `"${epa.milestones.join('; ')}"`,
        `"${epa.tag}"`,
        `"${epa.m3_behaviours.join('; ')}"`,
        `"${epa.prompt}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `epas-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading EPAs and competencies...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">EPA Report & Analysis</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'detailed' ? 'compact' : 'detailed')}
              className="flex items-center gap-2"
            >
              {viewMode === 'detailed' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              {viewMode === 'detailed' ? 'Compact View' : 'Detailed View'}
            </Button>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <Target className="h-6 w-6 text-blue-600 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-blue-900 mb-2">
                Entrustable Professional Activities (EPAs) Report
              </h2>
              <p className="text-blue-800 leading-relaxed mb-3">
                Comprehensive searchable report of EPAs with advanced filtering, sorting, and analysis capabilities. 
                Use the filters below to find specific EPAs by competency, milestone, or search terms.
              </p>
              <div className="flex gap-2">
                <Link 
                  to="/competencies" 
                  className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Competencies
                </Link>
                <Link 
                  to="/competency-viewer" 
                  className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  <Target className="h-4 w-4" />
                  Competency Viewer
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Search and Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {/* Basic Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search EPAs by title, description, code, tag, behaviours, or prompt..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(value: 'code' | 'title' | 'descriptors') => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code">Sort by Code</SelectItem>
                  <SelectItem value="title">Sort by Title</SelectItem>
                  <SelectItem value="descriptors">Sort by Descriptors</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="flex items-center gap-2"
              >
                <EyeOff className="h-4 w-4" />
                Clear All
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Filter by Competency
                </label>
                <Select value={competencyFilter} onValueChange={setCompetencyFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select competency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Competencies</SelectItem>
                    {competencies.map((competency) => (
                      <SelectItem key={competency.id} value={competency.code}>
                        {competency.code} - {competency.title.split(' ').slice(0, 4).join(' ')}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Filter by Milestones
                </label>
                <div className="flex flex-wrap gap-2">
                  {['L1', 'L2', 'L3', 'L4'].map((milestone) => (
                    <div key={milestone} className="flex items-center space-x-2">
                      <Checkbox
                        id={`milestone-${milestone}`}
                        checked={milestoneFilter.includes(milestone)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setMilestoneFilter([...milestoneFilter, milestone])
                          } else {
                            setMilestoneFilter(milestoneFilter.filter(m => m !== milestone))
                          }
                        }}
                      />
                      <label htmlFor={`milestone-${milestone}`} className="text-sm text-gray-700">
                        {milestone}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">{filteredAndSortedEPAs.length}</span> of{' '}
                <span className="font-medium text-gray-900">{epas.length}</span> EPAs
                {searchQuery && (
                  <span> matching "<span className="font-medium">{searchQuery}</span>"</span>
                )}
                {competencyFilter !== 'All' && (
                  <span> in <span className="font-medium">{competencyFilter}</span></span>
                )}
                {milestoneFilter.length > 0 && (
                  <span> with milestones: <span className="font-medium">{milestoneFilter.join(', ')}</span></span>
                )}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* EPAs List */}
      <div className="space-y-4">
        {filteredAndSortedEPAs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No EPAs found</h3>
              <p className="text-gray-600">
                Try adjusting your search terms or filters to find EPAs.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedEPAs.map((epa) => {
            const isExpanded = expandedEPAs.has(epa.id)
            
            return (
              <Card key={epa.id} id={epa.code} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="secondary" className="text-sm font-mono">
                          {epa.code}
                        </Badge>
                        <CardTitle className="text-xl leading-tight">
                          {epa.title}
                        </CardTitle>
                        {viewMode === 'compact' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEPAExpansion(epa.id)}
                            className="ml-auto"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                      {viewMode === 'compact' && (
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            {epa.descriptors.length} descriptor{epa.descriptors.length !== 1 ? 's' : ''}
                          </div>
                          <div className="flex items-center gap-1">
                            <Award className="h-4 w-4" />
                            {epa.milestones.join(', ')}
                          </div>
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            {epa.tag}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {(viewMode === 'detailed' || isExpanded) && (
                    <div className="space-y-4">
                      {/* Description */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Description
                        </h4>
                        <p className="text-gray-700 leading-relaxed">
                          {epa.description}
                        </p>
                      </div>

                    {/* Tag and Milestones */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          Tag
                        </h4>
                        <Badge variant="secondary" className="text-blue-800 bg-blue-200">
                          {epa.tag}
                        </Badge>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          Milestones
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {epa.milestones.map((milestone, index) => (
                            <Badge key={index} variant="outline" className="text-green-700 border-green-300">
                              {milestone}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* M3 Behaviours */}
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Observable Behaviours (M3)
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-purple-800">
                        {epa.m3_behaviours.map((behaviour, index) => (
                          <li key={index}>{behaviour}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Reflection Prompt */}
                    <div className="bg-amber-50 rounded-lg p-4">
                      <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Reflection Prompt
                      </h4>
                      <p className="text-amber-800 leading-relaxed italic">
                        {epa.prompt}
                      </p>
                    </div>

                    {/* Linked Descriptors */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Linked Competency Descriptors
                      </h4>
                      {epa.descriptors.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {epa.descriptors.map((descriptor, index) => {
                            const competency = getDescriptorCompetency(descriptor)
                            return (
                              <div key={index} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                                <Badge variant="outline" className="text-xs font-mono">
                                  {descriptor}
                                </Badge>
                                <div className="flex-1">
                                  {competency ? (
                                    <Link 
                                      to={`/competencies#${descriptor}`}
                                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                    >
                                      {competency.code} - {competency.title.split(' ').slice(0, 4).join(' ')}...
                                      <ExternalLink className="h-3 w-3" />
                                    </Link>
                                  ) : (
                                    <span className="text-sm text-gray-600">
                                      Competency {descriptor.split('.')[0]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">
                          No descriptors linked yet.
                        </div>
                      )}
                    </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-gray-200">
        <div className="text-center text-gray-600">
          <p className="text-sm">
            EPAs demonstrate specific competency descriptors for general registration as a psychologist in Australia.
          </p>
        </div>
      </div>
    </div>
  )
}
