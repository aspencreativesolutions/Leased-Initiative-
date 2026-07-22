import { cn } from '@/lib/utils'

type CreativeStudiosBrandProps = {
  className?: string
  markClassName?: string
  nameClassName?: string
  subtitleClassName?: string
}

export function CreativeStudiosBrand({
  className,
  markClassName,
  nameClassName,
  subtitleClassName,
}: CreativeStudiosBrandProps) {
  return (
    <div className={cn('flex items-center gap-2.5 sm:gap-3', className)}>
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center border-[length:var(--border-width)] border-nav-fg/80 bg-transparent font-display text-base font-bold tracking-tight transition-colors group-hover:border-nav-active group-hover:text-nav-active sm:h-10 sm:w-10 sm:text-lg',
          markClassName
        )}
        aria-hidden
      >
        L
      </div>
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            'whitespace-nowrap font-display text-lg font-semibold tracking-tight sm:text-xl',
            nameClassName
          )}
        >
          Leased
        </span>
        <span
          className={cn(
            'mt-0.5 hidden whitespace-nowrap text-[10px] font-semibold tracking-wide text-nav-fg-muted sm:mt-1 sm:block',
            subtitleClassName
          )}
        >
          Landlord Portal
        </span>
      </div>
    </div>
  )
}
