import { useLocation, useNavigate } from 'react-router-dom'
import SectionADashboard from './SectionADashboard'
import SectionAForm from './SectionAForm'

export default function SectionA() {
  const location = useLocation()
  const navigate = useNavigate()
  
  console.log('SectionA component rendered, pathname:', location.pathname)
  
  // Check if we're on the create or edit route
  const isCreateRoute = location.pathname === '/section-a/create'
  const isEditRoute = location.pathname.startsWith('/section-a/edit/')
  
  console.log('isCreateRoute:', isCreateRoute, 'isEditRoute:', isEditRoute)
  
  if (isCreateRoute || isEditRoute) {
    const entryId = isEditRoute ? location.pathname.split('/').pop() : undefined
    const returnTo = (location.state as any)?.returnTo as string | undefined
    const handleCancel = () => {
      if (returnTo) {
        navigate(returnTo)
      } else {
        navigate('/section-a')
      }
    }
    console.log('Rendering SectionAForm with entryId:', entryId, 'returnTo:', returnTo)
    return <SectionAForm onCancel={handleCancel} entryId={entryId || undefined} />
  }
  
  // Use the new modern dashboard by default
  return <SectionADashboard />
}