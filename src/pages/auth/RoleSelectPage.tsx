import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, KeyRound } from 'lucide-react'
import {
  hasCompletedWelcomeCarousel,
  WelcomeCarousel,
} from '@/components/auth/WelcomeCarousel'
import { useAuth } from '@/context/AuthContext'
import { FIRST_TIME_RESTART_EVENT } from '@/lib/welcomeSlides'

export function RoleSelectPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [showCarousel, setShowCarousel] = useState(() => !hasCompletedWelcomeCarousel())

  useEffect(() => {
    if (loading || !user) return
    navigate(user.role === 'admin' ? '/studio' : '/portal', { replace: true })
  }, [loading, user, navigate])

  useEffect(() => {
    const syncWelcome = () => {
      setShowCarousel(!hasCompletedWelcomeCarousel())
    }
    window.addEventListener(FIRST_TIME_RESTART_EVENT, syncWelcome)
    return () => window.removeEventListener(FIRST_TIME_RESTART_EVENT, syncWelcome)
  }, [])

  const dismissCarousel = () => setShowCarousel(false)

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="mb-10 text-center sm:mb-14">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink font-display text-2xl font-bold tracking-tight sm:h-[4.5rem] sm:w-[4.5rem] sm:text-3xl">
            L
          </div>
          <h1 className="heading-display text-4xl tracking-tight sm:text-5xl">Leased</h1>
          <p className="mt-3 text-base text-ink-muted sm:text-lg">
            Manage leases between landlords and tenants
          </p>
        </div>

        {showCarousel ? (
          <WelcomeCarousel onSkip={dismissCarousel} onComplete={dismissCarousel} />
        ) : (
          <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2 sm:gap-6">
            <Link
              to="/login"
              className="group flex min-h-[12rem] flex-col justify-between rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink bg-surface-paper p-6 transition-colors hover:border-brand hover:bg-brand/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:min-h-[14rem] sm:p-8"
            >
              <KeyRound
                className="h-10 w-10 text-ink transition-colors group-hover:text-brand sm:h-12 sm:w-12"
                strokeWidth={1.5}
                aria-hidden
              />
              <div>
                <h2 className="heading-display text-2xl sm:text-3xl">I&apos;m a Tenant</h2>
                <p className="mt-2 text-sm text-ink-muted sm:text-base">
                  Sign in or create an account to review and sign your lease
                </p>
              </div>
            </Link>

            <Link
              to="/studio/login"
              className="group flex min-h-[12rem] flex-col justify-between rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink bg-surface-paper p-6 transition-colors hover:border-brand hover:bg-brand/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:min-h-[14rem] sm:p-8"
            >
              <Building2
                className="h-10 w-10 text-ink transition-colors group-hover:text-brand sm:h-12 sm:w-12"
                strokeWidth={1.5}
                aria-hidden
              />
              <div>
                <h2 className="heading-display text-2xl sm:text-3xl">I&apos;m a Landlord</h2>
                <p className="mt-2 text-sm text-ink-muted sm:text-base">
                  Approve tenants, send leases, and manage your properties
                </p>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
