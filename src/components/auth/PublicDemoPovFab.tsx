import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Loader2, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { DemoPovSwitcherShell } from '@/components/auth/DemoPovSwitcherShell'
import { CORE_MOCK_USERS, getMockPassword } from '@/lib/adminMode'
import {
  exitPublicDemo,
  getPublicDemoRole,
  markDemoPovIntroPlayed,
  markPublicDemoSession,
  oppositeDemoRole,
} from '@/lib/publicDemo'
import type { WelcomeRole } from '@/lib/welcomeSlides'

function demoMockForRole(role: WelcomeRole) {
  return role === 'landlord'
    ? CORE_MOCK_USERS.find((m) => m.key === 'landlord')
    : CORE_MOCK_USERS.find((m) => m.key === 'active')
}

function switchPovLabel(currentRole: WelcomeRole): string {
  return currentRole === 'tenant' ? 'Switch to Landlord' : 'Switch to Tenant'
}

/**
 * Bottom-right demo control: switch landlord ↔ tenant or exit the demo session.
 */
export function PublicDemoPovFab() {
  const { user, login, logout, isPublicDemo } = useAuth()
  const navigate = useNavigate()
  const [busyAction, setBusyAction] = useState<'switch' | 'exit' | null>(null)
  const [error, setError] = useState('')
  const [collapseSignal, setCollapseSignal] = useState(0)

  const show = Boolean(user && (user.publicDemo === true || isPublicDemo))
  const busy = busyAction !== null

  const currentRole: WelcomeRole =
    getPublicDemoRole() ?? (user?.role === 'admin' ? 'landlord' : 'tenant')
  const nextRole = oppositeDemoRole(currentRole)
  const switchLabel = switchPovLabel(currentRole)

  const handleToggle = useCallback(async () => {
    if (busy) return
    setError('')
    setBusyAction('switch')
    try {
      const mock = demoMockForRole(nextRole)
      if (!mock) throw new Error('Demo account unavailable')

      markPublicDemoSession(nextRole)
      markDemoPovIntroPlayed()
      const nextUser = await login(mock.email, getMockPassword(mock.email), {
        publicDemo: true,
      })
      setCollapseSignal((n) => n + 1)
      navigate(nextUser.role === 'admin' ? '/studio' : '/portal', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not switch point of view')
    } finally {
      setBusyAction(null)
    }
  }, [busy, login, navigate, nextRole])

  const handleExit = useCallback(async () => {
    if (busy) return
    setError('')
    setBusyAction('exit')
    try {
      logout()
      await exitPublicDemo()
      navigate('/', { replace: true })
    } catch {
      logout()
      navigate('/', { replace: true })
    } finally {
      setBusyAction(null)
    }
  }, [busy, logout, navigate])

  if (!show) return null

  return (
    <DemoPovSwitcherShell
      subtitle={
        <>
          Now viewing as {currentRole}. Switch to {nextRole} or exit demo.
        </>
      }
      collapseSignal={collapseSignal}
      action={
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={busy}
            onClick={() => {
              void handleToggle()
            }}
            aria-label={switchLabel}
          >
            {busyAction === 'switch' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
            )}
            {switchLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => {
              void handleExit()
            }}
            aria-label="Exit Demo"
          >
            {busyAction === 'exit' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <LogOut className="h-3.5 w-3.5" aria-hidden />
            )}
            Exit Demo
          </Button>
        </div>
      }
    >
      {error ? (
        <p className="mt-2 text-[11px] font-medium text-accent" role="alert">
          {error}
        </p>
      ) : null}
    </DemoPovSwitcherShell>
  )
}
