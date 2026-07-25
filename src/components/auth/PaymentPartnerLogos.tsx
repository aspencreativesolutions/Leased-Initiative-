import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** Dispatched from the home footer “Guided Product Tour” control. */
export const OPEN_DEMO_CODE_EVENT = 'leased-open-demo-code'

/** Auth/login/register aliases that sit outside the dashboard shells */
const AUTH_PATHS = new Set([
  '/studio/login',
  '/studio/register',
  '/portal/login',
  '/portal/register',
])

const PAYMENT_PROVIDERS = ['Stripe', 'PayPal', 'Square'] as const

function isUserDashboardPath(pathname: string): boolean {
  if (AUTH_PATHS.has(pathname)) return false
  return (
    pathname === '/portal' ||
    pathname.startsWith('/portal/') ||
    pathname === '/studio' ||
    pathname.startsWith('/studio/')
  )
}

function isHomePath(pathname: string): boolean {
  return pathname === '/' || pathname === ''
}

/**
 * In-flow site footer on intro / auth / public screens (scroll to see it).
 * Shows Terms, Guided Product Tour, and evenly spaced payment provider names.
 * Hidden on tenant (`/portal/*`) and landlord (`/studio/*`) dashboards.
 */
export function PaymentPartnerLogos() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const visible = !isUserDashboardPath(pathname)

  if (!visible) return null

  const openGuidedTour = () => {
    if (isHomePath(pathname)) {
      window.dispatchEvent(new Event(OPEN_DEMO_CODE_EVENT))
      return
    }
    navigate('/', { state: { openDemoCode: true } })
  }

  return (
    <>
      {/* Keeps the footer below the fold with a little extra scroll room. */}
      <div className="secure-payments-footer-spacer h-24 shrink-0 sm:h-28" aria-hidden />
      <footer
        className="secure-payments-footer border-t border-ink/10 bg-surface/95 px-3 py-3 sm:px-4 sm:py-3.5"
        role="contentinfo"
        aria-label="Site footer"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col items-stretch gap-3 text-xs leading-none text-ink-muted sm:gap-3.5 sm:text-[13px]">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-4">
            <Link
              to="/terms"
              className="font-semibold underline-offset-2 transition-colors hover:text-ink hover:underline"
            >
              Terms of Service
            </Link>
            <span className="text-ink-faint" aria-hidden>
              ·
            </span>
            <button
              type="button"
              onClick={openGuidedTour}
              className="font-semibold underline-offset-2 transition-colors hover:text-ink hover:underline"
            >
              Guided Product Tour
            </button>
          </div>

          <div className="flex w-full flex-col items-center gap-2 sm:gap-2.5">
            <p className="text-center font-semibold tracking-wide text-ink-muted">
              Secure Payments powered by
            </p>
            <ul
              className={cn(
                'grid w-full max-w-lg grid-cols-3 items-center justify-items-center',
                'text-sm font-semibold tracking-tight text-ink'
              )}
              aria-label="Stripe, PayPal, or Square"
            >
              {PAYMENT_PROVIDERS.map((name) => (
                <li key={name} className="w-full text-center">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </>
  )
}
