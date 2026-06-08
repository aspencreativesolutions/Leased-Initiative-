import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api'
import type { AdminNotification } from '@/types'

const POLL_MS = 5_000

export function useAdminNotifications() {
  const { isAdmin, loading: authLoading } = useAuth()
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch<{ notifications: AdminNotification[]; count: number }>(
        '/api/data/notifications'
      )
      setNotifications(data.notifications)
      setCount(data.count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notifications')
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  const markRead = useCallback(
    async (payload?: { ids?: string[]; type?: AdminNotification['type'] }) => {
      if (!isAdmin) return
      await apiFetch('/api/data/notifications/read', {
        method: 'POST',
        body: JSON.stringify(payload ?? {}),
      })
      await refresh()
    },
    [isAdmin, refresh]
  )

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

  return { notifications, count, loading, error, refresh, markRead }
}
