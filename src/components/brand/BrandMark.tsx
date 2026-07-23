import { cn } from '@/lib/utils'

type BrandMarkProps = {
  className?: string
}

/** Stroke weight matched to the official LI house mark. */
const STROKE = 2.43

/**
 * Official LI brand mark — strokes follow `currentColor`
 * so the mark stays crisp on light or dark banner backgrounds.
 */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      width={32}
      height={32}
      aria-hidden
      className={cn('aspect-square shrink-0', className)}
    >
      {/* Open house: floor → left wall → roof → right wall (gap at bottom-right) */}
      <path
        d="M19.29 29.78 H7.5 V8.66 L16.02 2.5 L24.5 8.66 V29.78"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
    </svg>
  )
}
