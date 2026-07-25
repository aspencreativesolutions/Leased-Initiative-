import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { paymentPartnerLogos } from '@/lib/paymentPartnerLogos'

const BODY_PAD_CLASS = 'has-secure-payments-footer'

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

/**
 * Fixed trust footer on intro / auth / public screens.
 * Hidden on tenant (`/portal/*`) and landlord (`/studio/*`) dashboards.
 */
export function PaymentPartnerLogos() {
  const { pathname } = useLocation()
  const visible = !isUserDashboardPath(pathname) && paymentPartnerLogos.length > 0

  useEffect(() => {
    if (!visible) {
      document.body.classList.remove(BODY_PAD_CLASS)
      return
    }
    document.body.classList.add(BODY_PAD_CLASS)
    return () => document.body.classList.remove(BODY_PAD_CLASS)
  }, [visible])

  if (!visible) return null

  return (
    <footer
      className="secure-payments-footer fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-surface/95 px-4 py-3 backdrop-blur-sm"
      role="contentinfo"
      aria-label="Payment security"
    >
      <p className="text-center text-[11px] font-semibold tracking-wide text-ink-muted sm:text-xs">
        Secure payments powered by Stripe, PayPal, and Square
      </p>
      <ul className="mt-2.5 flex flex-wrap items-center justify-center gap-6 sm:gap-8">
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
    </footer>
  )
}
