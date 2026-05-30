import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-surface-paper border-[length:var(--border-width)] border-brand hover:bg-brand-light hover:border-brand-light',
  secondary:
    'bg-accent text-white border-[length:var(--border-width)] border-accent hover:opacity-90',
  ghost:
    'bg-transparent text-ink-muted border-[length:var(--border-width)] border-transparent hover:border-line hover:text-ink',
  outline:
    'border-[length:var(--border-width)] border-ink bg-transparent text-ink hover:bg-ink hover:text-surface-paper',
  danger:
    'border-[length:var(--border-width)] border-accent bg-accent-light text-accent hover:bg-accent hover:text-white',
}

const sizes: Record<Size, string> = {
  sm: 'btn-ui px-3 py-1.5 text-[11px] font-semibold',
  md: 'btn-ui px-4 py-2 text-xs font-semibold',
  lg: 'btn-ui px-5 py-2.5 text-sm font-semibold',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'btn-ui inline-flex items-center justify-center gap-2 rounded-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
