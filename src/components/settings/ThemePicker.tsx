import { Palette } from 'lucide-react'
import { AppearanceToggle } from '@/components/settings/AppearanceToggle'
import { Card, CardHeader } from '@/components/ui/Card'
import { StylePickerGrid } from '@/components/settings/StylePickerGrid'
import { useTheme } from '@/context/ThemeContext'

export function ThemePicker() {
  const { themeId, themes, setTheme, appearance, setAppearance, supportsAppearance } =
    useTheme()

  return (
    <Card>
      <CardHeader
        title="App Style"
        subtitle={`${themes.length} visual themes — tap to preview instantly, saved on this device`}
        action={
          <div className="flex items-center gap-2">
            {supportsAppearance && (
              <AppearanceToggle appearance={appearance} onChange={setAppearance} />
            )}
            <Palette className="h-5 w-5 text-ink-faint" strokeWidth={1.75} />
          </div>
        }
      />
      <StylePickerGrid themeId={themeId} themes={themes} onSelect={setTheme} />
      {supportsAppearance && (
        <p className="mt-3 text-xs text-ink-muted">
          Graphite Lab includes a light/dark mode switch. Current stages stay bold; everything else
          uses thin 1px lines.
        </p>
      )}
    </Card>
  )
}
