import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { restartOnboardingTour } from '@/components/onboarding/OnboardingTour'
import {
  getPublicDemoRole,
  hasSeenDemoTourNotice,
  isPublicDemoSession,
  markDemoTourNoticeSeen,
  peekNewRegistrantsDemoCue,
  peekPendingTenantDemoCue,
  requestDemoLeaseTagNudge,
  requestDemoTourStart,
  setDemoTourNoticeHighlight,
  DEMO_TOUR_NOTICE_CONSUMED_EVENT,
  type DemoTourNoticePov,
} from '@/lib/publicDemo'
import { cn } from '@/lib/utils'

type SpotlightRects = {
  trigger: DOMRect | null
  panel: DOMRect | null
  item: DOMRect | null
}

type CardPlacement = {
  top: number
  right: number
  width: number
  besideMenu: boolean
}

function resolvePov(roleFromAuth: string | undefined | null): DemoTourNoticePov | null {
  const sessionRole = getPublicDemoRole()
  if (sessionRole === 'landlord' || sessionRole === 'tenant') return sessionRole
  if (roleFromAuth === 'admin') return 'landlord'
  if (roleFromAuth === 'client') return 'tenant'
  return null
}

function menuScopeForViewport(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'
  return window.matchMedia('(min-width: 768px)').matches ? 'desktop' : 'mobile'
}

function unionRect(a: DOMRect | null, b: DOMRect | null): DOMRect | null {
  if (!a) return b
  if (!b) return a
  const left = Math.min(a.left, b.left)
  const top = Math.min(a.top, b.top)
  const right = Math.max(a.right, b.right)
  const bottom = Math.max(a.bottom, b.bottom)
  return new DOMRect(left, top, right - left, bottom - top)
}

/**
 * Place the notice on the right side of the viewport, immediately left of the open
 * Menu when there is room — never flash in from the far left.
 */
function computeCardPlacement(
  rects: SpotlightRects,
  viewportW: number,
  viewportH: number
): CardPlacement | null {
  const isMobile = viewportW < 768
  const sidePad = 12
  const gap = 10
  const estimatedCardH = isMobile ? 280 : 310
  const preferredWidth = isMobile ? Math.min(280, viewportW - 32) : 320

  const menuPanel = rects.panel
  const trigger = rects.trigger
  const menuCluster = unionRect(rects.trigger, rects.panel)

  // Prefer anchoring to the open menu panel (right side of the screen).
  if (menuPanel && menuPanel.width > 2 && menuPanel.height > 2) {
    const spaceLeftOfMenu = Math.max(0, menuPanel.left - sidePad - gap)
    if (spaceLeftOfMenu >= (isMobile ? 96 : 220)) {
      const width = Math.min(Math.floor(spaceLeftOfMenu), preferredWidth)
      const right = Math.max(sidePad, viewportW - menuPanel.left + gap)
      const preferredTop = menuPanel.top
      const maxTop = Math.max(sidePad, viewportH - estimatedCardH - sidePad)
      return {
        top: Math.min(Math.max(sidePad, preferredTop), maxTop),
        right,
        width,
        besideMenu: true,
      }
    }

    // Narrow viewport: keep the card on the right, stacked under the menu cluster.
    const width = Math.min(preferredWidth, viewportW - sidePad * 2)
    const anchorRight = Math.max(sidePad, viewportW - menuPanel.right)
    const below = menuPanel.bottom + 12
    const fitsBelow = below + estimatedCardH < viewportH - sidePad
    return {
      top: fitsBelow
        ? below
        : Math.max(sidePad, Math.min(trigger?.bottom ? trigger.bottom + 8 : 72, viewportH - estimatedCardH - sidePad)),
      right: Math.min(anchorRight, viewportW - width - sidePad),
      width,
      besideMenu: true,
    }
  }

  // Trigger only (panel not measured yet) — still lock to the right, never left:16.
  if (trigger && trigger.width > 2) {
    const width = Math.min(preferredWidth, viewportW - sidePad * 2)
    const right = Math.max(sidePad, viewportW - trigger.right)
    return {
      top: Math.min(
        Math.max(sidePad, trigger.bottom + 10),
        Math.max(sidePad, viewportH - estimatedCardH - sidePad)
      ),
      right: Math.min(right, viewportW - width - sidePad),
      width,
      besideMenu: true,
    }
  }

  if (menuCluster && menuCluster.width > 2) {
    const width = Math.min(preferredWidth, viewportW - sidePad * 2)
    const right = Math.max(sidePad, viewportW - menuCluster.right)
    const below = menuCluster.bottom + 14
    const fitsBelow = below + 200 < viewportH - 16
    return {
      top: fitsBelow ? below : Math.max(16, menuCluster.top - estimatedCardH - 12),
      right: Math.min(right, viewportW - width - sidePad),
      width,
      besideMenu: false,
    }
  }

  return null
}

/**
 * One-time per-POV notice in the public demo: offers Take the Tour Now or a
 * manual demo path, and highlights Menu → Take the tour.
 */
export function DemoTourNoticeHost() {
  const { user } = useAuth()
  const location = useLocation()
  const [pov, setPov] = useState<DemoTourNoticePov | null>(null)
  const [visible, setVisible] = useState(false)
  const [rects, setRects] = useState<SpotlightRects>({
    trigger: null,
    panel: null,
    item: null,
  })
  const [placement, setPlacement] = useState<CardPlacement | null>(null)
  const [allowTriggerFallback, setAllowTriggerFallback] = useState(false)
  const takeTourRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const titleId = 'demo-tour-notice-title'
  const descId = 'demo-tour-notice-desc'
  const exploreTitleId = 'demo-tour-notice-explore-title'

  const panelReady = Boolean(rects.panel && rects.panel.width > 2)
  const showCard = Boolean(placement && (panelReady || allowTriggerFallback))

  const closeNotice = useCallback(
    (options?: { restoreFocus?: boolean; leaseTagNudge?: boolean }) => {
      const dismissedPov = pov
      if (pov) markDemoTourNoticeSeen(pov)
      setDemoTourNoticeHighlight(false)
      setVisible(false)
      setPov(null)
      setPlacement(null)
      setAllowTriggerFallback(false)
      setRects({ trigger: null, panel: null, item: null })

      if (options?.restoreFocus !== false) {
        const restore = previousFocusRef.current
        previousFocusRef.current = null
        window.requestAnimationFrame(() => {
          const menuTrigger = document.querySelector<HTMLElement>(
            '[data-onboarding="admin-desktop-menu"], [data-onboarding="admin-mobile-menu"], [data-onboarding="portal-desktop-menu"], [data-onboarding="portal-mobile-menu"]'
          )
          const focusTarget =
            restore && document.contains(restore) ? restore : menuTrigger
          focusTarget?.focus?.()
        })
      } else {
        previousFocusRef.current = null
      }

      if (options?.leaseTagNudge !== false && dismissedPov === 'landlord') {
        window.setTimeout(() => {
          if (window.matchMedia('(max-width: 767px)').matches) {
            requestDemoLeaseTagNudge()
          }
        }, 2800)
      }
    },
    [pov]
  )

  const dismiss = useCallback(() => {
    closeNotice({ restoreFocus: true, leaseTagNudge: true })
  }, [closeNotice])

  const startTourNow = useCallback(() => {
    const role = pov === 'tenant' ? 'client' : 'admin'
    closeNotice({ restoreFocus: false, leaseTagNudge: false })
    void restartOnboardingTour(role, user?.id, () => requestDemoTourStart())
  }, [closeNotice, pov, user?.id])

  const tryShow = useCallback(() => {
    if (visible) return
    // Demo session is the source of truth — don’t require user.publicDemo
    // (hydration races previously let the full tour auto-start instead).
    if (!isPublicDemoSession()) return
    if (!user) return

    const nextPov = resolvePov(user.role)
    if (!nextPov) return
    if (hasSeenDemoTourNotice(nextPov)) return

    // Defer while landlord guide cues are active so we don’t stack overlays.
    if (nextPov === 'landlord') {
      if (peekNewRegistrantsDemoCue() || peekPendingTenantDemoCue()) return
    }

    const path = location.pathname
    const onLandlordApp = path.startsWith('/studio')
    const onTenantApp = path.startsWith('/portal')
    if (nextPov === 'landlord' && !onLandlordApp) return
    if (nextPov === 'tenant' && !onTenantApp) return

    setPov(nextPov)
    setVisible(true)
  }, [location.pathname, user, visible])

  useEffect(() => {
    tryShow()
  }, [tryShow, location.pathname, user?.id, user?.role])

  // Re-check after guide cues clear.
  useEffect(() => {
    if (visible) return
    if (!isPublicDemoSession()) return
    const interval = window.setInterval(() => {
      tryShow()
    }, 700)
    return () => window.clearInterval(interval)
  }, [tryShow, visible])

  useEffect(() => {
    if (!visible || !pov) return

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    // Open + highlight Menu immediately so the right-side anchor exists before the card paints.
    setDemoTourNoticeHighlight(true, menuScopeForViewport())

    const onResize = () => {
      setDemoTourNoticeHighlight(true, menuScopeForViewport())
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      setDemoTourNoticeHighlight(false)
    }
  }, [visible, pov])

  useEffect(() => {
    if (!visible || !showCard) return
    window.requestAnimationFrame(() => {
      takeTourRef.current?.focus()
    })
  }, [visible, showCard])

  useEffect(() => {
    if (!visible) return
    const onConsumed = () => {
      closeNotice({ restoreFocus: false, leaseTagNudge: false })
    }
    window.addEventListener(DEMO_TOUR_NOTICE_CONSUMED_EVENT, onConsumed)
    return () => window.removeEventListener(DEMO_TOUR_NOTICE_CONSUMED_EVENT, onConsumed)
  }, [visible, closeNotice])

  useEffect(() => {
    if (!visible) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        dismiss()
        return
      }
      if (event.key !== 'Tab') return
      const root = takeTourRef.current?.closest('[role="dialog"]')
      if (!root) return
      const focusable = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [visible, dismiss])

  useLayoutEffect(() => {
    if (!visible) return

    // Landlord/tenant demo landings must start at the top; never inherit mid-page scroll.
    window.scrollTo(0, 0)
    setAllowTriggerFallback(false)

    const update = () => {
      const trigger = document.querySelector('[data-tour-notice-trigger]')
      const panel = document.querySelector('[data-tour-notice-panel]')
      const item = document.querySelector('[data-tour-notice-item]')
      const nextRects: SpotlightRects = {
        trigger: trigger?.getBoundingClientRect() ?? null,
        panel: panel?.getBoundingClientRect() ?? null,
        item: item?.getBoundingClientRect() ?? null,
      }
      setRects(nextRects)

      const viewportW = window.innerWidth
      const viewportH = window.innerHeight
      const nextPlacement = computeCardPlacement(nextRects, viewportW, viewportH)
      if (nextPlacement) {
        setPlacement((prev) => {
          if (
            prev &&
            prev.top === nextPlacement.top &&
            prev.right === nextPlacement.right &&
            prev.width === nextPlacement.width &&
            prev.besideMenu === nextPlacement.besideMenu
          ) {
            return prev
          }
          return nextPlacement
        })
      }
    }

    update()
    const frame = window.requestAnimationFrame(update)
    const frame2 = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(update)
    })
    // If the menu panel is slow to mount, still show a right-anchored card via trigger.
    const fallbackTimer = window.setTimeout(() => {
      setAllowTriggerFallback(true)
      update()
    }, 450)
    const interval = window.setInterval(update, 200)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.cancelAnimationFrame(frame2)
      window.clearTimeout(fallbackTimer)
      window.clearInterval(interval)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [visible])

  if (!visible || !pov) return null

  const pad = 6
  const holes: Array<{ left: number; top: number; width: number; height: number; rx: number }> =
    []
  for (const rect of [rects.trigger, rects.panel]) {
    if (!rect || rect.width < 2 || rect.height < 2) continue
    holes.push({
      left: Math.max(0, rect.left - pad),
      top: Math.max(0, rect.top - pad),
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
      rx: 8,
    })
  }

  const compact = Boolean(placement?.besideMenu)

  return (
    <div
      className="fixed inset-0 z-[95]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <mask id="demo-tour-notice-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {holes.map((hole, index) => (
              <rect
                key={index}
                x={hole.left}
                y={hole.top}
                width={hole.width}
                height={hole.height}
                rx={hole.rx}
                fill="black"
              />
            ))}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.52)"
          mask="url(#demo-tour-notice-spotlight-mask)"
        />
      </svg>

      <div className="absolute inset-0 z-0" aria-hidden />

      {holes.map((hole, index) => (
        <div
          key={`ring-${index}`}
          className={cn(
            'pointer-events-none absolute rounded-[var(--radius-md)] border-[length:var(--border-width)] border-brand',
            'shadow-[0_0_0_3px_rgba(30,77,107,0.28)]',
            index === 0 && 'demo-tour-notice-target--pulse'
          )}
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
          }}
        />
      ))}

      {rects.item ? (
        <div
          className="pointer-events-none absolute rounded-[var(--radius-sm)] border-2 border-dashed border-brand/80"
          style={{
            top: Math.max(0, rects.item.top - 4),
            left: Math.max(0, rects.item.left - 4),
            width: rects.item.width + 8,
            height: rects.item.height + 8,
          }}
          aria-hidden
        />
      ) : null}

      {showCard && placement ? (
        <div
          className={cn(
            'pointer-events-auto absolute z-[96] rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink bg-surface-paper shadow-lift',
            'demo-tour-notice-card demo-tour-notice-card--ready',
            compact ? 'p-3' : 'p-4'
          )}
          style={{
            top: `max(${placement.top}px, calc(0.75rem + env(safe-area-inset-top, 0px)))`,
            right: `max(${placement.right}px, env(safe-area-inset-right, 0px))`,
            left: 'auto',
            width: placement.width,
            maxWidth: placement.width,
          }}
        >
          <p id={titleId} className="sr-only">
            Choose a guided tour or continue with a manual demo
          </p>

          <button
            ref={takeTourRef}
            type="button"
            onClick={startTourNow}
            className={cn(
              'flex w-full items-center justify-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-brand bg-brand font-semibold text-white transition-colors hover:border-brand-light hover:bg-brand-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              compact ? 'min-h-10 px-3 py-2 text-xs' : 'min-h-11 px-4 py-2.5 text-sm'
            )}
          >
            Take the Tour Now
          </button>

          <div
            className={cn(
              'border-t border-line',
              compact ? 'mt-3 pt-3' : 'mt-4 pt-4'
            )}
          >
            <p
              id={exploreTitleId}
              className={cn(
                'heading-display text-ink',
                compact ? 'text-sm leading-snug' : 'text-base'
              )}
            >
              Explore at your own pace
            </p>
            <p
              id={descId}
              className={cn(
                'text-ink-muted',
                compact ? 'mt-1.5 text-xs leading-snug' : 'mt-2 text-sm leading-snug'
              )}
            >
              Prefer to browse freely? The tour option stays available anytime in the Menu
              dropdown.
            </p>
            <button
              type="button"
              onClick={dismiss}
              className={cn(
                'flex w-full items-center justify-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-ink/20 bg-surface font-semibold text-ink transition-colors hover:border-ink/40 hover:bg-surface-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                compact
                  ? 'mt-3 min-h-10 px-3 py-2 text-xs'
                  : 'mt-4 min-h-11 px-4 py-2.5 text-sm'
              )}
            >
              Continue to manual demo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
