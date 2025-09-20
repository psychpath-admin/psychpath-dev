import { useLocation, useNavigate } from 'react-router-dom'
import SectionADashboard from './SectionADashboard'
import SectionAForm from './SectionAForm'

export default function SectionA() {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Check if we're on the create or edit route
  const isCreateRoute = location.pathname === '/section-a/create'
  const isEditRoute = location.pathname.startsWith('/section-a/edit/')
  
  if (isCreateRoute || isEditRoute) {
    const entryId = isEditRoute ? location.pathname.split('/').pop() : undefined
    return <SectionAForm onCancel={() => navigate('/section-a')} entryId={entryId || undefined} />
  }
  
  // Use the new modern dashboard by default
  return <SectionADashboard />
}