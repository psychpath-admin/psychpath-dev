import { useLocation, useNavigate } from 'react-router-dom'
import SectionADashboard from './SectionADashboard'
import SectionAForm from './SectionAForm'

export default function SectionA() {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Check if we're on the create route
  const isCreateRoute = location.pathname === '/section-a/create'
  
  if (isCreateRoute) {
    return <SectionAForm onCancel={() => navigate('/section-a')} />
  }
  
  // Use the new modern dashboard by default
  return <SectionADashboard />
}