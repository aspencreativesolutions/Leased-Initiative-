import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DemoPovSwitcherShell } from '@/components/auth/DemoPovSwitcherShell'
import { DemoTenantPovPicker } from '@/components/auth/DemoTenantPovPicker'
import {
  DEMO_ROLE_SELECT_OPTIONS,
  RoleSelectGrid,
  RoleSelectTile,
} from '@/components/auth/RoleSelectTile'
import { useAuth } from '@/context/AuthContext'
import { CORE_MOCK_USERS, getMockPassword } from '@/lib/adminMode'
import type { DemoTenantPovOption } from '@/lib/demoTenantPov'
import {
  exitPublicDemo,
  isPublicDemoSession,
  markDemoPovIntroPlayed,
  markPublicDemoSession,
} from '@/lib/publicDemo'
import type { WelcomeRole } from '@/lib/welcomeSlides'

type PovStep = 'role' | 'tenant'

export function DemoPovPage() {
  const { login, logout, user, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [step, setStep] = useState<PovStep>(() =>
    searchParams.get('pick') === 'tenant' ? 'tenant' : 'role'
  )
  const [startingRole, setStartingRole] = useState<WelcomeRole | null>(null)
  const [busyTenantKey, setBusyTenantKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const didSoftLogout = useRef(false)

  useEffect(() => {
    if (loading) return
    if (!isPublicDemoSession()) {
      navigate('/', { replace: true })
      return
    }
    // Returning from a dashboard: clear the signed-in user but keep demo unlocked
    if (user && !didSoftLogout.current) {
      didSoftLogout.current = true
      logout({ preservePublicDemo: true })
    }
  }, [loading, user, logout, navigate])

  useEffect(() => {
    if (searchParams.get('pick') === 'tenant') {
      setStep('tenant')
    }
  }, [searchParams])

  const goToRoleStep = () => {
    setStep('role')
    setStartingRole(null)
    setBusyTenantKey(null)
    setError('')
    if (searchParams.has('pick')) {
      const next = new URLSearchParams(searchParams)
      next.delete('pick')
      setSearchParams(next, { replace: true })
    }
  }

  const goToTenantStep = () => {
    setError('')
    setStartingRole(null)
    setBusyTenantKey(null)
    setStep('tenant')
    const next = new URLSearchParams(searchParams)
    next.set('pick', 'tenant')
    setSearchParams(next, { replace: true })
  }

  const beginAsLandlord = async () => {
    if (startingRole || busyTenantKey) return
    setError('')
    setStartingRole('landlord')
    // Prevent the arrival soft-logout from clearing this intentional sign-in
    didSoftLogout.current = true
    try {
      const mock = CORE_MOCK_USERS.find((m) => m.key === 'landlord')
      if (!mock) throw new Error('Demo account unavailable')

      markPublicDemoSession('landlord')
      markDemoPovIntroPlayed()
      const nextUser = await login(mock.email, getMockPassword(mock.email), {
        publicDemo: true,
      })
      navigate(nextUser.role === 'admin' ? '/studio' : '/portal', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the demo')
      setStartingRole(null)
    }
  }

  const beginAsTenant = async (option: DemoTenantPovOption) => {
    if (busyTenantKey || startingRole === 'landlord') return
    setError('')
    setBusyTenantKey(option.key)
    setStartingRole('tenant')
    didSoftLogout.current = true
    try {
      markPublicDemoSession('tenant')
      markDemoPovIntroPlayed()
      const nextUser = await login(option.email, getMockPassword(option.email), {
        publicDemo: true,
      })
      navigate(nextUser.role === 'admin' ? '/studio' : '/portal', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the tenant demo')
      setBusyTenantKey(null)
      setStartingRole(null)
    }
  }

  const handleExit = async () => {
    logout()
    await exitPublicDemo()
    navigate('/', { replace: true })
  }

  if (loading || !isPublicDemoSession()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-ink-muted">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      </div>
    )
  }

  const selecting = startingRole === 'landlord' || busyTenantKey !== null

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-surface text-ink">
      <div className="home-page__atmosphere pointer-events-none absolute inset-0" aria-hidden />

      <div
        className={
          step === 'tenant'
            ? 'relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-10 pb-36 sm:px-6 sm:py-14 sm:pb-40'
            : 'relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-12 pb-36 sm:px-6 sm:py-16 sm:pb-40'
        }
      >
        <div
          className={
            step === 'tenant'
              ? 'mx-auto flex w-full flex-1 flex-col'
              : 'mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center text-center'
          }
        >
          <Link
            to="/"
            onClick={(e) => {
              e.preventDefault()
              void handleExit()
            }}
            className="mb-6 flex h-14 w-14 items-center justify-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink font-display text-2xl font-bold tracking-tight transition-colors hover:border-brand hover:text-brand sm:mb-8 sm:h-16 sm:w-16 sm:text-3xl"
            aria-label="Exit demo and return home"
          >
            L
          </Link>

          {step === 'role' ? (
            <>
              <h1 className="heading-display text-3xl font-bold tracking-tight sm:text-4xl">
                Choose your point of view to start.
              </h1>
              <p className="mt-3 max-w-lg text-base leading-relaxed text-ink-muted sm:text-lg">
                Pick landlord to manage the portfolio, or tenant to explore a specific mock
                scenario. You can switch anytime from the demo controls at the bottom right.
              </p>

              <RoleSelectGrid className="mt-10 sm:mt-12">
                {DEMO_ROLE_SELECT_OPTIONS.map((option) => (
                  <RoleSelectTile
                    key={option.role}
                    role={option.role}
                    title={option.title}
                    description={
                      option.role === 'tenant'
                        ? 'Browse mock tenants and open a scenario'
                        : option.description
                    }
                    selected={startingRole === 'landlord' && option.role === 'landlord'}
                    busy={startingRole === 'landlord' && option.role === 'landlord'}
                    disabled={selecting && option.role !== 'landlord'}
                    onClick={() => {
                      if (option.role === 'landlord') {
                        void beginAsLandlord()
                      } else {
                        goToTenantStep()
                      }
                    }}
                  />
                ))}
              </RoleSelectGrid>

              {error ? (
                <p className="mt-6 text-sm font-medium text-accent" role="alert">
                  {error}
                </p>
              ) : startingRole === 'landlord' ? (
                <p className="mt-6 text-sm text-ink-muted" aria-live="polite">
                  Opening landlord demo…
                </p>
              ) : (
                <p className="mt-6 text-sm text-ink-faint">Select a point of view to continue</p>
              )}
            </>
          ) : (
            <>
              <div className="mb-6 flex flex-col gap-3 sm:mb-8">
                <button
                  type="button"
                  onClick={goToRoleStep}
                  disabled={Boolean(busyTenantKey)}
                  className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Back to roles
                </button>
                <div className="max-w-2xl">
                  <h1 className="heading-display text-3xl font-bold tracking-tight sm:text-4xl">
                    Choose a tenant scenario.
                  </h1>
                  <p className="mt-3 text-base leading-relaxed text-ink-muted sm:text-lg">
                    Each card is a different mock user — review the address, lease dates, and
                    payment details, then open that point of view. Switch POV anytime to pick
                    another tenant or return to the landlord.
                  </p>
                </div>
              </div>

              <DemoTenantPovPicker
                selectedKey={busyTenantKey}
                busyKey={busyTenantKey}
                onSelect={(option) => {
                  void beginAsTenant(option)
                }}
              />

              {error ? (
                <p className="mt-6 text-sm font-medium text-accent" role="alert">
                  {error}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      <DemoPovSwitcherShell
        className="!z-20"
        title={
          step === 'tenant'
            ? 'Pick a tenant scenario, or go back for landlord.'
            : 'Choose a role to start your demo.'
        }
        subtitle="Exit demo anytime. After you enter a dashboard, Switch POV brings you back here."
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            disabled={selecting}
            onClick={() => {
              void handleExit()
            }}
            aria-label="Exit Demo"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Exit Demo
          </Button>
        }
      />
    </div>
  )
}
