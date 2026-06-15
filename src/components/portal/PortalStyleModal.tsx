import { Palette } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { StylePickerGrid } from '@/components/settings/StylePickerGrid'
import { usePortalTheme } from '@/context/PortalThemeContext'

interface PortalStyleModalProps {
  open: boolean
  onClose: () => void
}

export function PortalStyleModal({ open, onClose }: PortalStyleModalProps) {
  const { themeId, themes, setTheme, theme } = usePortalTheme()

  return (
    <Modal open={open} onClose={onClose} title="Choose Style" size="xl">
      <div className="mb-4 flex items-center gap-2 text-sm text-ink-muted">
        <Palette className="h-4 w-4 shrink-0 text-brand" />
        <p>
          Pick a look for your portal — same styles as your designer&apos;s dashboard. Your choice
          is saved on this device. Currently using <strong className="text-ink">{theme.name}</strong>.
        </p>
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
