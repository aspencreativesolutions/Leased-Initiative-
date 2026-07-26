import { useCallback, useEffect, useState } from 'react'
import { fetchPortalTimeline } from '@/lib/portalTimelineApi'
import type { ProjectTimelineStep } from '@/types'

const POLL_MS = 5_000

export function usePortalTimeline() {
  const [linked, setLinked] = useState(true)
  const [projectName, setProjectName] = useState('')
  const [steps, setSteps] = useState<ProjectTimelineStep[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await fetchPortalTimeline()
      setLinked(data.linked)
      setProjectName(data.projectName ?? '')
      setSteps(data.steps)
      setMessage(data.message ?? '')
      setError('')
    } catch {
      if (!silent) {
        setError('Could not load your project timeline.')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(() => load(true), POLL_MS)
    const onFocus = () => load(true)
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  return {
    linked,
    projectName,
    steps,
    message,
    loading,
    error,
    refresh: () => load(true),
    retry: () => load(false),
  }
}
