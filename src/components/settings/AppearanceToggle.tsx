import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeAppearance } from '@/themes/types'

interface AppearanceToggleProps {
  appearance: ThemeAppearance
  onChange: (appearance: ThemeAppearance) => void
  /** Match dark nav chrome (dashboard / portal header) */
  variant?: 'nav' | 'surface'
  className?: string
}

export function AppearanceToggle({
  appearance,
  onChange,
  variant = 'surface',
  className,
}: AppearanceToggleProps) {
  const isDark = appearance === 'dark'
  const nav = variant === 'nav'

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-[var(--radius-sm)] border-[length:var(--border-width)] p-0.5',
        nav ? 'border-nav-fg/30' : 'border-line bg-surface',
        className
      )}
      role="group"
      aria-label="Color mode"
    >
      <button
        type="button"
        onClick={() => onChange('light')}
        className={cn(
          'inline-flex items-center gap-1 rounded-[calc(var(--radius-sm)-1px)] px-2 py-1 text-[10px] font-semibold transition-colors',
          !isDark
            ? nav
              ? 'bg-nav-fg/15 text-nav-fg'
              : 'bg-surface-paper text-ink shadow-sm'
            : nav
              ? 'text-nav-fg-muted hover:text-nav-fg'
              : 'text-ink-faint hover:text-ink'
        )}
        aria-pressed={!isDark}
        title="Light mode"
      >
        <Sun className="h-3 w-3" strokeWidth={2.25} />
        <span className="hidden sm:inline">Light</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('dark')}
        className={cn(
          'inline-flex items-center gap-1 rounded-[calc(var(--radius-sm)-1px)] px-2 py-1 text-[10px] font-semibold transition-colors',
          isDark
            ? nav
              ? 'bg-nav-fg/15 text-nav-fg'
              : 'bg-surface-paper text-ink shadow-sm'
            : nav
              ? 'text-nav-fg-muted hover:text-nav-fg'
              : 'text-ink-faint hover:text-ink'
        )}
        aria-pressed={isDark}
        title="Dark mode"
      >
        <Moon className="h-3 w-3" strokeWidth={2.25} />
        <span className="hidden sm:inline">Dark</span>
      </button>
    </div>
  )
}
