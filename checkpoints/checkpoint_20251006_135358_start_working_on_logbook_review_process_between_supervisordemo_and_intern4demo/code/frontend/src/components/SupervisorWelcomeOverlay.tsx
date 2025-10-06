import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, CheckCircle, Users, GraduationCap, FileText, RotateCcw, AlertTriangle, BookOpen, Shield } from 'lucide-react'

interface SupervisorWelcomeOverlayProps {
  isOpen: boolean
  onClose: () => void
  onAcknowledge: () => void
}

export default function SupervisorWelcomeOverlay({ isOpen, onClose, onAcknowledge }: SupervisorWelcomeOverlayProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="bg-white shadow-2xl">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute right-4 top-4 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl font-bold text-blue-900 text-center pr-8">
              🧭 Welcome to PsychPathway — Supervisor Access
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6 px-6 pb-6">
            {/* Introduction */}
            <div className="text-center space-y-4">
              <p className="text-gray-700 text-lg leading-relaxed">
                As a Board-approved supervisor, your role is critical to the safe and competent development of 
                provisionally registered psychologists and registrar candidates. Before proceeding, please review 
                and acknowledge your responsibilities under the Psychology Board of Australia's guidelines.
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Supervisor Commitments */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Your Supervisor Commitments
              </h3>
              <p className="text-gray-700 mb-4">By continuing, you confirm that you:</p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Hold general registration with AHPRA</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Are a Board-approved supervisor, with current approval status</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Will supervise only within your area(s) of endorsement (if supervising registrars)</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-gray-700">
                    <span>Understand and comply with the supervision requirements set by PsyBA, including:</span>
                    <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
                      <li>Regular, structured supervision (e.g., at least fortnightly)</li>
                      <li>Ethical, non-conflicted supervisory relationships</li>
                      <li>Accurate logbook review and feedback</li>
                      <li>Competency-based evaluation using milestones and reflections</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Will maintain clear records and participate in audit processes if requested by AHPRA</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Responsibilities Overview */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Responsibilities Overview
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">Provisionals:</span>
                    <span className="text-gray-700"> You support their completion of weekly logbooks, track direct client contact, related activities, supervision sessions, and PD hours.</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <GraduationCap className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">Registrars:</span>
                    <span className="text-gray-700"> You evaluate their development within the endorsed scope, ensure proper hour tracking, and co-sign formal reports.</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">You must review and approve or reject weekly logbooks, provide feedback where needed, and record all comments in line with audit requirements.</span>
                </div>
                
                <div className="flex items-start gap-3">
                  <RotateCcw className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">You may be asked to unlock records with time limits or respond to supervisee clarifications.</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Professional Obligations */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Professional Obligations
              </h3>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-gray-700 mb-4">
                  PsychPathway facilitates your supervisory responsibilities, but ultimate accountability remains with you under PsyBA regulation. Ensure that your supervision aligns with:
                </p>
                
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span className="text-gray-700">AHPRA's Professional Competency Framework</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span className="text-gray-700">Relevant Endorsement Guidelines</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span className="text-gray-700">Supervision standards for internship and registrar programs</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Acknowledgement */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Acknowledgement
              </h3>
              
              <p className="text-gray-700">
                By clicking "I Acknowledge", you confirm that you understand and accept these responsibilities as a supervisor in PsychPathway.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center pt-4">
              <Button
                onClick={onAcknowledge}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2"
              >
                I Acknowledge
              </Button>
              <Button
                variant="outline"
                className="px-6 py-2"
                onClick={() => {
                  // Open supervisor guidelines in new tab
                  window.open('https://www.psychologyboard.gov.au/Standards-and-Guidelines/Codes-Guidelines-Policies.aspx', '_blank')
                }}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                View Supervisor Guidelines
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
