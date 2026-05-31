import { useCallback, useEffect, useState } from 'react'
import type { PendingRegistration } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api'

interface RegistrationsResponse {
  registrations: PendingRegistration[]
  count: number
}

export function usePendingRegistrations(pollMs = 20_000) {
  const { isAdmin, loading: authLoading } = useAuth()
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isAdmin) {
      setRegistrations([])
      setCount(0)
      setLoading(false)
      return
    }

    try {
      const data = await apiFetch<RegistrationsResponse>('/api/data/registrations')
      setRegistrations(data.registrations)
      setCount(data.count)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load registrations')
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    if (authLoading) return

    refresh()
    if (!isAdmin) return

    const interval = setInterval(refresh, pollMs)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [authLoading, isAdmin, refresh, pollMs])

  return { registrations, count, loading, error, refresh }
}
