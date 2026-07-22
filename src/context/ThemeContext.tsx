import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAppearance } from '@/context/AppearanceContext'
import {
  applyThemeToDocument,
  loadStoredThemeId,
} from '@/themes/applyTheme'
import {
  DEFAULT_THEME_ID,
  DEFAULT_APPEARANCE,
  THEME_STORAGE_KEY,
  getThemeOption,
  themeOptions,
  themeSupportsAppearance,
} from '@/themes/options'
import type { ThemeAppearance, ThemeId, ThemeOption } from '@/themes/types'

interface ThemeContextValue {
  themeId: ThemeId
  theme: ThemeOption
  themes: ThemeOption[]
  appearance: ThemeAppearance
  supportsAppearance: boolean
  setTheme: (id: ThemeId) => void
  setAppearance: (appearance: ThemeAppearance) => void
  /** Restore default theme and clear the saved preference (e.g. first-time restart) */
  resetToDefault: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => loadStoredThemeId())
  const { appearance, setAppearance, resetAppearance } = useAppearance()

  const setTheme = useCallback((id: ThemeId) => {
    applyThemeToDocument(id, THEME_STORAGE_KEY, { persist: true })
    setThemeId(id)
  }, [])

  const resetToDefault = useCallback(() => {
    localStorage.removeItem(THEME_STORAGE_KEY)
    applyThemeToDocument(DEFAULT_THEME_ID, THEME_STORAGE_KEY, {
      persist: false,
      appearance: DEFAULT_APPEARANCE,
    })
    resetAppearance()
    setThemeId(DEFAULT_THEME_ID)
  }, [resetAppearance])

  const value = useMemo(
    () => ({
      themeId,
      theme: getThemeOption(themeId),
      themes: themeOptions,
      appearance,
      supportsAppearance: themeSupportsAppearance(themeId),
      setTheme,
      setAppearance,
      resetToDefault,
    }),
    [themeId, appearance, setTheme, setAppearance, resetToDefault]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
