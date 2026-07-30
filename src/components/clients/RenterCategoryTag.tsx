import { cn } from '@/lib/utils'
import { renterCategoryLabel, type RenterCategory } from '@/lib/rentalCategory'

type RenterCategoryTagProps = {
  category?: RenterCategory | string | null
  className?: string
}

/**
 * Compact Student / Standard renter tag for applicants and tenants.
 */
export function RenterCategoryTag({ category, className }: RenterCategoryTagProps) {
  const label = renterCategoryLabel(category)
  if (!label) return null

  const isStudent = label === 'Student'

  return (
    <span
      className={cn(
        'inline-flex max-w-full truncate rounded-[var(--radius-sm)] border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-caps',
        isStudent
          ? 'border-brand/30 bg-brand/10 text-brand'
          : 'border-line bg-surface-paper text-ink-muted',
        className
      )}
      title={isStudent ? 'Student renter' : 'Standard renter'}
    >
      {label}
    </span>
  )
}
