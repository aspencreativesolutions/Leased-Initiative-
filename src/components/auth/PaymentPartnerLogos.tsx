import { Link, useLocation, useNavigate } from 'react-router-dom'
import { paymentPartnerLogos } from '@/lib/paymentPartnerLogos'
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
 * Shows Terms, Guided Product Tour, and payment partner logos.
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
                'grid w-full max-w-xl grid-cols-4 items-center justify-items-center gap-x-2 gap-y-2',
                'sm:gap-x-4'
              )}
              aria-label="Stripe, PayPal, Square, and Zelle"
            >
              {paymentPartnerLogos.map((logo) => (
                <li key={logo.alt} className="flex w-full items-center justify-center">
                  <a
                    href={logo.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Visit ${logo.alt}`}
                    aria-label={`Visit ${logo.alt} (opens in a new tab)`}
                    className="inline-flex items-center justify-center rounded-sm p-1 transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    <img
                      src={logo.src}
                      alt={logo.alt}
                      loading="lazy"
                      decoding="async"
                      className={cn('w-auto object-contain object-center', logo.className)}
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </>
  )
}
