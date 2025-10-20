import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { CompetencyDefinition, CompetencyProgress } from '@/types/competency'

interface CompetencyGridProps {
  competencies: CompetencyDefinition[]
  competencyProgress: CompetencyProgress[]
  onCellClick?: (competency: string, level: string) => void
  compact?: boolean
  className?: string
}

const competencyLevels = ['M1', 'M2', 'M3', 'M4'] as const

const getCellColor = (progress: CompetencyProgress | null) => {
  if (!progress) return 'bg-gray-50 text-gray-400'
  
  const level = progress.current_milestone
  switch (level) {
    case 'M1': return 'bg-gray-100 text-gray-600'
    case 'M2': return 'bg-yellow-100 text-yellow-700'
    case 'M3': return 'bg-green-100 text-green-700'
    case 'M4': return 'bg-green-200 text-green-800'
    default: return 'bg-gray-100 text-gray-600'
  }
}

const getEvidenceBadges = (progress: CompetencyProgress | null) => {
  if (!progress) return []
  
  const badges = []
  if (progress.m1_count > 0) {
    badges.push({ label: 'M1', count: progress.m1_count, color: 'bg-gray-100 text-gray-700' })
  }
  if (progress.m2_count > 0) {
    badges.push({ label: 'M2', count: progress.m2_count, color: 'bg-yellow-100 text-yellow-700' })
  }
  if (progress.m3_count > 0) {
    badges.push({ label: 'M3', count: progress.m3_count, color: 'bg-green-100 text-green-700' })
  }
  if (progress.m4_count > 0) {
    badges.push({ label: 'M4', count: progress.m4_count, color: 'bg-green-200 text-green-800' })
  }
  return badges
}

export function CompetencyGrid({ 
  competencies,
  competencyProgress, 
  onCellClick, 
  compact = false,
  className = '' 
}: CompetencyGridProps) {
  // Create a map for quick lookup
  const progressMap = new Map(competencyProgress.map(item => [item.competency_code, item]))

  return (
    <Card className={className}>
      <CardHeader className={compact ? 'pb-3' : 'pb-4'}>
        <CardTitle className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>
          Competency Progress
        </CardTitle>
        <p className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'}`}>
          Click cells to view supporting evidence
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className={`${compact ? 'px-2 py-2' : 'px-4 py-3'} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  Competency
                </th>
                {competencyLevels.map(level => (
                  <th 
                    key={level} 
                    className={`${compact ? 'px-2 py-2' : 'px-4 py-3'} text-center text-xs font-medium text-gray-500 uppercase tracking-wider`}
                  >
                    {level}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {competencies.map(competency => {
                const progress = progressMap.get(competency.code) || null
                const evidenceBadges = getEvidenceBadges(progress)
                
                return (
                  <tr key={competency.code} className="hover:bg-gray-50">
                    <td className={`${compact ? 'px-2 py-2' : 'px-4 py-3'} text-sm text-gray-900`}>
                      <div className="flex flex-col">
                        <span className="font-medium">{competency.code}</span>
                        <span className="text-xs text-gray-500 truncate max-w-48">
                          {competency.name}
                        </span>
                      </div>
                    </td>
                    {competencyLevels.map(level => {
                      const isCurrentLevel = progress?.current_milestone === level
                      const cellColor = getCellColor(progress)
                      
                      return (
                        <td 
                          key={level}
                          className={`${compact ? 'px-2 py-2' : 'px-4 py-3'} text-center`}
                        >
                          <div 
                            className={`${cellColor} rounded-lg ${compact ? 'p-2' : 'p-3'} cursor-pointer hover:opacity-80 transition-opacity`}
                            onClick={() => onCellClick?.(competency.code, level)}
                          >
                            {isCurrentLevel && (
                              <div className="font-bold text-sm">
                                {level}
                              </div>
                            )}
                            {evidenceBadges.length > 0 && (
                              <div className={`flex flex-wrap gap-1 ${compact ? 'mt-1' : 'mt-2'} justify-center`}>
                                {evidenceBadges.map((badge, index) => (
                                  <Badge 
                                    key={index}
                                    variant="outline" 
                                    className={`${badge.color} ${compact ? 'text-xs px-1 py-0' : 'text-xs px-2 py-0'}`}
                                  >
                                    {badge.label}{badge.count > 1 ? ` ${badge.count}` : ''}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        <div className={`${compact ? 'p-3' : 'p-4'} bg-gray-50 border-t border-gray-200`}>
          <div className="flex flex-wrap gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="bg-gray-100 text-gray-700 text-xs px-2 py-0">M1</Badge>
              <span>Novice Evidence</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0">M2</Badge>
              <span>Developing Evidence</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="bg-green-100 text-green-700 text-xs px-2 py-0">M3</Badge>
              <span>Proficient Evidence</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="bg-green-200 text-green-800 text-xs px-2 py-0">M4</Badge>
              <span>Advanced Evidence</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
