import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applyAppearanceToDocument,
  loadStoredAppearance,
} from '@/themes/applyTheme'
import { DEFAULT_APPEARANCE } from '@/themes/options'
import type { ThemeAppearance } from '@/themes/types'

interface AppearanceContextValue {
  appearance: ThemeAppearance
  setAppearance: (appearance: ThemeAppearance) => void
  resetAppearance: () => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<ThemeAppearance>(() =>
    loadStoredAppearance()
  )

  const setAppearance = useCallback((next: ThemeAppearance) => {
    applyAppearanceToDocument(next, { persist: true })
    setAppearanceState(next)
  }, [])

  const resetAppearance = useCallback(() => {
    applyAppearanceToDocument(DEFAULT_APPEARANCE, { persist: true })
    setAppearanceState(DEFAULT_APPEARANCE)
  }, [])

  const value = useMemo(
    () => ({ appearance, setAppearance, resetAppearance }),
    [appearance, setAppearance, resetAppearance]
  )

  return (
    <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
  )
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error('useAppearance must be used within AppearanceProvider')
  return ctx
}
