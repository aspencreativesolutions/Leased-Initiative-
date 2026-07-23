import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Compass, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DemoCodeModal } from '@/components/auth/DemoCodeModal'
import { RoleSelectGrid, RoleSelectTile } from '@/components/auth/RoleSelectTile'
import {
  getWelcomeSlides,
  loginPathForRole,
  registerPathForRole,
  WELCOME_CAROUSEL_STORAGE_KEY,
  type WelcomeRole,
} from '@/lib/welcomeSlides'
import { markPublicDemoSession, type DemoAccountCredentials } from '@/lib/publicDemo'
import { cn } from '@/lib/utils'

interface WelcomeCarouselProps {
  onSkip: () => void
  onComplete: () => void
}

export function WelcomeCarousel({ onSkip, onComplete }: WelcomeCarouselProps) {
  const navigate = useNavigate()
  const labelId = useId()
  const [role, setRole] = useState<WelcomeRole | null>(null)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [demoOpen, setDemoOpen] = useState(false)
  const touchStartX = useRef<number | null>(null)

  const slides = getWelcomeSlides(role)
  const current = slides[index] ?? slides[0]
  const isFirst = index === 0
  const isLast = index === slides.length - 1
  const canAdvance = current.kind !== 'role' || role !== null

  const markDone = useCallback(() => {
    try {
      localStorage.setItem(WELCOME_CAROUSEL_STORAGE_KEY, '1')
    } catch {
      /* ignore quota / private mode */
    }
  }, [])

  const goTo = useCallback((next: number, dir: 1 | -1) => {
    if (next < 0 || next >= slides.length) return
    setDirection(dir)
    setIndex(next)
  }, [slides.length])

  const handleSkip = useCallback(() => {
    markDone()
    if (role) {
      onComplete()
      navigate(loginPathForRole(role))
      return
    }
    onSkip()
  }, [markDone, navigate, onComplete, onSkip, role])

  const handleSelectRole = (selected: WelcomeRole) => {
    setRole(selected)
    setDirection(1)
    setIndex(1)
  }

  const handleCreateAccount = useCallback(() => {
    if (!role) return
    markDone()
    onComplete()
    navigate(registerPathForRole(role))
  }, [markDone, navigate, onComplete, role])

  const handleDemoSuccess = useCallback(
    (account: DemoAccountCredentials) => {
      if (!role) return
      markDone()
      onComplete()
      markPublicDemoSession(account.accountRole)
      setDemoOpen(false)
      navigate(account.loginPath, {
        replace: true,
        state: {
          demoCredentials: {
            email: account.email,
            password: account.password,
          },
        },
      })
    },
    [markDone, navigate, onComplete, role]
  )

  const handleNext = useCallback(() => {
    if (!canAdvance) return
    if (isLast && role) {
      handleCreateAccount()
      return
    }
    goTo(index + 1, 1)
  }, [canAdvance, goTo, handleCreateAccount, index, isLast, role])

  const handleBack = useCallback(() => {
    if (isFirst) return
    goTo(index - 1, -1)
  }, [goTo, index, isFirst])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (demoOpen) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handleBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [demoOpen, handleBack, handleNext])

  const Icon = current.icon

  return (
    <div className="flex w-full max-w-xl flex-col" role="region" aria-labelledby={labelId}>
      <p id={labelId} className="sr-only">
        Welcome introduction
      </p>

      <div
        className="relative overflow-hidden rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink bg-surface-paper"
        onTouchStart={(e) => {
          touchStartX.current = e.changedTouches[0]?.clientX ?? null
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current
          const end = e.changedTouches[0]?.clientX
          touchStartX.current = null
          if (start == null || end == null) return
          const delta = end - start
          if (Math.abs(delta) < 48) return
          if (delta < 0) handleNext()
          else handleBack()
        }}
      >
        <div
          key={`${current.id}-${index}`}
          className={cn(
            'welcome-slide flex min-h-[22rem] flex-col px-6 py-8 sm:min-h-[24rem] sm:px-10 sm:py-10',
            direction === 1 ? 'welcome-slide-from-right' : 'welcome-slide-from-left'
          )}
        >
          {current.kind !== 'role' && (
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink text-brand sm:h-14 sm:w-14">
              <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.5} aria-hidden />
            </div>
          )}

          <h2 className="heading-display text-2xl tracking-tight sm:text-3xl">{current.title}</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted sm:text-base">
            {current.description}
          </p>

          {current.kind === 'role' && (
            <RoleSelectGrid className="mt-8 flex-1">
              <RoleSelectTile
                size="compact"
                role="tenant"
                title="I'm a Tenant"
                description="Review and sign your lease"
                selected={role === 'tenant'}
                onClick={() => handleSelectRole('tenant')}
              />
              <RoleSelectTile
                size="compact"
                role="landlord"
                title="I'm a Landlord"
                description="Manage tenants and leases"
                selected={role === 'landlord'}
                onClick={() => handleSelectRole('landlord')}
              />
            </RoleSelectGrid>
          )}

          {current.kind === 'tour' && (
            <div className="mt-8 inline-flex w-fit items-center gap-2 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink bg-surface px-3 py-2 text-sm font-semibold text-ink">
              <Compass className="h-4 w-4" aria-hidden />
              Tour
            </div>
          )}

          {current.kind === 'demo' && (
            <div className="mt-8 inline-flex w-fit items-center gap-2 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink bg-surface px-3 py-2 text-sm font-semibold text-ink">
              <PlayCircle className="h-4 w-4" aria-hidden />
              Demo · changes not saved
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          disabled={isFirst}
          className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-30"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Back
        </button>

        <div className="flex items-center gap-1.5" role="tablist" aria-label="Slide indicators">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Slide ${i + 1} of ${slides.length}`}
              disabled={slide.kind !== 'role' && !role && i > 0}
              onClick={() => {
                if (i > 0 && !role) return
                goTo(i, i > index ? 1 : -1)
              }}
              className={cn(
                'h-2 rounded-full transition-all',
                i === index ? 'w-6 bg-brand' : 'w-2 bg-ink/25 hover:bg-ink/40'
              )}
            />
          ))}
        </div>

        {isLast && role ? (
          <span className="min-w-[5.5rem]" aria-hidden />
        ) : (
          <Button
            size="sm"
            onClick={handleNext}
            disabled={!canAdvance}
            className="min-w-[5.5rem]"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>

      {isLast && role && (
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDemoOpen(true)}
            className="w-full sm:w-auto sm:min-w-[10rem]"
          >
            Use Demo Account
          </Button>
          <Button
            size="sm"
            onClick={handleCreateAccount}
            className="w-full sm:w-auto sm:min-w-[10rem]"
          >
            Create Account
          </Button>
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm font-semibold text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Skip
        </button>
      </div>

      {role && (
        <DemoCodeModal
          open={demoOpen}
          role={role}
          onClose={() => setDemoOpen(false)}
          onSuccess={handleDemoSuccess}
        />
      )}
    </div>
  )
}

export function hasCompletedWelcomeCarousel(): boolean {
  try {
    return localStorage.getItem(WELCOME_CAROUSEL_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}
