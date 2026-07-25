import { useState } from 'react'
import { ScrollText } from 'lucide-react'
import { TermsDownloadButton } from '@/components/legal/TermsDownloadButton'
import { TermsOfServiceModal } from '@/components/legal/TermsOfServiceModal'
import { Button } from '@/components/ui/Button'

interface TermsAcceptanceFieldProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
}

/**
 * Required Terms of Service acceptance for account creation —
 * view, download, then sign by checking the agreement box.
 */
export function TermsAcceptanceField({
  checked,
  onChange,
  disabled = false,
  id = 'accept-terms',
}: TermsAcceptanceFieldProps) {
  const [termsOpen, setTermsOpen] = useState(false)

  return (
    <>
      <div className="space-y-3 rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">Terms of Service</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => setTermsOpen(true)}
            >
              <ScrollText className="h-4 w-4" aria-hidden />
              View
            </Button>
            <TermsDownloadButton />
          </div>
        </div>

        <label htmlFor={id} className="flex items-start gap-3 text-sm text-ink-muted">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-1"
            required
            disabled={disabled}
          />
          <span>
            I have read and sign these Terms of Service. I agree to be bound by them before
            creating my account.
          </span>
        </label>
      </div>

      <TermsOfServiceModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </>
  )
}
