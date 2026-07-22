import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { fetchTenantProblemAlerts } from '@/lib/problemReports'
import type { AdminNotification } from '@/types'

const POLL_MS = 5_000

export function useTenantAlerts() {
  const { isAdmin, loading: authLoading } = useAuth()
  const [alerts, setAlerts] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchTenantProblemAlerts()
      setAlerts(data.notifications)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load tenant alerts')
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    if (authLoading || !isAdmin) return
    refresh()
    const interval = setInterval(refresh, POLL_MS)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [authLoading, isAdmin, refresh])

  const unreadCount = alerts.filter((a) => !a.read).length

  return { alerts, unreadCount, loading, error, refresh }
}
