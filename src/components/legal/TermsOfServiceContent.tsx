import { BRAND_NAME } from '@/lib/brand'
import {
  TERMS_EFFECTIVE_DATE,
  TERMS_OF_SERVICE_SECTIONS,
} from '@/lib/termsOfService'

/** Shared body copy for the Terms modal and dedicated `/terms` page. */
export function TermsOfServiceContent() {
  return (
    <div className="space-y-6 text-left text-sm leading-relaxed text-ink">
      <div className="space-y-2 border-b border-line pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {BRAND_NAME}
        </p>
        <p className="text-ink-muted">
          Effective date: <span className="font-medium text-ink">{TERMS_EFFECTIVE_DATE}</span>
        </p>
        <p className="text-ink-muted">
          Please read these Terms of Service carefully before creating an account or using the
          platform. They outline how you may use {BRAND_NAME}, your responsibilities, how we handle
          privacy-related information, and when access may end.
        </p>
      </div>

      {TERMS_OF_SERVICE_SECTIONS.map((section) => (
        <section key={section.id} aria-labelledby={`tos-${section.id}`}>
          <h3 id={`tos-${section.id}`} className="mb-2 text-base font-semibold text-ink">
            {section.title}
          </h3>
          <div className="space-y-2 text-ink-muted">
            {section.paragraphs.map((paragraph, index) => (
              <p key={`${section.id}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
