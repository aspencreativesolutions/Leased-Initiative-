import { createContext, useContext, useState, type ReactNode } from 'react'

interface DashboardNavActionsContextValue {
  actions: ReactNode
  setActions: (actions: ReactNode) => void
}

const DashboardNavActionsContext = createContext<DashboardNavActionsContextValue | null>(null)

export function DashboardNavActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode>(null)

  return (
    <DashboardNavActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </DashboardNavActionsContext.Provider>
  )
}

export function useDashboardNavActions() {
  const context = useContext(DashboardNavActionsContext)
  if (!context) {
    throw new Error('useDashboardNavActions must be used within DashboardNavActionsProvider')
  }
  return context
}

export function useDashboardNavActionsOptional() {
  return useContext(DashboardNavActionsContext)
}
