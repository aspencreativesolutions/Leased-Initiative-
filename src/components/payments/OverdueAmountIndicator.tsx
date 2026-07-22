import { cn } from '@/lib/utils'

interface OverdueAmountIndicatorProps {
  amount: number | null
  overdueCount: number
  className?: string
}

/** Glowing red pulse next to an overdue dollar amount; shows count when > 1. */
export function OverdueAmountIndicator({
  amount,
  overdueCount,
  className,
}: OverdueAmountIndicatorProps) {
  const count = Math.max(1, overdueCount)
  const amountLabel =
    amount != null ? `$${amount.toLocaleString()}` : 'Past due'

  return (
    <span
      className={cn('inline-flex items-center gap-2', className)}
      title={
        count > 1
          ? `${count} overdue payments · ${amountLabel}`
          : `Overdue · ${amountLabel}`
      }
    >
      <span className="relative inline-flex h-3 w-3 shrink-0 items-center justify-center">
        <span
          className="overdue-pulse-ring absolute inset-0 rounded-full bg-red-500/70"
          aria-hidden
        />
        <span
          className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.85)]"
          aria-hidden
        />
        {count > 1 && (
          <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-0.5 text-[9px] font-bold leading-none text-white shadow-[0_0_8px_rgba(220,38,38,0.7)]">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </span>
      <span className="text-sm font-semibold tabular-nums text-red-600">{amountLabel}</span>
      <span className="sr-only">
        {count > 1
          ? `${count} overdue payments totaling ${amountLabel}`
          : `Overdue amount ${amountLabel}`}
      </span>
    </span>
  )
}
