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
import { safeLocalRemove } from '@/lib/safeStorage'
import {
  THEME_PREFERENCE_EVENT,
  applyThemeToDocument,
  isThemeId,
  loadStoredPortalThemeId,
} from '@/themes/applyTheme'
import { savePortalTheme } from '@/lib/portalThemeApi'
import { getToken } from '@/lib/api'
import { isPublicDemoSession } from '@/lib/publicDemo'
import {
  DEFAULT_PORTAL_THEME_ID,
  DEFAULT_APPEARANCE,
  PORTAL_THEME_STORAGE_KEY,
  getThemeOption,
  themeOptions,
  themeSupportsAppearance,
} from '@/themes/options'
import type { ThemeAppearance, ThemeId, ThemeOption } from '@/themes/types'

interface SetThemeOptions {
  /** When false, only apply locally (e.g. restoring from account on login) */
  persist?: boolean
}

interface PortalThemeContextValue {
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

const PortalThemeContext = createContext<PortalThemeContextValue | null>(null)

export function PortalThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => loadStoredPortalThemeId())
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
    // Always mirror onto the device so route sync stays consistent; API save is opt-in.
    applyThemeToDocument(id, PORTAL_THEME_STORAGE_KEY, {
      persist: true,
      syncSurfaces: isPublicDemoSession(),
    })
    setThemeId(id)
    if (options?.persist === false || !getToken()) return
    if (isPublicDemoSession()) return
    savePortalTheme(id).catch(() => {})
  }, [])

  const resetToDefault = useCallback(() => {
    safeLocalRemove(PORTAL_THEME_STORAGE_KEY)
    applyThemeToDocument(DEFAULT_PORTAL_THEME_ID, PORTAL_THEME_STORAGE_KEY, {
      persist: false,
      appearance: DEFAULT_APPEARANCE,
    })
    resetAppearance()
    setThemeId(DEFAULT_PORTAL_THEME_ID)
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

  return (
    <PortalThemeContext.Provider value={value}>{children}</PortalThemeContext.Provider>
  )
}

export function usePortalTheme() {
  const ctx = useContext(PortalThemeContext)
  if (!ctx) throw new Error('usePortalTheme must be used within PortalThemeProvider')
  return ctx
}
