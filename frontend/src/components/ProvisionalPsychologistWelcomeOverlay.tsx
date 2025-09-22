import React from 'react';
import { X, CheckCircle, Users, Shield, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProvisionalPsychologistWelcomeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

const ProvisionalPsychologistWelcomeOverlay: React.FC<ProvisionalPsychologistWelcomeOverlayProps> = ({
  isOpen,
  onClose,
  onContinue
}) => {
  if (!isOpen) return null;

  const sections = [
    {
      icon: CheckCircle,
      heading: "✅ Your Responsibilities",
      bullets: [
        "Log weekly activities in Section A (DCC/CRA), Section B (PD), and Section C (Supervision)",
        "Write accurate, reflective entries for each logged activity",
        "Maintain ongoing reflections to track growth",
        "Submit completed logbooks once supervisors are assigned"
      ]
    },
    {
      icon: Users,
      heading: "🧾 Supervision",
      bullets: [
        "You must assign one Primary and one Secondary Supervisor",
        "Supervisors may be inside or outside the system",
        "You'll provide their name and email when submitting your first logbook"
      ]
    },
    {
      icon: Shield,
      heading: "⚖️ Compliance",
      bullets: [
        "Maximum of 60 Simulated DCC (SDCC) hours can count toward registration",
        "Internship must be at least 44 full-time equivalent weeks",
        "All logbook activity is auditable and may be reviewed by AHPRA"
      ]
    },
    {
      icon: Lightbulb,
      heading: "💡 Tips",
      bullets: [
        "Logging can begin before supervisors are linked",
        "Weekly commitment is optional, but helps track pace",
        "Supervisor comments become visible after logbook review"
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold text-blue-600 mb-2">
                👋 Welcome to PsychPATH
              </CardTitle>
              <p className="text-lg text-gray-600">
                Supporting Your Journey to General Registration
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="ml-4"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {sections.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <div key={index} className="space-y-3">
                <div className="flex items-center gap-3">
                  <IconComponent className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-800">
                    {section.heading}
                  </h3>
                </div>
                <ul className="space-y-2 ml-8">
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex} className="flex items-start gap-2 text-gray-700">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <p className="text-sm text-blue-800 font-medium">
              <strong>Acknowledgement:</strong> By continuing, you acknowledge your obligations under the 5+1 internship and agree to maintain accurate records.
            </p>
          </div>
          
          <div className="flex justify-center pt-4">
            <Button
              onClick={onContinue}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2"
            >
              Continue to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProvisionalPsychologistWelcomeOverlay;
