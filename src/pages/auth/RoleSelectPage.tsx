import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  hasCompletedWelcomeCarousel,
  WelcomeCarousel,
} from '@/components/auth/WelcomeCarousel'
import { BrandMark } from '@/components/brand/BrandMark'
import {
  ROLE_SELECT_OPTIONS,
  RoleSelectGrid,
  RoleSelectTile,
} from '@/components/auth/RoleSelectTile'
import { useAuth } from '@/context/AuthContext'
import { BRAND_NAME } from '@/lib/brand'
import { FIRST_TIME_RESTART_EVENT, loginPathForRole } from '@/lib/welcomeSlides'

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
          <Link
            to="/"
            className="mx-auto mb-5 inline-flex transition-colors hover:text-brand"
            aria-label={`Back to ${BRAND_NAME} home`}
          >
            <BrandMark
              className="h-16 w-[4.5rem] rounded-[var(--radius-sm)] border-ink hover:border-brand sm:h-[4.5rem] sm:w-20"
              glyphClassName="text-2xl sm:text-3xl"
            />
          </Link>
          <h1 className="heading-display text-3xl tracking-tight sm:text-4xl md:text-5xl">
            {BRAND_NAME}
          </h1>
          <p className="mt-3 text-base text-ink-muted sm:text-lg">
            Manage leases between landlords and tenants
          </p>
        </div>

        {showCarousel ? (
          <WelcomeCarousel onSkip={dismissCarousel} onComplete={dismissCarousel} />
        ) : (
          <RoleSelectGrid className="max-w-3xl">
            {ROLE_SELECT_OPTIONS.map((option) => (
              <RoleSelectTile
                key={option.role}
                role={option.role}
                title={option.title}
                description={option.description}
                to={loginPathForRole(option.role)}
              />
            ))}
          </RoleSelectGrid>
        )}

        <Link
          to="/"
          className="mt-10 text-sm font-semibold text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
