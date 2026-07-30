import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Building2, Loader2, LogOut } from 'lucide-react'
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
  DEMO_AFTER_APPLY_LANDLORD_NOTICE,
  DEMO_AVA_NAME,
  exitPublicDemo,
  isPublicDemoSession,
  markDemoPovIntroPlayed,
  markPublicDemoSession,
  peekDemoApplicantName,
  peekWaitingConnectHighlightEmail,
  requestNewRegistrantsDemoCue,
} from '@/lib/publicDemo'
import { prepareViewportForNavigation } from '@/lib/mobileViewport'
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
  const autoLandlordStarted = useRef(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

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
    } else if (!searchParams.get('pick')) {
      setStep('role')
    }
  }, [searchParams])

  const beginAsLandlord = useCallback(async () => {
    if (startingRole || busyTenantKey) return
    setError('')
    setStartingRole('landlord')
    didSoftLogout.current = true
    try {
      const mock = CORE_MOCK_USERS.find((m) => m.key === 'landlord')
      if (!mock) throw new Error('Demo account unavailable')

      markPublicDemoSession('landlord')
      markDemoPovIntroPlayed()
      await login(mock.email, getMockPassword(mock.email), {
        publicDemo: true,
      })
      await prepareViewportForNavigation()
      const highlightEmail = peekWaitingConnectHighlightEmail()
      if (highlightEmail) {
        requestNewRegistrantsDemoCue(peekDemoApplicantName() || DEMO_AVA_NAME)
        navigate('/studio/clients#tenants-waiting-connect', { replace: true })
      } else {
        navigate('/studio', { replace: true })
      }
      window.requestAnimationFrame(() => {
        window.scrollTo(0, 0)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the demo')
      setStartingRole(null)
      autoLandlordStarted.current = false
    }
  }, [busyTenantKey, login, navigate, startingRole])

  // After Ava (or any tenant) submits an application: land here with ?role=landlord
  // and open the landlord dashboard without asking to pick a role again.
  useEffect(() => {
    if (loading || !isPublicDemoSession()) return
    if (searchParams.get('role') !== 'landlord') return
    if (autoLandlordStarted.current || startingRole === 'landlord') return
    // Wait until soft-logout finished so we don't fight the session clear.
    if (user) return
    autoLandlordStarted.current = true
    void beginAsLandlord()
  }, [loading, searchParams, user, startingRole, beginAsLandlord])

  const beginAsTenant = useCallback(
    async (option: DemoTenantPovOption) => {
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
        await prepareViewportForNavigation()
        navigate(nextUser.role === 'admin' ? '/studio' : '/portal', { replace: true })
        window.requestAnimationFrame(() => {
          window.scrollTo(0, 0)
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not open the tenant demo')
        setBusyTenantKey(null)
        setStartingRole(null)
      }
    },
    [busyTenantKey, login, navigate, startingRole]
  )

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
  const autoStartingLandlord = searchParams.get('role') === 'landlord'

  if (autoStartingLandlord) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface text-ink-muted">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        <p className="text-sm">Opening landlord demo…</p>
        {error ? (
          <p className="text-sm font-medium text-accent" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

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
                Pick landlord to manage tenants, or tenant to explore mock scenarios.
                Switch anytime from the demo controls at the bottom right.
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
                  <p className="mb-2 inline-flex rounded-[var(--radius-sm)] border border-brand/25 bg-brand/5 px-2.5 py-1 text-[11px] font-semibold text-brand">
                    Featured · {DEMO_AFTER_APPLY_LANDLORD_NOTICE}
                  </p>
                  <h1 className="heading-display text-3xl font-bold tracking-tight sm:text-4xl">
                    Choose a tenant scenario.
                  </h1>
                  <p className="mt-3 text-base leading-relaxed text-ink-muted sm:text-lg">
                    Browse mock users and open their point of view. Ava Mitchell is ready to start
                    an application — after you submit, switch to landlord POV from the control below.
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
            ? 'Switch to landlord anytime'
            : 'Choose a role to start your demo.'
        }
        subtitle={
          step === 'tenant'
            ? `${DEMO_AFTER_APPLY_LANDLORD_NOTICE} Switch POV opens the landlord side directly — no role screen.`
            : 'Exit demo anytime. After a tenant application, Switch to Landlord opens the landlord side directly.'
        }
        onExit={() => {
          void handleExit()
        }}
        exitDisabled={selecting}
        action={
          step === 'tenant' ? (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={selecting}
                onClick={() => {
                  void beginAsLandlord()
                }}
                aria-label="Switch to Landlord"
              >
                {startingRole === 'landlord' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Building2 className="h-3.5 w-3.5" aria-hidden />
                )}
                Switch to Landlord
              </Button>
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
            </div>
          ) : (
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
          )
        }
      />
    </div>
  )
}
