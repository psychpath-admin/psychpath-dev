import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BookOpen, Shield, Brain, Target, MessageSquare, Heart, Globe } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const CompetenciesHelp: React.FC = () => {
  const navigate = useNavigate()

  const competencies = [
    {
      id: 1,
      title: 'Applies and builds scientific knowledge of psychology',
      description: 'Uses current psychological theory and research to inform case formulation, assessment choices, and treatment planning. Thinks critically about evidence quality and can explain the scientific rationale for clinical decisions.',
      icon: Brain,
      color: 'bg-blue-100 text-blue-800'
    },
    {
      id: 2,
      title: 'Practices ethically and professionally',
      description: 'Acts consistently with the Code of Conduct and legal obligations. Maintains clear boundaries, confidentiality, informed consent, accurate records, and seeks supervision when dilemmas arise.',
      icon: Shield,
      color: 'bg-green-100 text-green-800'
    },
    {
      id: 3,
      title: 'Exercises professional reflexivity, purposeful and deliberate practice, and self‑care',
      description: 'Regularly examines how personal values, culture, biases, and power dynamics affect practice. Uses feedback, supervision, and CPD to target growth areas, and maintains wellbeing to practise safely.',
      icon: Target,
      color: 'bg-purple-100 text-purple-800'
    },
    {
      id: 4,
      title: 'Conducts psychological assessment',
      description: 'Selects and administers appropriate, validated assessment methods. Integrates data from multiple sources into clear, useful formulations and reports that inform next steps.',
      icon: BookOpen,
      color: 'bg-orange-100 text-orange-800'
    },
    {
      id: 5,
      title: 'Conducts psychological intervention',
      description: 'Plans and delivers evidence‑based interventions tailored to client goals, context, and preferences. Monitors outcomes and adapts approach when progress stalls or needs change.',
      icon: Target,
      color: 'bg-red-100 text-red-800'
    },
    {
      id: 6,
      title: 'Communicates and relates to others effectively and appropriately',
      description: 'Builds therapeutic rapport and communicates clearly with clients, families, and teams. Uses digital and telehealth tools appropriately, including privacy, consent, and modality‑specific limits.',
      icon: MessageSquare,
      color: 'bg-cyan-100 text-cyan-800'
    },
    {
      id: 7,
      title: 'Demonstrates a health equity and human rights approach with people from diverse groups',
      description: 'Works inclusively and without discrimination across culture, language, disability, gender, sexuality, and other identities. Applies trauma‑aware, culturally informed care and adapts practice to reduce barriers and promote equitable access.',
      icon: Heart,
      color: 'bg-pink-100 text-pink-800'
    },
    {
      id: 8,
      title: 'Demonstrates a health equity and human rights approach with Aboriginal and Torres Strait Islander peoples, families, and communities',
      description: 'Provides culturally safe, trauma‑aware, self‑determined care as defined by Aboriginal and Torres Strait Islander peoples. Engages in ongoing critical reflection and collaborates to support community priorities and client self‑determination.',
      icon: Globe,
      color: 'bg-yellow-100 text-yellow-800'
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-blue-900 mb-2">
            AHPRA Professional Competencies for Psychologists
          </h1>
          <p className="text-blue-800 mb-4">
            The eight core competency domains for provisional psychologists, reflecting the updated Professional competencies 
            for psychologists coming into effect 1 December 2025.
          </p>
          <div className="bg-blue-100 border border-blue-300 rounded p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> These revised competencies apply from 1 December 2025 and set the threshold for safe and effective practice. 
              Provisional psychologists demonstrate progressive development across placements with supervisor oversight and the National Psychology Exam aligned to these domains.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {competencies.map((competency) => {
          const IconComponent = competency.icon
          return (
            <Card key={competency.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${competency.color}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <span className="text-lg">{competency.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  {competency.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          How to Use This Information
        </h3>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-semibold">•</span>
            <span>When logging professional development activities, select the competencies that were developed or demonstrated during the activity.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-semibold">•</span>
            <span>Consider how the activity contributed to your understanding and application of each selected competency.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-semibold">•</span>
            <span>Use the reflection field to describe specific examples of how you applied or developed these competencies.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-semibold">•</span>
            <span>Regularly review your competency development across all eight domains to ensure balanced growth.</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default CompetenciesHelp
