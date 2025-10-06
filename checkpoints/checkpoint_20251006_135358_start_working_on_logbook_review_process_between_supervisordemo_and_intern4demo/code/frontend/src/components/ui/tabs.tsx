import React, { createContext, useContext } from 'react'

type TabsContextValue = {
  value: string
  onValueChange?: (value: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

type TabsProps = {
  value: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}

export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = useContext(TabsContext)
  const isActive = ctx?.value === value
  return (
    <button
      type="button"
      onClick={() => ctx?.onValueChange?.(value)}
      className={
        className ??
        `px-3 py-1 text-sm border ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'} rounded`
      }
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = useContext(TabsContext)
  if (ctx?.value !== value) return null
  return <div className={className}>{children}</div>
}

