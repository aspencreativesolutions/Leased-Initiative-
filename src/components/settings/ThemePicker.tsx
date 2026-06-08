import { Palette } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { StylePickerGrid } from '@/components/settings/StylePickerGrid'
import { useTheme } from '@/context/ThemeContext'

export function ThemePicker() {
  const { themeId, themes, setTheme } = useTheme()

  return (
    <Card>
      <CardHeader
        title="App Style"
        subtitle={`${themes.length} visual themes — tap to preview instantly, saved on this device`}
        action={<Palette className="h-5 w-5 text-ink-faint" strokeWidth={1.75} />}
      />
      <StylePickerGrid themeId={themeId} themes={themes} onSelect={setTheme} />
    </Card>
  )
}
