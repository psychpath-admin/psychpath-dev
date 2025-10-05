import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  ChevronDown, 
  ChevronRight,
  Users,
  Target,
  Award,
  ExternalLink
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { Link } from 'react-router-dom'

interface Competency {
  id: string
  code: string
  title: string
  description: string
  descriptors: string[]
  created_at: string
  updated_at: string
}

interface EPA {
  id: string
  code: string
  title: string
  description: string
  descriptors: string[]
  created_at: string
  updated_at: string
}

export default function CoreCompetencyViewer() {
  const [competencies, setCompetencies] = useState<Competency[]>([])
  const [epas, setEpas] = useState<EPA[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCompetencies, setExpandedCompetencies] = useState<Set<string>>(new Set())
  const [expandedDescriptors, setExpandedDescriptors] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [competenciesResponse, epasResponse] = await Promise.all([
        apiFetch('/api/competencies/api/competencies/'),
        apiFetch('/api/epas/api/epas/')
      ])
      
      if (competenciesResponse.ok && epasResponse.ok) {
        const competenciesData = await competenciesResponse.json()
        const epasData = await epasResponse.json()
        setCompetencies(competenciesData)
        setEpas(epasData)
      } else {
        console.error('Failed to fetch data')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCompetency = (competencyId: string) => {
    const newExpanded = new Set(expandedCompetencies)
    if (newExpanded.has(competencyId)) {
      newExpanded.delete(competencyId)
    } else {
      newExpanded.add(competencyId)
    }
    setExpandedCompetencies(newExpanded)
  }

  const toggleDescriptor = (descriptor: string) => {
    const newExpanded = new Set(expandedDescriptors)
    if (newExpanded.has(descriptor)) {
      newExpanded.delete(descriptor)
    } else {
      newExpanded.add(descriptor)
    }
    setExpandedDescriptors(newExpanded)
  }

  const expandAll = () => {
    setExpandedCompetencies(new Set(competencies.map(c => c.id)))
    setExpandedDescriptors(new Set(competencies.flatMap(c => c.descriptors)))
  }

  const collapseAll = () => {
    setExpandedCompetencies(new Set())
    setExpandedDescriptors(new Set())
  }

  const getLinkedEPAs = (descriptor: string) => {
    return epas.filter(epa => epa.descriptors.includes(descriptor))
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading competencies and EPAs...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Core Competency Viewer</h1>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <Target className="h-6 w-6 text-blue-600 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-blue-900 mb-2">
                Core Competencies for General Registration
              </h2>
              <p className="text-blue-800 leading-relaxed mb-3">
                This reference shows each professional competency and its descriptors. Click a descriptor to see which EPAs demonstrate it.
              </p>
              <div className="flex gap-2">
                <Link 
                  to="/epas" 
                  className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Browse EPAs
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={expandAll}
            className="flex items-center gap-2"
          >
            <ChevronDown className="h-4 w-4" />
            Expand All
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={collapseAll}
            className="flex items-center gap-2"
          >
            <ChevronRight className="h-4 w-4" />
            Collapse All
          </Button>
        </div>
      </div>

      {/* Competencies List */}
      <div className="space-y-4">
        {competencies.map((competency) => {
          const isExpanded = expandedCompetencies.has(competency.id)
          
          return (
            <Card key={competency.id} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleCompetency(competency.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-sm font-mono">
                      {competency.code}
                    </Badge>
                    <CardTitle className="text-lg leading-tight">
                      {competency.title}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {competency.descriptors.length} descriptors
                    </Badge>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Summary
                      </h4>
                      <p className="text-gray-700 leading-relaxed">
                        {competency.description}
                      </p>
                    </div>

                    {/* Descriptors and Linked EPAs */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Descriptors and Linked EPAs
                      </h4>
                      <div className="space-y-3">
                        {competency.descriptors.map((descriptor, index) => {
                          const linkedEPAs = getLinkedEPAs(descriptor)
                          const isDescriptorExpanded = expandedDescriptors.has(descriptor)
                          
                          return (
                            <div key={index} className="border border-gray-200 rounded-lg">
                              <div 
                                className="p-3 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                                onClick={() => toggleDescriptor(descriptor)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span className="font-medium text-gray-900">{descriptor}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {linkedEPAs.length} EPA{linkedEPAs.length !== 1 ? 's' : ''}
                                  </Badge>
                                </div>
                                {isDescriptorExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                )}
                              </div>
                              
                              {isDescriptorExpanded && (
                                <div className="px-3 pb-3 border-t border-gray-100 bg-gray-50">
                                  {linkedEPAs.length > 0 ? (
                                    <div className="pt-3 space-y-2">
                                      <p className="text-sm text-gray-600 mb-2">Linked EPAs:</p>
                                      {linkedEPAs.map((epa) => (
                                        <div key={epa.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                                          <Badge variant="secondary" className="text-xs font-mono">
                                            {epa.code}
                                          </Badge>
                                          <Link 
                                            to={`/epas#${epa.code}`}
                                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                          >
                                            {epa.title}
                                            <ExternalLink className="h-3 w-3" />
                                          </Link>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="pt-3 text-sm text-gray-500 italic">
                                      No EPAs linked to this descriptor yet.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-gray-200">
        <div className="text-center text-gray-600">
          <p className="text-sm">
            This reference is based on the AHPRA General Registration Competencies 
            effective December 1, 2025. EPAs demonstrate specific competency descriptors.
          </p>
        </div>
      </div>
    </div>
  )
}
