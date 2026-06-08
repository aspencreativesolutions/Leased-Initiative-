import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  applyThemeToDocument,
  isPortalPath,
  loadStoredPortalThemeId,
  loadStoredThemeId,
} from '@/themes/applyTheme'
import { PORTAL_THEME_STORAGE_KEY, THEME_STORAGE_KEY } from '@/themes/options'

/** Keeps document theme in sync when switching between admin and portal routes */
export function RouteThemeSync() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (isPortalPath(pathname)) {
      applyThemeToDocument(loadStoredPortalThemeId(), PORTAL_THEME_STORAGE_KEY)
    } else {
      applyThemeToDocument(loadStoredThemeId(), THEME_STORAGE_KEY)
    }
  }, [pathname])

  return null
}
