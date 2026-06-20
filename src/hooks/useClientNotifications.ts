import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { fetchClientNotifications } from '@/lib/clientNotificationsApi'
import type { ClientNotification } from '@/types'

const POLL_MS = 30_000

export function useClientNotifications() {
  const { isClient, loading: authLoading } = useAuth()
  const [notifications, setNotifications] = useState<ClientNotification[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!isClient) return
    setLoading(true)
    try {
      const data = await fetchClientNotifications()
      setNotifications(data.notifications)
      setCount(data.count)
    } catch {
      setNotifications([])
      setCount(0)
    } finally {
      setLoading(false)
    }
  }, [isClient])

  useEffect(() => {
    if (authLoading || !isClient) return
    refresh()
    const interval = setInterval(refresh, POLL_MS)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [authLoading, isClient, refresh])

  return { notifications, count, loading, refresh }
}
