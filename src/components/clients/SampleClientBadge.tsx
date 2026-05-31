import { cn } from '@/lib/utils'

export function SampleClientBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-red-500', className)}
      title="Sample demo client — safe to edit or remove"
      aria-label="Sample client"
    />
  )
}
