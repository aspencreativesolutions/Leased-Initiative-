import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applyThemeToDocument,
  loadStoredPortalThemeId,
} from '@/themes/applyTheme'
import { savePortalTheme } from '@/lib/portalThemeApi'
import { getToken } from '@/lib/api'
import { PORTAL_THEME_STORAGE_KEY, getThemeOption, themeOptions } from '@/themes/options'
import type { ThemeId, ThemeOption } from '@/themes/types'

interface SetThemeOptions {
  /** When false, only apply locally (e.g. restoring from account on login) */
  persist?: boolean
}

interface PortalThemeContextValue {
  themeId: ThemeId
  theme: ThemeOption
  themes: ThemeOption[]
  setTheme: (id: ThemeId, options?: SetThemeOptions) => void
}

const PortalThemeContext = createContext<PortalThemeContextValue | null>(null)

export function PortalThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => loadStoredPortalThemeId())

  const setTheme = useCallback((id: ThemeId, options?: SetThemeOptions) => {
    applyThemeToDocument(id, PORTAL_THEME_STORAGE_KEY)
    setThemeId(id)
    if (options?.persist === false || !getToken()) return
    savePortalTheme(id).catch(() => {})
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

  return (
    <PortalThemeContext.Provider value={value}>{children}</PortalThemeContext.Provider>
  )
}

export function usePortalTheme() {
  const ctx = useContext(PortalThemeContext)
  if (!ctx) throw new Error('usePortalTheme must be used within PortalThemeProvider')
  return ctx
}
