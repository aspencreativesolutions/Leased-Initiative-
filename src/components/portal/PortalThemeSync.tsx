import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePortalTheme } from '@/context/PortalThemeContext'
import { isThemeId } from '@/themes/applyTheme'
import type { ThemeId } from '@/themes/types'

/** Applies the signed-in client's saved portal theme once after login */
export function PortalThemeSync() {
  const { user } = useAuth()
  const { setTheme } = usePortalTheme()
  const appliedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (user?.role !== 'client') {
      appliedKeyRef.current = null
      return
    }

    const saved = user.portalThemeId
    const restoreKey = `${user.id}:${saved ?? ''}`

    if (appliedKeyRef.current === restoreKey) return
    appliedKeyRef.current = restoreKey

    if (!saved || !isThemeId(saved)) return
    setTheme(saved as ThemeId, { persist: false })
  }, [user?.id, user?.role, user?.portalThemeId, setTheme])

  return null
}
