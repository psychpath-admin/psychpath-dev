import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  Filter,
  Award,
  Target,
  ExternalLink,
  BookOpen
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { Link } from 'react-router-dom'

interface EPA {
  id: string
  code: string
  title: string
  description: string
  descriptors: string[]
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

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [epasResponse, competenciesResponse] = await Promise.all([
        apiFetch('/api/epas/api/epas/'),
        apiFetch('/api/competencies/api/competencies/')
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

  const filteredEPAs = useMemo(() => {
    return epas.filter(epa => {
      // Search filter
      const matchesSearch = searchQuery === '' || (
        epa.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        epa.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        epa.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
      
      // Competency filter
      const matchesCompetency = competencyFilter === 'All' || 
        epa.descriptors.some(descriptor => {
          const competencyNum = competencyFilter.slice(1) // Remove 'C' prefix
          return descriptor.startsWith(competencyNum)
        })
      
      return matchesSearch && matchesCompetency
    })
  }, [epas, searchQuery, competencyFilter])

  const getDescriptorCompetency = (descriptor: string) => {
    const competencyNum = descriptor.split('.')[0]
    const competency = competencies.find(c => c.code === `C${competencyNum}`)
    return competency
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
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Award className="h-8 w-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-900">EPA Catalogue & Search</h1>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <Target className="h-6 w-6 text-green-600 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-green-900 mb-2">
                Entrustable Professional Activities (EPAs)
              </h2>
              <p className="text-green-800 leading-relaxed mb-3">
                Browse and search EPAs that demonstrate specific competency descriptors. 
                Each EPA shows which professional competencies it addresses.
              </p>
              <div className="flex gap-2">
                <Link 
                  to="/competencies" 
                  className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Competencies
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search EPAs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={competencyFilter} onValueChange={setCompetencyFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Competency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Competencies</SelectItem>
                {competencies.map((competency) => (
                  <SelectItem key={competency.id} value={competency.code}>
                    {competency.code} - {competency.title.split(' ').slice(0, 3).join(' ')}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Showing {filteredEPAs.length} of {epas.length} EPAs
            {searchQuery && ` matching "${searchQuery}"`}
            {competencyFilter !== 'All' && ` in ${competencyFilter}`}
          </p>
        </div>
      </div>

      {/* EPAs List */}
      <div className="space-y-4">
        {filteredEPAs.length === 0 ? (
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
          filteredEPAs.map((epa) => {
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
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
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
