import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type TouchEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { ThemeDashboardPreview } from '@/components/settings/ThemeDashboardPreview'
import { cn } from '@/lib/utils'
import type { ThemeAppearance, ThemeId, ThemeOption } from '@/themes/types'

interface MobileStyleBrowserProps {
  themeId: ThemeId
  themes: ThemeOption[]
  onSelect: (id: ThemeId) => void
  appearance?: ThemeAppearance
}

/**
 * Spacious mobile-first style browser: one large preview at a time with
 * prev/next controls, position indicator, and an expanded preview sheet.
 */
export function MobileStyleBrowser({
  themeId,
  themes,
  onSelect,
  appearance = 'light',
}: MobileStyleBrowserProps) {
  const activeIndex = Math.max(
    0,
    themes.findIndex((t) => t.id === themeId)
  )
  const [index, setIndex] = useState(activeIndex)
  const [expanded, setExpanded] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const labelId = useId()

  // Jump carousel to the applied style when it changes (e.g. Apply Style)
  useEffect(() => {
    const next = themes.findIndex((t) => t.id === themeId)
    if (next >= 0) setIndex(next)
    // themes is the stable themeOptions export from context
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync when applied id changes
  }, [themeId])

  const total = themes.length
  if (total === 0) return null

  const safeIndex = ((index % total) + total) % total
  const option = themes[safeIndex]
  const isActive = themeId === option.id
  const isPreviewing = !isActive

  const go = (delta: number) => {
    setIndex((i) => {
      const next = i + delta
      if (next < 0) return total - 1
      if (next >= total) return 0
      return next
    })
  }

  const apply = () => {
    onSelect(option.id)
    setExpanded(false)
  }

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null
  }

  const onTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 48) return
    go(dx < 0 ? 1 : -1)
  }

  useEffect(() => {
    if (!expanded) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setExpanded(false)
      }
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [expanded])

  return (
    <div className="md:hidden">
      {/* Position + current style name */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <p id={labelId} className="min-w-0 truncate font-display text-base font-semibold text-ink">
          {option.name}
        </p>
        <p className="shrink-0 text-xs font-semibold tabular-nums text-ink-muted label-caps">
          {safeIndex + 1} of {total}
        </p>
      </div>

      {/* Large style card */}
      <div
        role="group"
        aria-labelledby={labelId}
        className={cn(
          'overflow-hidden border-[length:var(--border-width)] bg-surface-paper shadow-lift',
          'rounded-[var(--radius-lg)]',
          isActive ? 'border-accent' : 'border-line'
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="relative block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
          aria-label={`Preview ${option.name} larger`}
        >
          <ThemeDashboardPreview
            themeId={option.id}
            appearance={appearance}
            size="card"
            className="rounded-none border-0 shadow-none"
          />
          <span className="pointer-events-none absolute bottom-2 right-2 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface-paper/95 px-2 py-1 text-[10px] font-semibold text-ink-muted label-caps shadow-lift">
            Tap to enlarge
          </span>
        </button>

        <div className="space-y-3 border-t-[length:var(--border-width)] border-line p-4">
          <div className="flex flex-wrap items-center gap-2">
            {isActive && (
              <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-accent bg-accent-light px-2 py-1 text-[10px] font-semibold text-accent label-caps">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                Current Style
              </span>
            )}
            {isPreviewing && (
              <span className="inline-flex items-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface px-2 py-1 text-[10px] font-semibold text-ink-muted label-caps">
                Previewing
              </span>
            )}
          </div>

          <div>
            <p className="font-display text-lg font-semibold leading-tight text-ink">{option.name}</p>
            <p className="mt-1 text-[11px] font-semibold text-accent label-caps">{option.tagline}</p>
            <p className="mt-2 text-sm leading-snug text-ink-muted">{option.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface text-ink hover:border-ink"
              aria-label="Previous style"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
            </button>

            <Button
              type="button"
              variant={isActive ? 'outline' : 'primary'}
              size="lg"
              className="min-h-11 flex-1 rounded-[var(--radius-sm)]"
              onClick={apply}
              disabled={isActive}
              aria-pressed={isActive}
            >
              {isActive ? 'Applied' : 'Apply Style'}
            </Button>

            <button
              type="button"
              onClick={() => go(1)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface text-ink hover:border-ink"
              aria-label="Next style"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
            </button>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-1" role="tablist" aria-label="Styles">
            {themes.map((t, i) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={i === safeIndex}
                onClick={() => setIndex(i)}
                className="inline-flex h-11 min-w-11 items-center justify-center"
                aria-label={`Show ${t.name}`}
              >
                <span
                  className={cn(
                    'h-2.5 rounded-full transition-all',
                    i === safeIndex ? 'w-6 bg-accent' : 'w-2.5 bg-line'
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Expanded preview sheet */}
      {expanded && (
        <div
          className="fixed inset-0 z-[110] flex flex-col bg-ink/70"
          role="dialog"
          aria-modal="true"
          aria-label={`${option.name} preview`}
        >
          <button
            type="button"
            className="min-h-[8vh] flex-1 cursor-default border-0 bg-transparent"
            aria-label="Close preview"
            onClick={() => setExpanded(false)}
          />
          <div
            className={cn(
              'flex max-h-[min(92vh,100%)] w-full flex-col overflow-hidden border-t-[length:var(--border-width)] border-ink bg-surface-paper shadow-lift',
              'rounded-t-[var(--radius-lg)]',
              'pb-[max(1rem,env(safe-area-inset-bottom))]'
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b-[length:var(--border-width)] border-line px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold text-ink">{option.name}</p>
                <p className="truncate text-[11px] font-semibold text-accent label-caps">
                  {option.tagline}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line text-ink-muted hover:border-ink hover:text-ink"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" strokeWidth={2.25} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <ThemeDashboardPreview
                themeId={option.id}
                appearance={appearance}
                size="expanded"
                className="w-full"
              />
              <p className="mt-3 text-sm leading-snug text-ink-muted">{option.description}</p>
              {isActive && (
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent label-caps">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                  Current Style
                </p>
              )}
            </div>

            <div className="flex gap-2 border-t-[length:var(--border-width)] border-line px-4 pt-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="min-h-11 flex-1 rounded-[var(--radius-sm)]"
                onClick={() => setExpanded(false)}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="min-h-11 flex-1 rounded-[var(--radius-sm)]"
                onClick={apply}
                disabled={isActive}
              >
                {isActive ? 'Applied' : 'Apply Style'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
