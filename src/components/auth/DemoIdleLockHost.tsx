import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { exitPublicDemo, isPublicDemoSession } from '@/lib/publicDemo'

/** Public demo visitors are locked out after this much idle time. */
export const DEMO_IDLE_LOCK_MS = 20 * 60 * 1000

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'pointerdown',
  'keydown',
  'mousemove',
  'scroll',
  'touchstart',
  'wheel',
]

/**
 * Ends the public demo after 20 minutes of inactivity and returns home
 * so the visitor must re-enter with a demo code / company link.
 */
export function DemoIdleLockHost() {
  const { user, logout, isPublicDemo } = useAuth()
  const navigate = useNavigate()
  const lockingRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const lastActivityRef = useRef(Date.now())

  const active = Boolean(
    user && (user.publicDemo === true || isPublicDemo || isPublicDemoSession())
  )

  const lockOut = useCallback(async () => {
    if (lockingRef.current) return
    lockingRef.current = true
    try {
      logout()
      await exitPublicDemo()
    } catch {
      logout()
    } finally {
      navigate('/', { replace: true, state: { openDemoCode: true, demoIdleLocked: true } })
      lockingRef.current = false
    }
  }, [logout, navigate])

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    if (timerRef.current != null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      void lockOut()
    }, DEMO_IDLE_LOCK_MS)
  }, [lockOut])

  useEffect(() => {
    if (!active) {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    resetTimer()

    const onActivity = () => {
      // Throttle resets — activity can fire very frequently (mousemove).
      if (Date.now() - lastActivityRef.current < 1000) return
      resetTimer()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        const idleFor = Date.now() - lastActivityRef.current
        if (idleFor >= DEMO_IDLE_LOCK_MS) {
          void lockOut()
          return
        }
        resetTimer()
      }
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true })
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity)
      }
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active, lockOut, resetTimer])

  return null
}
