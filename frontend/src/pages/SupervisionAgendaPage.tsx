import React from 'react'
import SupervisionAgendaPanel from '@/components/SupervisionAgendaPanel'

const SupervisionAgendaPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <SupervisionAgendaPanel />
      </div>
    </div>
  )
}

export default SupervisionAgendaPage
