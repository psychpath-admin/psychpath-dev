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
  Award
} from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface Competency {
  id: string
  code: string
  title: string
  description: string
  descriptors: string[]
  created_at: string
  updated_at: string
}

export default function CoreCompetencyReference() {
  const [competencies, setCompetencies] = useState<Competency[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCompetencies, setExpandedCompetencies] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchCompetencies()
  }, [])

  const fetchCompetencies = async () => {
    try {
      const response = await apiFetch('/api/competencies/api/competencies/')
      if (response.ok) {
        const data = await response.json()
        setCompetencies(data)
      } else {
        console.error('Failed to fetch competencies')
      }
    } catch (error) {
      console.error('Error fetching competencies:', error)
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

  const expandAll = () => {
    setExpandedCompetencies(new Set(competencies.map(c => c.id)))
  }

  const collapseAll = () => {
    setExpandedCompetencies(new Set())
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading competencies...</div>
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
          <h1 className="text-3xl font-bold text-gray-900">Core Competency Reference</h1>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <Award className="h-6 w-6 text-blue-600 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-blue-900 mb-2">
                Professional Competencies for General Registration
              </h2>
              <p className="text-blue-800 leading-relaxed">
                The following competencies represent the essential capabilities required for general registration as a psychologist in Australia. 
                They apply across settings, client groups, and levels of complexity, and are informed by a health equity and human rights lens.
              </p>
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

                    {/* Descriptors */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Descriptors
                      </h4>
                      <div className="space-y-2">
                        {competency.descriptors.map((descriptor, index) => (
                          <div 
                            key={index}
                            className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                          >
                            <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <p className="text-gray-700 leading-relaxed">
                              {descriptor}
                            </p>
                          </div>
                        ))}
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
            effective December 1, 2025.
          </p>
        </div>
      </div>
    </div>
  )
}
