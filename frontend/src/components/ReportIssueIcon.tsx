import { Button } from '@/components/ui/button'
import { Bug } from 'lucide-react'
import { useModalContext } from '@/contexts/ModalContext'
import { captureModalFormData } from '@/utils/contextCapture'

export default function ReportIssueIcon() {
  const { openReportIssue } = useModalContext()

  const handleClick = async () => {
    try {
      // Capture form data from the current modal
      const formContext = await captureModalFormData()
      
      // Create enhanced context data that includes the modal form data
      const modalFormData = formContext ? {
        pageUrl: window.location.href,
        pagePath: window.location.pathname,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        formData: formContext
      } : null

      // Open the report issue modal with captured form data
      openReportIssue(modalFormData)
    } catch (error) {
      console.error('Failed to capture modal form data:', error)
      // Still open the report issue modal, just without the form data
      openReportIssue()
    }
  }

  return (
    <Button
      onClick={handleClick}
      size="sm"
      className="w-8 h-8 p-0 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-shadow"
    >
      <Bug className="h-4 w-4" />
    </Button>
  )
}
