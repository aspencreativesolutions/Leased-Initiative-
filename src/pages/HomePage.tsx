import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, KeyRound, Loader2, Palette } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TermsOfServiceModal } from '@/components/legal/TermsOfServiceModal'
import { HomeStyleChooserModal } from '@/components/settings/HomeStyleChooserModal'
import { HomeStyleExploreSection } from '@/components/settings/HomeStyleExploreSection'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import { BrandMark } from '@/components/brand/BrandMark'
import { BRAND_NAME } from '@/lib/brand'
import {
  gatherHomePageContent,
  HOME_TILE_ICON_SRC,
  type HomeFeatureHighlight,
} from '@/lib/homePageContent'
import {
  loginPathForRole,
  registerPathForRole,
  type WelcomeRole,
} from '@/lib/welcomeSlides'
import { markPublicDemoSession, redeemDemoCode } from '@/lib/publicDemo'
import { cn } from '@/lib/utils'
import { persistThemeIdAcrossSurfaces } from '@/themes/applyTheme'
import { DEFAULT_THEME_ID, THEME_STORAGE_KEY } from '@/themes/options'

type AuthIntent = 'signin' | 'register' | null
type QuickAccessPhase = 'closed' | 'opening' | 'open' | 'closing'

const KEY_ICON_SRC = encodeURI('/images/key icon.jpeg')
const QUICK_ACCESS_OPEN_MS = 220
const QUICK_ACCESS_CLOSE_MS = 160

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Gentle icon motion keyed to each feature’s metaphor (bell ring, paper flutter, …). */
const TILE_ICON_MOTION: Record<string, string> = {
  'verify-accept-tenants': 'nod',
  'draft-finalize-leases': 'flutter',
  'share-lease-dashboard': 'flutter',
  'schedule-payments': 'tilt',
  'rent-reminder-notifications': 'ring',
  'report-household-issues': 'shake',
  'import-property-records': 'flutter',
  'track-rentals-availability': 'tilt',
  'invite-connect-tenants': 'nod',
}

function ActionTile({
  feature,
  index,
  expanded,
  onToggle,
}: {
  feature: HomeFeatureHighlight
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  const descId = `home-tile-desc-${feature.id}`
  const iconMotion = TILE_ICON_MOTION[feature.id] ?? 'nod'

  return (
    <li
      className={cn('home-page__tile', expanded && 'home-page__tile--expanded')}
      style={{ animationDelay: `${90 + index * 55}ms` }}
    >
      <button
        type="button"
        className="home-page__tile-trigger"
        aria-expanded={expanded}
        aria-controls={descId}
        onClick={onToggle}
      >
        <span
          className={cn('home-page__tile-icon-layer', `home-page__tile-icon-layer--${iconMotion}`)}
          aria-hidden
        >
          <img
            src={feature.iconSrc}
            alt=""
            className="home-page__tile-icon"
            draggable={false}
            decoding="async"
          />
        </span>
        <span className="home-page__tile-face home-page__tile-face--default">
          <span className="home-page__tile-title">{feature.title}</span>
        </span>
        <span id={descId} className="home-page__tile-face home-page__tile-face--detail">
          {feature.description}
        </span>
      </button>
    </li>
  )
}

function FeaturesGrid({
  features,
  expandedTileId,
  setExpandedTileId,
}: {
  features: HomeFeatureHighlight[]
  expandedTileId: string | null
  setExpandedTileId: Dispatch<SetStateAction<string | null>>
}) {
  return (
    <ul className="home-page__feature-grid">
      {features.map((feature, index) => (
        <ActionTile
          key={feature.id}
          feature={feature}
          index={index}
          expanded={expandedTileId === feature.id}
          onToggle={() =>
            setExpandedTileId((current) => (current === feature.id ? null : feature.id))
          }
        />
      ))}
    </ul>
  )
}

export function HomePage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const content = gatherHomePageContent()
  const demoCodeId = useId()
  const quickAccessPanelId = useId()
  const demoInputRef = useRef<HTMLInputElement>(null)
  const quickAccessRef = useRef<HTMLDivElement>(null)
  const quickAccessPanelRef = useRef<HTMLDivElement>(null)
  const quickAccessPhaseRef = useRef<QuickAccessPhase>('closed')
  const quickAccessPendingRef = useRef<'open' | 'closed' | null>(null)

  const [authIntent, setAuthIntent] = useState<AuthIntent>(null)
  const [demoCode, setDemoCode] = useState('')
  const [demoError, setDemoError] = useState('')
  const [demoSubmitting, setDemoSubmitting] = useState(false)
  const [expandedTileId, setExpandedTileId] = useState<string | null>(null)
  const [logoPreviewOpen, setLogoPreviewOpen] = useState(false)
  const [styleChooserOpen, setStyleChooserOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  /** Collapsed on every home-page mount; open state only lasts while staying here. */
  const [quickAccessPhase, setQuickAccessPhase] = useState<QuickAccessPhase>('closed')
  const [keyIdleAnimation, setKeyIdleAnimation] = useState(true)

  const demoCodeReady = Boolean(demoCode.trim()) && !demoSubmitting
  const quickAccessOpen =
    quickAccessPhase === 'open' ||
    quickAccessPhase === 'opening' ||
    quickAccessPhase === 'closing'
  const quickAccessInteractive =
    quickAccessPhase === 'open' || quickAccessPhase === 'opening'

  quickAccessPhaseRef.current = quickAccessPhase

  const finishQuickAccessPhase = useCallback((expected: QuickAccessPhase) => {
    if (quickAccessPhaseRef.current !== expected) return

    if (expected === 'opening') {
      if (quickAccessPendingRef.current === 'closed') {
        quickAccessPendingRef.current = null
        quickAccessPhaseRef.current = 'closing'
        setQuickAccessPhase('closing')
        return
      }
      quickAccessPendingRef.current = null
      quickAccessPhaseRef.current = 'open'
      setQuickAccessPhase('open')
      return
    }

    if (expected === 'closing') {
      if (quickAccessPendingRef.current === 'open') {
        quickAccessPendingRef.current = null
        quickAccessPhaseRef.current = 'opening'
        setQuickAccessPhase('opening')
        return
      }
      quickAccessPendingRef.current = null
      quickAccessPhaseRef.current = 'closed'
      setQuickAccessPhase('closed')
    }
  }, [])

  const closeQuickAccess = useCallback(() => {
    setAuthIntent(null)
    const current = quickAccessPhaseRef.current
    if (current === 'closed') {
      quickAccessPendingRef.current = null
      return
    }
    if (current === 'closing') {
      quickAccessPendingRef.current = 'closed'
      return
    }
    if (current === 'opening') {
      quickAccessPendingRef.current = 'closed'
      return
    }
    quickAccessPhaseRef.current = 'closing'
    setQuickAccessPhase('closing')
  }, [])

  const toggleQuickAccess = useCallback(() => {
    setKeyIdleAnimation(false)
    setAuthIntent(null)
    const current = quickAccessPhaseRef.current
    if (current === 'closed') {
      quickAccessPendingRef.current = null
      quickAccessPhaseRef.current = 'opening'
      setQuickAccessPhase('opening')
      return
    }
    if (current === 'open') {
      quickAccessPendingRef.current = null
      quickAccessPhaseRef.current = 'closing'
      setQuickAccessPhase('closing')
      return
    }
    // Finish the in-flight animation, then honor the latest intent.
    quickAccessPendingRef.current = current === 'opening' ? 'closed' : 'open'
  }, [])

  useEffect(() => {
    if (loading || !user) return
    navigate(user.role === 'admin' ? '/studio' : '/portal', { replace: true })
  }, [loading, user, navigate])

  useEffect(() => {
    if (quickAccessPhase !== 'opening' && quickAccessPhase !== 'closing') return

    if (prefersReducedMotion()) {
      finishQuickAccessPhase(quickAccessPhase)
      return
    }

    const duration =
      quickAccessPhase === 'opening' ? QUICK_ACCESS_OPEN_MS : QUICK_ACCESS_CLOSE_MS
    const timer = window.setTimeout(() => {
      finishQuickAccessPhase(quickAccessPhase)
    }, duration + 32)

    return () => window.clearTimeout(timer)
  }, [quickAccessPhase, finishQuickAccessPhase])

  useEffect(() => {
    if (!quickAccessInteractive) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeQuickAccess()
    }
    document.addEventListener('keydown', onKey)

    // Defer outside-dismiss so the opening click cannot immediately close the panel.
    let onPointerDown: ((event: PointerEvent) => void) | null = null
    const attachTimer = window.setTimeout(() => {
      onPointerDown = (event: PointerEvent) => {
        const root = quickAccessRef.current
        if (!root || root.contains(event.target as Node)) return
        closeQuickAccess()
      }
      document.addEventListener('pointerdown', onPointerDown)
    }, 0)

    return () => {
      window.clearTimeout(attachTimer)
      document.removeEventListener('keydown', onKey)
      if (onPointerDown) document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [quickAccessInteractive, closeQuickAccess])

  useEffect(() => {
    const panel = quickAccessPanelRef.current
    if (!panel) return
    if (quickAccessInteractive) panel.removeAttribute('inert')
    else panel.setAttribute('inert', '')
  }, [quickAccessInteractive])

  const handleDemoSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (demoSubmitting || !demoCode.trim()) return
    setDemoError('')
    setDemoSubmitting(true)
    try {
      await redeemDemoCode(demoCode, 'landlord')
      markPublicDemoSession()
      // First-time demo with no saved style → Slate Bureau across landlord/tenant POV
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        persistThemeIdAcrossSurfaces(DEFAULT_THEME_ID)
      }
      navigate('/demo/pov', { replace: true })
    } catch (err) {
      setDemoError(err instanceof ApiError ? err.message : 'Could not unlock the demo')
    } finally {
      setDemoSubmitting(false)
    }
  }

  const goAuth = (role: WelcomeRole) => {
    const intent = authIntent
    setAuthIntent(null)
    if (intent === 'register') {
      navigate(registerPathForRole(role))
      return
    }
    navigate(loginPathForRole(role))
  }

  return (
    <div className="home-page relative min-h-screen overflow-x-hidden bg-surface text-ink">
      <div className="home-page__atmosphere pointer-events-none absolute inset-0" aria-hidden />

      {/* Quick Access — key icon + Sign In / Create Account / demo code */}
      <div
        ref={quickAccessRef}
        className="home-quick-access fixed right-3 top-3 z-[100] flex flex-col items-end gap-2 sm:right-5 sm:top-5 lg:right-7 lg:top-7"
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            toggleQuickAccess()
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className={cn(
            'home-quick-access__key',
            keyIdleAnimation && 'home-quick-access__key--idle',
            quickAccessOpen && 'home-quick-access__key--open'
          )}
          aria-expanded={quickAccessOpen}
          aria-controls={quickAccessPanelId}
          aria-label={quickAccessOpen ? 'Close quick access' : 'Open quick access'}
          title="Quick Access"
        >
          <img src={KEY_ICON_SRC} alt="" className="home-quick-access__key-img" draggable={false} />
        </button>

        <div
          ref={quickAccessPanelRef}
          id={quickAccessPanelId}
          className="home-quick-access__panel w-[min(14.5rem,calc(100vw-1.5rem))] max-h-[min(70vh,36rem)] overflow-x-hidden overflow-y-auto overscroll-contain"
          data-state={quickAccessPhase}
          role="dialog"
          aria-label="Quick Access"
          aria-hidden={!quickAccessInteractive}
          onTransitionEnd={(event) => {
            if (event.target !== event.currentTarget) return
            if (event.propertyName !== 'opacity') return
            const phase = quickAccessPhaseRef.current
            if (phase === 'opening' || phase === 'closing') {
              finishQuickAccessPhase(phase)
            }
          }}
        >
          <div className="home-quick-access__panel-inner flex w-[min(13.5rem,calc(100vw-1.5rem))] flex-col items-stretch gap-3 sm:w-[14.5rem]">
            <div className="relative flex flex-col items-stretch gap-3">
              <Button size="lg" className="w-full" onClick={() => setAuthIntent('signin')}>
                Sign In
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => setAuthIntent('register')}
              >
                Create Account
              </Button>

              {authIntent && (
                <div
                  className="home-page__role-picker w-full rounded-[var(--radius-lg)] border-[length:var(--border-width)] border-ink bg-surface-paper/95 p-3 text-left shadow-[0_16px_48px_-28px_rgb(0_0_0_/_0.4)]"
                  role="dialog"
                  aria-label={
                    authIntent === 'signin' ? 'Choose sign-in role' : 'Choose account type'
                  }
                >
                  <p className="px-1 pb-2 text-center text-xs font-semibold text-ink-muted">
                    {authIntent === 'signin' ? 'Sign in as' : 'Create an account as'}
                  </p>
                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={() => goAuth('tenant')}
                      className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-line px-3 py-3 text-left transition-colors hover:border-brand hover:bg-brand/5"
                    >
                      <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                      <span>
                        <span className="block text-sm font-semibold text-ink">Tenant</span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">
                          Portal for leases and rent
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => goAuth('landlord')}
                      className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-line px-3 py-3 text-left transition-colors hover:border-brand hover:bg-brand/5"
                    >
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                      <span>
                        <span className="block text-sm font-semibold text-ink">Landlord</span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-ink-muted">
                          Manage tenants and properties
                        </span>
                      </span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAuthIntent(null)}
                    className="mt-2 w-full py-1.5 text-center text-xs font-semibold text-ink-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <button
                type="button"
                onClick={() => {
                  closeQuickAccess()
                  setStyleChooserOpen(true)
                }}
                className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-line px-3 py-2.5 text-left transition-colors hover:border-brand hover:bg-brand/5"
              >
                <Palette className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                <span className="text-sm font-semibold text-ink">Style Chooser</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closeQuickAccess()
                  setTermsOpen(true)
                }}
                className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-line px-3 py-2.5 text-left transition-colors hover:border-brand hover:bg-brand/5"
                title="View Terms of Service"
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden"
                  aria-hidden
                >
                  <img
                    src={HOME_TILE_ICON_SRC.draftFinalizeLeases}
                    alt=""
                    className="h-5 w-5 object-contain"
                    draggable={false}
                    decoding="async"
                  />
                </span>
                <span className="text-sm font-semibold text-ink">Terms of Service</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                void handleDemoSubmit(e)
              }}
              className="home-demo-tile flex flex-col items-center gap-2.5"
            >
              <label
                htmlFor={demoCodeId}
                className="text-center text-[11px] font-semibold leading-snug text-ink"
              >
                Have a Demo Code?
              </label>
              <input
                ref={demoInputRef}
                id={demoCodeId}
                type="text"
                value={demoCode}
                onChange={(e) => {
                  setDemoCode(e.target.value)
                  if (demoError) setDemoError('')
                }}
                autoComplete="off"
                spellCheck={false}
                placeholder="Access code"
                disabled={demoSubmitting}
                className="home-demo-tile__input"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!demoCodeReady}
                className="w-full"
              >
                {demoSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : null}
                {demoSubmitting ? 'Checking…' : 'Enter Code'}
              </Button>
              {demoError && (
                <p className="text-[10px] font-medium leading-snug text-accent" role="alert">
                  {demoError}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Centered brand + feature grid + styles */}
      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 pb-10 text-center sm:px-6 sm:pb-12 lg:px-8">
        {/* First viewport: logo, title, subtitle, and all nine tiles */}
        <div className="home-page__above-fold flex w-full flex-col items-center justify-center pt-8 sm:pt-10">
          <header className="home-page__hero flex w-full max-w-3xl flex-col items-center">
            <div className="home-page__brand mb-2.5 flex flex-col items-center gap-1.5 sm:mb-3 sm:gap-2">
              <button
                type="button"
                onClick={() => setLogoPreviewOpen(true)}
                className="home-page__brand-mark-trigger cursor-zoom-in rounded-none border-0 bg-transparent p-0 text-ink transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                aria-label="View enlarged brand mark"
              >
                <BrandMark className="home-page__brand-mark h-10 w-10 shadow-[0_10px_32px_-20px_rgb(0_0_0_/_0.35)] sm:h-11 sm:w-11" />
              </button>
              <p className="home-page__brand-title text-[1.75rem] leading-tight sm:text-4xl lg:text-[2.75rem]">
                {content.brand}
              </p>
            </div>

            <h1 className="home-page__tagline max-w-lg text-lg leading-snug sm:text-xl lg:text-2xl">
              {content.tagline}
            </h1>
            <p className="home-page__purpose mt-1.5 max-w-md text-sm leading-snug text-ink-muted sm:mt-2 sm:text-[0.9375rem]">
              {content.purpose}
            </p>
          </header>

          <section
            className="home-page__tiles mt-4 w-full max-w-[46rem] sm:mt-5 lg:max-w-[48rem]"
            aria-labelledby="home-features-heading"
            onMouseLeave={() => setExpandedTileId(null)}
          >
            <h2
              id="home-features-heading"
              className="home-page__tagline mb-3 text-sm sm:mb-3.5 sm:text-base"
            >
              Hover or tap a tile to learn more.
            </h2>
            <FeaturesGrid
              features={content.features}
              expandedTileId={expandedTileId}
              setExpandedTileId={setExpandedTileId}
            />
          </section>
        </div>

        <HomeStyleExploreSection />

        <footer className="home-page__footer mt-10 flex w-full max-w-4xl flex-col items-center gap-3 border-t border-line/80 pt-6 text-center sm:mt-12">
          <p className="text-sm font-semibold tracking-tight text-ink">{BRAND_NAME}</p>
          <p className="text-xs text-ink-faint">Landlord &amp; tenant management</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
            <Link
              to="/terms"
              className="font-semibold text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              Terms of Service
            </Link>
            <Link
              to="/welcome"
              className="font-semibold text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              Guided product tour
            </Link>
          </div>
        </footer>
      </div>

      <Modal
        open={logoPreviewOpen}
        onClose={() => setLogoPreviewOpen(false)}
        title="Brand mark"
        size="lg"
      >
        <div className="flex flex-col items-center gap-4 py-4 sm:py-6">
          <BrandMark className="home-page__brand-mark h-[min(70vw,22rem)] w-[min(70vw,22rem)] text-ink" />
          <p className="max-w-sm text-center text-sm text-ink-muted">
            Enlarged for inspection. Close with the × button, Escape, or by clicking outside.
          </p>
        </div>
      </Modal>
      <HomeStyleChooserModal open={styleChooserOpen} onClose={() => setStyleChooserOpen(false)} />
      <TermsOfServiceModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </div>
  )
}
