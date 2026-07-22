import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Compass,
  KeyRound,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  getWelcomeSlides,
  loginPathForRole,
  WELCOME_CAROUSEL_STORAGE_KEY,
  type WelcomeRole,
} from '@/lib/welcomeSlides'
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

  const handleNext = useCallback(() => {
    if (!canAdvance) return
    if (isLast && role) {
      markDone()
      onComplete()
      navigate(loginPathForRole(role))
      return
    }
    goTo(index + 1, 1)
  }, [canAdvance, goTo, index, isLast, markDone, navigate, onComplete, role])

  const handleBack = useCallback(() => {
    if (isFirst) return
    goTo(index - 1, -1)
  }, [goTo, index, isFirst])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
  }, [handleBack, handleNext])

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
            <div className="mt-8 grid flex-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <button
                type="button"
                onClick={() => handleSelectRole('tenant')}
                className={cn(
                  'group flex min-h-[7.5rem] flex-col justify-between rounded-[var(--radius-md)] border-[length:var(--border-width)] p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:p-5',
                  role === 'tenant'
                    ? 'border-brand bg-brand/5'
                    : 'border-ink bg-surface hover:border-brand hover:bg-brand/5'
                )}
              >
                <KeyRound
                  className={cn(
                    'h-8 w-8 transition-colors',
                    role === 'tenant' ? 'text-brand' : 'text-ink group-hover:text-brand'
                  )}
                  strokeWidth={1.5}
                  aria-hidden
                />
                <div>
                  <span className="heading-display text-lg sm:text-xl">I&apos;m a Tenant</span>
                  <span className="mt-1 block text-xs text-ink-muted sm:text-sm">
                    Review and sign your lease
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('landlord')}
                className={cn(
                  'group flex min-h-[7.5rem] flex-col justify-between rounded-[var(--radius-md)] border-[length:var(--border-width)] p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:p-5',
                  role === 'landlord'
                    ? 'border-brand bg-brand/5'
                    : 'border-ink bg-surface hover:border-brand hover:bg-brand/5'
                )}
              >
                <Building2
                  className={cn(
                    'h-8 w-8 transition-colors',
                    role === 'landlord' ? 'text-brand' : 'text-ink group-hover:text-brand'
                  )}
                  strokeWidth={1.5}
                  aria-hidden
                />
                <div>
                  <span className="heading-display text-lg sm:text-xl">I&apos;m a Landlord</span>
                  <span className="mt-1 block text-xs text-ink-muted sm:text-sm">
                    Manage tenants and leases
                  </span>
                </div>
              </button>
            </div>
          )}

          {current.kind === 'tour' && (
            <div className="mt-8 inline-flex w-fit items-center gap-2 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink bg-surface px-3 py-2 text-sm font-semibold text-ink">
              <Compass className="h-4 w-4" aria-hidden />
              Tour
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

        <Button
          size="sm"
          onClick={handleNext}
          disabled={!canAdvance}
          className="min-w-[5.5rem]"
        >
          {isLast ? 'Get started' : 'Next'}
          {!isLast && <ChevronRight className="h-4 w-4" aria-hidden />}
        </Button>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm font-semibold text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Skip
        </button>
      </div>
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
