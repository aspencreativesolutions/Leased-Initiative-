import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import type { PortalDashboard } from '@/types'

const POLL_MS = 3_000

export function usePortalDashboard() {
  const [data, setData] = useState<PortalDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const dashboard = await apiFetch<PortalDashboard>('/api/portal/dashboard')
      setData(dashboard)
      setError('')
    } catch {
      if (!silent) {
        setError('Could not load your dashboard. Please try again.')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(() => load(true), POLL_MS)
    const onFocus = () => load(true)
    const onVisible = () => {
      if (document.visibilityState === 'visible') load(true)
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  return { data, loading, error, refresh: () => load(true), setData }
}
