import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import { TermsDownloadButton } from '@/components/legal/TermsDownloadButton'
import { TermsOfServiceModal } from '@/components/legal/TermsOfServiceModal'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'

/**
 * Profile Legal card — opens the same Terms modal used on the introduction page,
 * with a full-page link for long-term reference.
 */
export function ProfileLegalSection() {
  const [termsOpen, setTermsOpen] = useState(false)

  return (
    <>
      <Card>
        <CardHeader
          title="Legal"
          subtitle="Review the product agreement anytime — same Terms shown before you signed up"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm text-ink-muted">
            Usage rules, responsibilities, privacy practices, and termination conditions for
            landlords and tenants.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setTermsOpen(true)}>
              <ScrollText className="h-4 w-4" aria-hidden />
              Terms of Service
            </Button>
            <TermsDownloadButton />
            <Link
              to="/terms"
              className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
            >
              Open full page
            </Link>
          </div>
        </div>
      </Card>
      <TermsOfServiceModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </>
  )
}
