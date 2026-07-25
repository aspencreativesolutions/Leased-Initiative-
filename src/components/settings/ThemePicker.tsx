import { Palette } from 'lucide-react'
import { AppearanceToggle } from '@/components/settings/AppearanceToggle'
import { Card, CardHeader } from '@/components/ui/Card'
import { StylePickerGrid } from '@/components/settings/StylePickerGrid'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'

interface ThemePickerProps {
  /** Omit the outer card when rendered inside Settings detail panel. */
  embedded?: boolean
  className?: string
}

export function ThemePicker({ embedded = false, className }: ThemePickerProps) {
  const { themeId, themes, setTheme, appearance, setAppearance, supportsAppearance } =
    useTheme()

  const body = (
    <>
      {supportsAppearance && (
        <div className={cn('mb-4 flex items-center justify-between gap-3', embedded && 'mb-3')}>
          <p className="text-sm text-ink-muted">Light / dark for Graphite</p>
          <AppearanceToggle appearance={appearance} onChange={setAppearance} />
        </div>
      )}
      <StylePickerGrid
        themeId={themeId}
        themes={themes}
        appearance={appearance}
        onSelect={setTheme}
      />
      <p className="mt-3 text-xs text-ink-muted">
        Slate Bureau is the default style.
        {supportsAppearance
          ? ' Graphite includes a light/dark mode switch. Current stages stay bold; everything else uses thin 1px lines.'
          : null}
      </p>
    </>
  )

  if (embedded) {
    return <div className={className}>{body}</div>
  }

  return (
    <Card className={className}>
      <CardHeader
        title="App Style"
        subtitle="Four visual finishes — shared typography, tap to preview instantly"
        action={<Palette className="h-5 w-5 text-ink-faint" strokeWidth={1.75} />}
      />
      {body}
    </Card>
  )
}
