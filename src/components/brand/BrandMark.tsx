import { cn } from '@/lib/utils'

type BrandMarkProps = {
  className?: string
  /** Scales the inner LI glyph relative to the frame. */
  glyphClassName?: string
}

/**
 * Minimal LI mark: “L” and “I” as house walls, with a thin peaked roofline.
 */
export function BrandMark({ className, glyphClassName }: BrandMarkProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center border-[length:var(--border-width)] border-ink bg-transparent transition-colors',
        className
      )}
      aria-hidden
    >
      <span
        className={cn(
          'inline-flex flex-col items-stretch font-display font-bold leading-none tracking-tight',
          glyphClassName
        )}
      >
        <svg
          className="mb-[0.06em] h-[0.28em] w-full"
          viewBox="0 0 40 12"
          fill="none"
          aria-hidden
          preserveAspectRatio="none"
        >
          <path
            d="M1 11 L20 1.5 L39 11"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
        <span className="block leading-none">LI</span>
      </span>
    </div>
  )
}
