import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle, Info, BookOpen, X } from 'lucide-react'
import { useState } from 'react'

interface QualityFeedbackProps {
  quality: 'strong' | 'adequate' | 'basic' | null
  score: number
  feedback: string[]
  prompts: string[]
  onGetSuggestions: () => void
  showPrompts: boolean
  fieldType?: 'presenting_issues' | 'reflection'
}

export function QualityFeedback({ 
  quality, 
  score, 
  feedback, 
  prompts, 
  onGetSuggestions, 
  showPrompts,
  fieldType = 'presenting_issues'
}: QualityFeedbackProps) {
  const [showCompetencies, setShowCompetencies] = useState(false)
  
  // AHPRA Competencies data
  const ahpraCompetencies = [
    {
      code: 'C1',
      title: 'Applies and builds scientific knowledge of psychology',
      description: 'Uses current psychological theory and research to inform case formulation, assessment choices, and treatment planning. Thinks critically about evidence quality and can explain the scientific rationale for clinical decisions.'
    },
    {
      code: 'C2', 
      title: 'Practices ethically and professionally',
      description: 'Acts consistently with the Code of Conduct and legal obligations. Maintains clear boundaries, confidentiality, informed consent, accurate records, and seeks supervision when dilemmas arise.'
    },
    {
      code: 'C3',
      title: 'Exercises professional reflexivity, purposeful and deliberate practice, and self‑care',
      description: 'Regularly examines how personal values, culture, biases, and power dynamics affect practice. Uses feedback, supervision, and CPD to target growth areas, and maintains wellbeing to practise safely.'
    },
    {
      code: 'C4',
      title: 'Conducts psychological assessment',
      description: 'Selects and administers appropriate, validated assessment methods. Integrates data from multiple sources into clear, useful formulations and reports that inform next steps.'
    },
    {
      code: 'C5',
      title: 'Conducts psychological intervention',
      description: 'Implements evidence-based interventions tailored to client needs and context. Monitors progress, adjusts approach as needed, and evaluates outcomes effectively.'
    },
    {
      code: 'C6',
      title: 'Communicates effectively',
      description: 'Builds rapport, communicates clearly with diverse clients and stakeholders, and adapts communication style to context and audience needs.'
    },
    {
      code: 'C7',
      title: 'Works effectively with culturally diverse clients and communities',
      description: 'Demonstrates cultural competence, awareness of diversity issues, and adapts practice to be culturally responsive and inclusive.'
    },
    {
      code: 'C8',
      title: 'Works effectively with other professionals and systems',
      description: 'Collaborates effectively with colleagues, other professionals, and systems. Contributes to multidisciplinary teams and understands broader service delivery contexts.'
    }
  ]
  
  if (!quality) {
    return (
      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
        💡 Type more text and click away to see quality feedback and suggestions
      </div>
    )
  }
  
  const qualityConfig = {
    strong: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      textColor: 'text-green-800',
      icon: CheckCircle2,
      iconColor: 'text-green-600'
    },
    adequate: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
      textColor: 'text-yellow-800',
      icon: Info,
      iconColor: 'text-yellow-600'
    },
    basic: {
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      textColor: 'text-orange-800',
      icon: AlertCircle,
      iconColor: 'text-orange-600'
    }
  }
  
  const config = qualityConfig[quality]
  const Icon = config.icon
  
  return (
    <div className={`mt-2 p-3 border rounded-md ${config.bgColor} ${config.borderColor} ${config.textColor}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.iconColor}`} />
          <span className="text-sm font-medium">
            Clinical Quality: {quality.charAt(0).toUpperCase() + quality.slice(1)} ({score}/100)
          </span>
        </div>
        <div className="flex gap-2">
          {prompts.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onGetSuggestions}
              className="text-xs h-7 px-2"
            >
              💡 {showPrompts ? 'Hide' : 'Get'} Suggestions
            </Button>
          )}
          {fieldType === 'reflection' && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowCompetencies(true)}
              className="text-xs h-7 px-2"
            >
              <BookOpen className="w-3 h-3 mr-1" />
              AHPRA Competencies
            </Button>
          )}
        </div>
      </div>
      
      {feedback.length > 0 && (
        <ul className="text-xs space-y-1 mb-2">
          {feedback.map((msg, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="mt-0.5">•</span>
              <span>{msg}</span>
            </li>
          ))}
        </ul>
      )}
      
      {showPrompts && prompts.length > 0 && (
        <div className="mt-3 pt-3 border-t border-current/20">
          <p className="text-xs font-semibold mb-2">
            Consider these questions to strengthen your entry:
          </p>
          <ul className="text-xs space-y-1.5">
            {prompts.map((prompt, i) => (
              <li key={i} className="flex items-start gap-1.5 pl-1">
                <span className="text-current/70 flex-shrink-0">→</span>
                <span>{prompt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <p className="mt-2 text-xs italic opacity-75">
        Note: This is advisory only - you can save your entry at any time.
      </p>
      
      {/* AHPRA Competencies Modal */}
      {showCompetencies && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                AHPRA Core Competencies for Provisional Psychologists
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCompetencies(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                These are the core competencies you're being assessed against. Use them to guide your reflection and demonstrate your professional development.
              </p>
              <div className="space-y-6">
                {ahpraCompetencies.map((comp) => (
                  <div key={comp.code} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-800 text-sm font-bold px-2 py-1 rounded flex-shrink-0">
                        {comp.code}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {comp.title}
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {comp.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> When writing your reflection, consider which of these competencies you demonstrated or developed during this clinical interaction. This will help you write more targeted and meaningful reflections.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

