import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePortalTheme } from '@/context/PortalThemeContext'
import { isThemeId } from '@/themes/applyTheme'
import type { ThemeId } from '@/themes/types'

/** Applies the signed-in client's saved portal theme after login */
export function PortalThemeSync() {
  const { user } = useAuth()
  const { themeId, setTheme } = usePortalTheme()

  useEffect(() => {
    if (user?.role !== 'client') return
    const saved = user.portalThemeId
    if (!saved || !isThemeId(saved) || saved === themeId) return
    setTheme(saved as ThemeId, { persist: false })
  }, [user?.id, user?.role, user?.portalThemeId, themeId, setTheme])

  return null
}
