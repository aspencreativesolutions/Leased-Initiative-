import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { applyThemeToDocument, loadStoredThemeId } from '@/themes/applyTheme'
import { getThemeOption, themeOptions } from '@/themes/options'
import type { ThemeId, ThemeOption } from '@/themes/types'

interface ThemeContextValue {
  themeId: ThemeId
  theme: ThemeOption
  themes: ThemeOption[]
  setTheme: (id: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => loadStoredThemeId())

  const setTheme = useCallback((id: ThemeId) => {
    applyThemeToDocument(id)
    setThemeId(id)
  }, [])

  const value = useMemo(
    () => ({
      themeId,
      theme: getThemeOption(themeId),
      themes: themeOptions,
      setTheme,
    }),
    [themeId, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
