import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAppearance } from '@/context/AppearanceContext'
import { isPublicDemoSession } from '@/lib/publicDemo'
import {
  THEME_PREFERENCE_EVENT,
  applyThemeToDocument,
  isThemeId,
  loadStoredThemeId,
  persistThemeIdAcrossSurfaces,
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

interface SetThemeOptions {
  /** Also write the portal preference (home preview + Demo Mode POV parity) */
  syncSurfaces?: boolean
/**
 * When false, save the preference without changing document theme.
 * Defaults to true so Style Chooser live-previews immediately.
 */
  applyDocument?: boolean
}

interface ThemeContextValue {
  themeId: ThemeId
  theme: ThemeOption
  themes: ThemeOption[]
  appearance: ThemeAppearance
  supportsAppearance: boolean
  setTheme: (id: ThemeId, options?: SetThemeOptions) => void
  setAppearance: (appearance: ThemeAppearance) => void
  /** Restore default theme and clear the saved preference (e.g. first-time restart) */
  resetToDefault: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => loadStoredThemeId())
  const { appearance, setAppearance, resetAppearance } = useAppearance()

  useEffect(() => {
    const onPreference = (event: Event) => {
      const id = (event as CustomEvent<{ themeId?: string }>).detail?.themeId
      if (id && isThemeId(id)) setThemeId(id)
    }
    window.addEventListener(THEME_PREFERENCE_EVENT, onPreference)
    return () => window.removeEventListener(THEME_PREFERENCE_EVENT, onPreference)
  }, [])

  const setTheme = useCallback((id: ThemeId, options?: SetThemeOptions) => {
    const syncSurfaces = options?.syncSurfaces === true || isPublicDemoSession()
    const applyDocument = options?.applyDocument !== false

    if (!applyDocument) {
      if (syncSurfaces) {
        persistThemeIdAcrossSurfaces(id)
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, id)
        window.dispatchEvent(
          new CustomEvent(THEME_PREFERENCE_EVENT, { detail: { themeId: id } })
        )
      }
      setThemeId(id)
      return
    }

    applyThemeToDocument(id, THEME_STORAGE_KEY, {
      persist: true,
      syncSurfaces,
    })
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
