import { BrandMark } from '@/components/brand/BrandMark'
import { BRAND_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

type CreativeStudiosBrandProps = {
  className?: string
  markClassName?: string
  nameClassName?: string
  subtitleClassName?: string
  subtitle?: string
}

export function CreativeStudiosBrand({
  className,
  markClassName,
  nameClassName,
  subtitleClassName,
  subtitle = 'Landlord Portal',
}: CreativeStudiosBrandProps) {
  return (
    <div className={cn('flex items-center gap-2.5 sm:gap-3', className)}>
      <BrandMark
        className={cn(
          'h-9 w-10 border-nav-fg/80 group-hover:border-nav-active group-hover:text-nav-active sm:h-10 sm:w-11',
          markClassName
        )}
        glyphClassName="text-base sm:text-lg"
      />
      <div className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            'truncate font-display text-base font-semibold tracking-tight sm:text-lg',
            nameClassName
          )}
        >
          {BRAND_NAME}
        </span>
        <span
          className={cn(
            'mt-0.5 hidden whitespace-nowrap text-[10px] font-semibold tracking-wide text-nav-fg-muted sm:mt-1 sm:block',
            subtitleClassName
          )}
        >
          {subtitle}
        </span>
      </div>
    </div>
  )
}
