import type { ReactNode } from 'react'
import { BrandMark } from '@/components/brand/BrandMark'
import { BRAND_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

type CreativeStudiosBrandProps = {
  className?: string
  markClassName?: string
  nameClassName?: string
  subtitleClassName?: string
  subtitle?: string
  /** Shown under the title below the `md` breakpoint (e.g. today’s date). */
  mobileSubtitle?: ReactNode
  mobileSubtitleClassName?: string
}

export function CreativeStudiosBrand({
  className,
  markClassName,
  nameClassName,
  subtitleClassName,
  subtitle = 'Landlord Portal',
  mobileSubtitle,
  mobileSubtitleClassName,
}: CreativeStudiosBrandProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5 sm:gap-3', className)}>
      <BrandMark
        className={cn(
          'h-9 w-9 shrink-0 text-nav-fg group-hover:opacity-90 sm:h-10 sm:w-10',
          markClassName
        )}
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
        {mobileSubtitle ? (
          <span
            className={cn(
              'mt-0.5 block truncate text-[10px] font-medium tracking-wide text-nav-fg-muted/85 md:hidden',
              mobileSubtitleClassName
            )}
          >
            {mobileSubtitle}
          </span>
        ) : null}
        <span
          className={cn(
            'mt-0.5 hidden whitespace-nowrap text-[10px] font-semibold tracking-wide text-nav-fg-muted md:mt-1 md:block',
            subtitleClassName
          )}
        >
          {subtitle}
        </span>
      </div>
    </div>
  )
}
