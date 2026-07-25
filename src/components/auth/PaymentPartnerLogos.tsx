import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BRAND_NAME } from '@/lib/brand'
import { paymentPartnerLogos } from '@/lib/paymentPartnerLogos'
import { cn } from '@/lib/utils'

const BODY_PAD_CLASS = 'has-secure-payments-footer'
const HOME_FOOTER_CLASS = 'has-home-site-footer'

/** Dispatched from the home footer “Guided product tour” control. */
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
 * Fixed site footer on intro / auth / public screens.
 * On the homepage it also carries brand + legal / tour links.
 * Hidden on tenant (`/portal/*`) and landlord (`/studio/*`) dashboards.
 */
export function PaymentPartnerLogos() {
  const { pathname } = useLocation()
  const visible = !isUserDashboardPath(pathname) && paymentPartnerLogos.length > 0
  const isHome = isHomePath(pathname)

  useEffect(() => {
    if (!visible) {
      document.body.classList.remove(BODY_PAD_CLASS, HOME_FOOTER_CLASS)
      return
    }
    document.body.classList.add(BODY_PAD_CLASS)
    if (isHome) document.body.classList.add(HOME_FOOTER_CLASS)
    else document.body.classList.remove(HOME_FOOTER_CLASS)
    return () => {
      document.body.classList.remove(BODY_PAD_CLASS, HOME_FOOTER_CLASS)
    }
  }, [visible, isHome])

  if (!visible) return null

  return (
    <footer
      className={cn(
        'secure-payments-footer fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-surface/95 px-4 py-3 backdrop-blur-sm sm:py-3.5',
        isHome && 'secure-payments-footer--home'
      )}
      role="contentinfo"
      aria-label={isHome ? 'Site footer' : 'Payment security'}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        {isHome ? (
          <div className="mb-3 flex w-full flex-col items-center gap-1.5 border-b border-line/70 pb-3 sm:mb-3.5 sm:pb-3.5">
            <p className="text-sm font-semibold tracking-tight text-ink">{BRAND_NAME}</p>
            <p className="text-xs text-ink-faint">Landlord &amp; tenant management</p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs">
              <Link
                to="/terms"
                className="font-semibold text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                Terms of Service
              </Link>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new Event(OPEN_DEMO_CODE_EVENT))
                }}
                className="font-semibold text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                Guided product tour
              </button>
            </div>
          </div>
        ) : null}

        <p className="text-center text-[11px] font-semibold tracking-wide text-ink-muted sm:text-xs">
          Secure payments powered by Stripe, PayPal, and Square
        </p>
        <ul className="mt-2 flex flex-wrap items-center justify-center gap-6 sm:mt-2.5 sm:gap-8">
          {paymentPartnerLogos.map((logo) => (
            <li key={logo.src}>
              <img
                src={logo.src}
                alt={logo.alt}
                className={`bg-transparent object-contain ${logo.className ?? 'h-8 w-auto'}`}
                loading="lazy"
              />
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
