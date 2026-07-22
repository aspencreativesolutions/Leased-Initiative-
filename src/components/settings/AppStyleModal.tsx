import { Palette } from 'lucide-react'
import { AppearanceToggle } from '@/components/settings/AppearanceToggle'
import { Modal } from '@/components/ui/Modal'
import { StylePickerGrid } from '@/components/settings/StylePickerGrid'
import { useTheme } from '@/context/ThemeContext'

interface AppStyleModalProps {
  open: boolean
  onClose: () => void
}

export function AppStyleModal({ open, onClose }: AppStyleModalProps) {
  const { themeId, themes, setTheme, theme, appearance, setAppearance, supportsAppearance } =
    useTheme()

  return (
    <Modal open={open} onClose={onClose} title="Choose Style" size="xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-muted">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 shrink-0 text-brand" />
          <p>
            Pick a look for your dashboard — saved on this device. Currently using{' '}
            <strong className="text-ink">{theme.name}</strong>.
          </p>
        </div>
        {supportsAppearance && (
          <AppearanceToggle appearance={appearance} onChange={setAppearance} />
        )}
      </div>
      <StylePickerGrid
        themeId={themeId}
        themes={themes}
        onSelect={(id) => {
          setTheme(id)
        }}
      />
    </Modal>
  )
}
