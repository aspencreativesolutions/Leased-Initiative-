import { cn } from '@/lib/utils'
import { applicantPartyLabel } from '@/lib/applicantParty'
import type { ApplicantPartyType } from '@/types'

type ApplicantPartyTagProps = {
  partyType?: ApplicantPartyType | string | null
  className?: string
}

/**
 * Compact Solo / Couple tag for applicants and tenants.
 */
export function ApplicantPartyTag({ partyType, className }: ApplicantPartyTagProps) {
  const label = applicantPartyLabel(partyType)
  if (!label) return null

  return (
    <span
      className={cn(
        'inline-flex max-w-full truncate rounded-[var(--radius-sm)] border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-caps',
        label === 'Couple'
          ? 'border-brand/30 bg-brand/10 text-brand'
          : 'border-line bg-surface-paper text-ink-muted',
        className
      )}
      title={label === 'Couple' ? 'Couple registration — one official tenant' : 'Solo registration'}
    >
      {label}
    </span>
  )
}
