import React, { createContext, useContext, useState, ReactNode, useRef } from 'react'

interface ModalContextType {
  isModalOpen: boolean
  setModalOpen: (open: boolean) => void
  openReportIssue: (formData?: any) => void
  setReportIssueHandler: (handler: (formData?: any) => void) => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { 
  children: ReactNode
}) {
  const [isModalOpen, setModalOpen] = useState(false)
  const reportIssueHandlerRef = useRef<((formData?: any) => void) | null>(null)

  const openReportIssue = (formData?: any) => {
    if (reportIssueHandlerRef.current) {
      reportIssueHandlerRef.current(formData)
    }
  }

  const setReportIssueHandler = (handler: (formData?: any) => void) => {
    reportIssueHandlerRef.current = handler
  }

  return (
    <ModalContext.Provider value={{ 
      isModalOpen, 
      setModalOpen, 
      openReportIssue,
      setReportIssueHandler 
    }}>
      {children}
    </ModalContext.Provider>
  )
}

export function useModalContext() {
  const context = useContext(ModalContext)
  if (context === undefined) {
    throw new Error('useModalContext must be used within a ModalProvider')
  }
  return context
}
