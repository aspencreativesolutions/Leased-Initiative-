import { Palette } from 'lucide-react'
import { AppearanceToggle } from '@/components/settings/AppearanceToggle'
import { Modal } from '@/components/ui/Modal'
import { StylePickerGrid } from '@/components/settings/StylePickerGrid'
import { useTheme } from '@/context/ThemeContext'
import { DEFAULT_THEME_ID, getThemeOption } from '@/themes/options'

interface HomeStyleChooserModalProps {
  open: boolean
  onClose: () => void
}

/** Style Chooser opened from the homepage quick-access key dropdown. */
export function HomeStyleChooserModal({ open, onClose }: HomeStyleChooserModalProps) {
  const { themeId, themes, setTheme, theme, appearance, setAppearance, supportsAppearance } =
    useTheme()
  const defaultName = getThemeOption(DEFAULT_THEME_ID).name

  return (
    <Modal open={open} onClose={onClose} title="Style Chooser" size="xl" mobileCover>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-muted">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 shrink-0 text-brand" aria-hidden />
          <p className="hidden md:block">
            Preview a finish on this page. {defaultName} is the default until you choose. Currently
            using <strong className="text-ink">{theme.name}</strong>.
          </p>
          <p className="md:hidden">
            Browse each finish full-size, then apply. Currently{' '}
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
        appearance={appearance}
        onSelect={(id) => {
          setTheme(id, { syncSurfaces: true })
        }}
      />
      <p className="mt-4 hidden text-xs text-ink-faint md:block">
        Your choice applies to Demo Mode (landlord and tenant), Settings, and every screen until you
        pick another.
      </p>
    </Modal>
  )
}
