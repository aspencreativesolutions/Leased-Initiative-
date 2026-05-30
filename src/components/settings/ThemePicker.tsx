import { Check, Palette } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import type { ThemeId } from '@/themes/types'

export function ThemePicker() {
  const { themeId, themes, setTheme } = useTheme()

  return (
    <Card>
      <CardHeader
        title="App Style"
        subtitle={`${themes.length} visual themes — tap to preview instantly, saved on this device`}
        action={<Palette className="h-5 w-5 text-ink-faint" strokeWidth={1.75} />}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((option) => {
          const selected = themeId === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              className={cn(
                'group relative flex flex-col rounded-[var(--radius-lg)] border-[length:var(--border-width)] p-4 text-left transition-all',
                selected
                  ? 'border-accent bg-accent-light shadow-lift'
                  : 'border-line bg-surface-paper hover:border-ink-muted hover:shadow-lift'
              )}
            >
              {selected && (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              )}

              <div className="mb-3 flex h-14 overflow-hidden rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line">
                <ThemePreviewStrip themeId={option.id} swatches={option.swatches} />
              </div>

              <p className="font-display text-lg font-semibold text-ink leading-tight pr-8">
                {option.name}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-accent label-caps">
                {option.tagline}
              </p>
              <p className="mt-2 text-xs text-ink-muted leading-relaxed line-clamp-2">
                {option.description}
              </p>

              <div className="mt-3 flex gap-1.5">
                {option.swatches.map((color) => (
                  <span
                    key={color}
                    className="h-4 w-4 rounded-[var(--radius-sm)] border border-line"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </Card>
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

  const layouts: Partial<Record<ThemeId, ReactNode>> = {
    editorial: (
      <>
        <div className="w-[28%] shrink-0" style={{ background: a }} />
        <div className="flex flex-1 flex-col gap-1 p-2" style={{ background: c }}>
          <div className="h-2 w-3/4 rounded-sm" style={{ background: a }} />
          <div className="h-6 flex-1 border-2 rounded-sm" style={{ borderColor: a }} />
          <div className="h-1.5 w-1/2 rounded-sm" style={{ background: b }} />
        </div>
      </>
    ),
    soft: (
      <div className="flex flex-1 flex-col gap-1.5 p-2.5" style={{ background: c }}>
        <div className="h-2.5 w-full rounded-lg bg-white shadow-sm" />
        <div className="h-2 w-2/3 rounded-md opacity-25" style={{ background: a }} />
        <div className="h-5 rounded-lg opacity-30" style={{ background: b }} />
      </div>
    ),
    mono: (
      <div className="flex w-full">
        <div className="flex-1" style={{ background: a }} />
        <div className="flex flex-1 flex-col border-l-2 border-black">
          <div className="h-3 border-b-2 border-black" style={{ background: b }} />
          <div className="flex-1" style={{ background: c }} />
          <div className="h-4 border-t-2 border-black" style={{ background: a }} />
        </div>
      </div>
    ),
    golden: (
      <>
        <div className="w-[22%]" style={{ background: a }} />
        <div className="flex flex-1 flex-col justify-center gap-1.5 p-2" style={{ background: c }}>
          <div className="h-1.5 w-4/5 rounded-sm" style={{ background: b }} />
          <div className="h-7 rounded-sm border" style={{ borderColor: b, background: c }} />
        </div>
      </>
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
    rose: (
      <div className="flex flex-1 flex-col gap-1 p-2.5" style={{ background: c }}>
        <div className="h-2 w-1/2 rounded-full opacity-40" style={{ background: b }} />
        <div className="h-7 flex-1 rounded-xl border" style={{ borderColor: b, background: '#fff' }} />
      </div>
    ),
    forest: (
      <>
        <div className="w-[32%]" style={{ background: a }} />
        <div className="flex flex-1 flex-col gap-1 p-2" style={{ background: c }}>
          <div className="h-2 rounded-sm opacity-50" style={{ background: b }} />
          <div className="h-6 flex-1 rounded-sm border" style={{ borderColor: b }} />
        </div>
      </>
    ),
    midnight: (
      <div className="flex flex-1 flex-col gap-1 p-2" style={{ background: c }}>
        <div className="h-2 w-full rounded-md" style={{ background: b, opacity: 0.6 }} />
        <div className="h-7 flex-1 rounded-lg border" style={{ borderColor: b, background: a }} />
      </div>
    ),
    citrus: (
      <>
        <div className="w-full h-3" style={{ background: b }} />
        <div className="flex flex-1 gap-1 p-2" style={{ background: c }}>
          <div className="h-full flex-1 rounded-xl border-2 border-black" />
          <div className="w-1/3 rounded-xl" style={{ background: b, opacity: 0.3 }} />
        </div>
      </>
    ),
    vintage: (
      <>
        <div className="w-[25%]" style={{ background: a }} />
        <div className="flex flex-1 flex-col justify-end gap-1 p-2" style={{ background: c }}>
          <div className="h-1 w-full opacity-60" style={{ background: b }} />
          <div className="h-5 border-b-2" style={{ borderColor: a }} />
        </div>
      </>
    ),
    neon: (
      <div className="flex flex-1 flex-col gap-0.5 p-2" style={{ background: a }}>
        <div className="h-1 w-2/3 rounded-sm" style={{ background: b, boxShadow: `0 0 6px ${b}` }} />
        <div className="h-6 flex-1 rounded-sm border-2" style={{ borderColor: b, boxShadow: `0 0 8px ${b}44` }} />
        <div className="h-1 w-1/2" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
      </div>
    ),
    slate: (
      <div className="flex flex-1 flex-col" style={{ background: c }}>
        <div className="h-2 border-b" style={{ borderColor: a, background: '#fff' }} />
        <div className="flex flex-1 gap-px p-2">
          <div className="flex-1 bg-white border border-slate-300" />
          <div className="w-1/3" style={{ background: a, opacity: 0.15 }} />
        </div>
      </div>
    ),
    terracotta: (
      <>
        <div className="w-[35%]" style={{ background: b }} />
        <div className="flex flex-1 flex-col gap-1 p-2" style={{ background: c }}>
          <div className="h-1.5 w-3/4 rounded-sm" style={{ background: a, opacity: 0.3 }} />
          <div className="h-6 flex-1 rounded-md border" style={{ borderColor: a, opacity: 0.25 }} />
        </div>
      </>
    ),
  }

  const fallback = (
    <>
      <div className="w-[30%]" style={{ background: a }} />
      <div className="flex flex-1 p-2" style={{ background: c }}>
        <div className="h-full w-full rounded-sm border-2" style={{ borderColor: b }} />
      </div>
    </>
  )

  return <div className="flex h-full w-full">{layouts[themeId] ?? fallback}</div>
}
