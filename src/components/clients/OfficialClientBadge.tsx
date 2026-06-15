import { BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  clientBadgeLabeledClass,
  clientStatusIconClass,
  clientStatusIconWrapperClass,
} from './clientBadgeStyles'

export function OfficialClientBadge({
  className,
  label,
}: {
  className?: string
  /** When set, shows a text badge (e.g. profile header) instead of icon-only */
  label?: string
}) {
  if (label) {
    return (
      <span
        className={cn(
          clientBadgeLabeledClass,
          'border-ink bg-surface text-ink',
          className
        )}
        title="Signed contract — official client"
      >
        <BadgeCheck className={clientStatusIconClass} strokeWidth={2.5} aria-hidden />
        {label}
      </span>
    )
  }

  return (
    <span
      className={cn(clientStatusIconWrapperClass, 'text-accent', className)}
      title="Signed contract — official client"
    >
      <BadgeCheck className={clientStatusIconClass} strokeWidth={2.5} aria-hidden />
      <span className="sr-only">Official client</span>
    </span>
  )
}
