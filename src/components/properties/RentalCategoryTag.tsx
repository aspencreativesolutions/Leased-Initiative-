import { cn } from '@/lib/utils'
import {
  rentalCategoryLabel,
  resolveRentalCategory,
  type RentalCategory,
} from '@/lib/rentalCategory'

type RentalCategoryTagProps = {
  category?: RentalCategory | string | null
  /** When true, missing values resolve to Standard Rental. */
  resolveMissing?: boolean
  className?: string
}

/**
 * Compact Student Housing / Standard Rental tag for rental tiles and tables.
 */
export function RentalCategoryTag({
  category,
  resolveMissing = false,
  className,
}: RentalCategoryTagProps) {
  const canonical = resolveMissing
    ? resolveRentalCategory(category)
    : (category != null && String(category).trim()
        ? resolveRentalCategory(category)
        : null)
  const label = canonical ? rentalCategoryLabel(canonical) : null
  if (!label || !canonical) return null

  const isStudent = canonical === 'student_housing'

  return (
    <span
      className={cn(
        'inline-flex max-w-full truncate rounded-[var(--radius-sm)] border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-caps',
        isStudent
          ? 'border-brand/30 bg-brand/10 text-brand'
          : 'border-line bg-surface-paper text-ink-muted',
        className
      )}
      title={label}
    >
      {label}
    </span>
  )
}
