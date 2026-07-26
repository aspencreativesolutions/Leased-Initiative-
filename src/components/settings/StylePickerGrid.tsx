import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { ThemeId, ThemeOption } from '@/themes/types'

interface StylePickerGridProps {
  themeId: ThemeId
  themes: ThemeOption[]
  onSelect: (id: ThemeId) => void
}

export function StylePickerGrid({ themeId, themes, onSelect }: StylePickerGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {themes.map((option) => {
        const selected = themeId === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={cn(
              'group relative flex flex-col rounded-[var(--radius-lg)] border-[length:var(--border-width)] p-3 text-left transition-all',
              selected
                ? 'border-accent bg-accent-light shadow-lift'
                : 'border-line bg-surface-paper hover:border-ink-muted hover:shadow-lift'
            )}
          >
            {selected && (
              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-white">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}

            <div className="mb-2 flex h-10 overflow-hidden rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line">
              <ThemePreviewStrip themeId={option.id} swatches={option.swatches} />
            </div>

            <p className="font-display text-sm font-semibold text-ink leading-tight pr-6">
              {option.name}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold text-accent label-caps">
              {option.tagline}
            </p>

            <div className="mt-2 flex gap-1">
              {option.swatches.map((color) => (
                <span
                  key={color}
                  className="h-3 w-3 rounded-[var(--radius-sm)] border border-line"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ThemePreviewStrip({
  themeId,
  swatches,
}: {
  themeId: ThemeId
  swatches: [string, string, string]
}) {
  const [a, b, c] = swatches

  const layouts: Record<ThemeId, ReactNode> = {
    ink: (
      <div className="flex flex-1 flex-col gap-1.5 p-2" style={{ background: c }}>
        <div className="h-2.5 w-full border-2 bg-white" style={{ borderColor: a }} />
        <div className="flex flex-1 gap-1.5">
          <div className="h-full flex-1 border-2 bg-white" style={{ borderColor: a }} />
          <div className="h-full w-1/3 border-2" style={{ borderColor: b, background: b, opacity: 0.12 }} />
        </div>
      </div>
    ),
    ocean: (
      <>
        <div className="w-[30%]" style={{ background: a }} />
        <div className="flex flex-1 flex-col gap-1 p-2" style={{ background: c }}>
          <div className="h-2 w-full rounded-md opacity-35" style={{ background: b }} />
          <div className="h-6 flex-1 rounded-md bg-white shadow-sm" />
        </div>
      </>
    ),
    graphite: (
      <div className="flex flex-1 flex-col gap-1 p-2" style={{ background: c }}>
        <div className="h-2 w-full rounded-md" style={{ background: b, opacity: 0.45 }} />
        <div
          className="h-7 flex-1 rounded-lg border bg-white"
          style={{ borderColor: '#d4d4d8', boxShadow: 'none' }}
        >
          <div
            className="ml-1.5 mt-1.5 h-3.5 w-1/3 rounded-md border-2"
            style={{ borderColor: a, background: 'transparent' }}
          />
        </div>
      </div>
    ),
    slate: (
      <div className="flex flex-1 flex-col" style={{ background: c }}>
        <div className="h-2 border-b" style={{ borderColor: a, background: '#fff' }} />
        <div className="flex flex-1 gap-px p-2">
          <div className="h-full flex-1 border border-slate-300 bg-white" />
          <div className="w-1/3" style={{ background: a, opacity: 0.15 }} />
        </div>
      </div>
    ),
  }

  return <div className="flex h-full w-full">{layouts[themeId]}</div>
}
