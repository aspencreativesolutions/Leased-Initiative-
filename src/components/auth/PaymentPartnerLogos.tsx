import { Link, useLocation } from 'react-router-dom'
import { BRAND_NAME } from '@/lib/brand'
import { paymentPartnerLogos } from '@/lib/paymentPartnerLogos'
import { cn } from '@/lib/utils'

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
 * In-flow site footer on intro / auth / public screens (scroll to see it).
 * On the homepage it also carries brand + legal / tour links in one row.
 * Hidden on tenant (`/portal/*`) and landlord (`/studio/*`) dashboards.
 */
export function PaymentPartnerLogos() {
  const { pathname } = useLocation()
  const visible = !isUserDashboardPath(pathname) && paymentPartnerLogos.length > 0
  const isHome = isHomePath(pathname)

  if (!visible) return null

  return (
    <>
      {/* Keeps the footer below the fold with a little extra scroll room. */}
      <div className="secure-payments-footer-spacer h-24 shrink-0 sm:h-28" aria-hidden />
      <footer
        className={cn(
          'secure-payments-footer border-t border-ink/10 bg-surface/95 px-3 py-3 sm:px-4 sm:py-3.5',
          isHome && 'secure-payments-footer--home'
        )}
        role="contentinfo"
        aria-label={isHome ? 'Site footer' : 'Payment security'}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs leading-none text-ink-muted sm:gap-x-4 sm:text-[13px]">
          {isHome ? (
            <>
              <span className="font-semibold tracking-tight text-ink">{BRAND_NAME}</span>
              <span className="text-ink-faint" aria-hidden>
                ·
              </span>
              <span className="text-ink-faint">Landlord &amp; tenant management</span>
              <span className="text-ink-faint" aria-hidden>
                ·
              </span>
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
                onClick={() => {
                  window.dispatchEvent(new Event(OPEN_DEMO_CODE_EVENT))
                }}
                className="font-semibold underline-offset-2 transition-colors hover:text-ink hover:underline"
              >
                Guided product tour
              </button>
              <span className="text-ink-faint" aria-hidden>
                ·
              </span>
            </>
          ) : null}

          <span className="font-semibold tracking-wide">Secure payments powered by</span>
          <ul className="flex items-center gap-4 sm:gap-5">
            {paymentPartnerLogos.map((logo) => (
              <li key={logo.src} className="flex items-center">
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
    </>
  )
}
