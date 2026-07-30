import { Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { Card } from '@/components/ui/Card'
import { BRAND_NAME } from '@/lib/brand'

/**
 * Destination for tenant account-setup links while public registration is off.
 * Linked from Generate Agreement & Notify emails / SMS.
 */
export function AccountSetupUnavailablePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="mx-auto mb-4 inline-flex items-center justify-center transition-colors hover:text-brand"
            aria-label={`Back to ${BRAND_NAME} home`}
          >
            <BrandMark className="h-14 w-14" />
          </Link>
          <h1 className="heading-display text-2xl">Account setup</h1>
        </div>

        <Card padding="lg" className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <KeyRound className="h-6 w-6" strokeWidth={2.25} aria-hidden />
          </div>
          <p className="text-sm leading-relaxed text-ink">
            Account creation will be available once the site is official.
          </p>
          <p className="mt-3 text-xs leading-snug text-ink-muted">
            Your landlord has already prepared a lease agreement. When accounts open, you will use
            a link like this to finish setup and sign in to your tenant portal.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="btn-ui inline-flex w-full items-center justify-center border-[length:var(--border-width)] border-ink/40 bg-transparent px-4 py-2 text-xs font-semibold text-ink hover:border-ink"
            >
              Back to home
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
