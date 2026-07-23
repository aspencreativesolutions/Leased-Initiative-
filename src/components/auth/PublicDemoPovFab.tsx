import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Loader2, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { DemoPovSwitcherShell } from '@/components/auth/DemoPovSwitcherShell'
import { findDemoTenantPov } from '@/lib/demoTenantPov'
import {
  exitPublicDemo,
  getPublicDemoRole,
  markDemoPovIntroPlayed,
} from '@/lib/publicDemo'
import type { WelcomeRole } from '@/lib/welcomeSlides'

/**
 * Bottom-right demo control: open the POV picker (landlord or tenant scenarios)
 * or exit the demo session.
 */
export function PublicDemoPovFab() {
  const { user, logout, isPublicDemo } = useAuth()
  const navigate = useNavigate()
  const [busyAction, setBusyAction] = useState<'exit' | null>(null)
  const [error, setError] = useState('')
  const [collapseSignal, setCollapseSignal] = useState(0)

  const show = Boolean(user && (user.publicDemo === true || isPublicDemo))
  const busy = busyAction !== null

  const currentRole: WelcomeRole =
    getPublicDemoRole() ?? (user?.role === 'admin' ? 'landlord' : 'tenant')
  const tenantPov = currentRole === 'tenant' ? findDemoTenantPov(user?.email) : null

  const switchLabel =
    currentRole === 'landlord' ? 'Switch to Tenant' : 'Switch POV'
  const switchPath =
    currentRole === 'landlord' ? '/demo/pov?pick=tenant' : '/demo/pov'

  const handleOpenPicker = useCallback(() => {
    if (busy) return
    setError('')
    markDemoPovIntroPlayed()
    setCollapseSignal((n) => n + 1)
    navigate(switchPath)
  }, [busy, navigate, switchPath])

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

  const viewingLabel = tenantPov
    ? `${tenantPov.name} · ${tenantPov.scenario}`
    : currentRole

  return (
    <DemoPovSwitcherShell
      title="Demo point of view"
      subtitle={
        <>
          Now viewing as {viewingLabel}.{' '}
          {currentRole === 'landlord'
            ? 'Switch to Tenant to pick a mock scenario, or exit demo.'
            : 'Switch POV to choose another tenant or return to the landlord, or exit demo.'}
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
            onClick={handleOpenPicker}
            aria-label={switchLabel}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
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
