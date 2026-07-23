import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DemoPovSwitcherShell } from '@/components/auth/DemoPovSwitcherShell'
import {
  DEMO_ROLE_SELECT_OPTIONS,
  RoleSelectGrid,
  RoleSelectTile,
} from '@/components/auth/RoleSelectTile'
import { useAuth } from '@/context/AuthContext'
import { CORE_MOCK_USERS, getMockPassword } from '@/lib/adminMode'
import {
  exitPublicDemo,
  isPublicDemoSession,
  markDemoPovIntroPlayed,
  markPublicDemoSession,
} from '@/lib/publicDemo'
import type { WelcomeRole } from '@/lib/welcomeSlides'

export function DemoPovPage() {
  const { login, logout, user, loading } = useAuth()
  const navigate = useNavigate()
  const [startingRole, setStartingRole] = useState<WelcomeRole | null>(null)
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

  const beginDemoAs = async (role: WelcomeRole) => {
    if (startingRole) return
    setError('')
    setStartingRole(role)
    // Prevent the arrival soft-logout from clearing this intentional sign-in
    didSoftLogout.current = true
    try {
      const mock =
        role === 'landlord'
          ? CORE_MOCK_USERS.find((m) => m.key === 'landlord')
          : CORE_MOCK_USERS.find((m) => m.key === 'active')
      if (!mock) throw new Error('Demo account unavailable')

      markPublicDemoSession(role)
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

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-surface text-ink">
      <div className="home-page__atmosphere pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-12 pb-36 sm:px-6 sm:py-16 sm:pb-40">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center text-center">
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

          <h1 className="heading-display text-3xl font-bold tracking-tight sm:text-4xl">
            Choose your point of view to start.
          </h1>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-ink-muted sm:text-lg">
            You can switch roles anytime from the demo controls at the bottom right of the
            dashboard.
          </p>

          <RoleSelectGrid className="mt-10 sm:mt-12">
            {DEMO_ROLE_SELECT_OPTIONS.map((option) => (
              <RoleSelectTile
                key={option.role}
                role={option.role}
                title={option.title}
                description={option.description}
                selected={startingRole === option.role}
                busy={startingRole === option.role}
                disabled={startingRole !== null && startingRole !== option.role}
                onClick={() => {
                  void beginDemoAs(option.role)
                }}
              />
            ))}
          </RoleSelectGrid>

          {error ? (
            <p className="mt-6 text-sm font-medium text-accent" role="alert">
              {error}
            </p>
          ) : startingRole ? (
            <p className="mt-6 text-sm text-ink-muted" aria-live="polite">
              Opening {startingRole === 'landlord' ? 'landlord' : 'tenant'} demo…
            </p>
          ) : (
            <p className="mt-6 text-sm text-ink-faint">Select a point of view to continue</p>
          )}
        </div>
      </div>

      <DemoPovSwitcherShell
        className="!z-20"
        subtitle="Exit demo anytime, or switch roles after you enter a dashboard."
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            disabled={startingRole !== null}
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
