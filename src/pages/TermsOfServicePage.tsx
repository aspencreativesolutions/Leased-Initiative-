import { Link } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { TermsDownloadButton } from '@/components/legal/TermsDownloadButton'
import { TermsOfServiceContent } from '@/components/legal/TermsOfServiceContent'
import { BRAND_NAME } from '@/lib/brand'

/** Standalone Terms of Service page for deep links and long-term reference. */
export function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8 flex flex-col items-start gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-3 transition-colors hover:text-brand"
            aria-label={`Back to ${BRAND_NAME} home`}
          >
            <BrandMark className="h-10 w-10" />
            <span className="heading-display text-xl tracking-tight">{BRAND_NAME}</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted">
              <ScrollText className="h-4 w-4 text-brand" aria-hidden />
              Terms of Service
            </p>
            <TermsDownloadButton />
          </div>
        </header>

        <TermsOfServiceContent />

        <footer className="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/"
            className="font-semibold text-ink underline-offset-4 transition-colors hover:text-brand hover:underline"
          >
            Back to home
          </Link>
        </footer>
      </div>
    </div>
  )
}
