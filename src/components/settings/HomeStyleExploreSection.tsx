import { StylePickerGrid } from '@/components/settings/StylePickerGrid'
import { useTheme } from '@/context/ThemeContext'
import { DEFAULT_THEME_ID, getThemeOption } from '@/themes/options'
import type { ThemeId } from '@/themes/types'

/**
 * Style chooser for the introduction page.
 * Selections apply immediately as a live document-theme preview and persist
 * for Demo Mode, landlord, and tenant surfaces.
 */
export function HomeStyleExploreSection() {
  const { themeId, themes, setTheme } = useTheme()
  const defaultName = getThemeOption(DEFAULT_THEME_ID).name

  const handleSelect = (id: ThemeId) => {
    setTheme(id, { syncSurfaces: true })
  }

  return (
    <section
      className="home-page__styles w-full max-w-[53.5rem]"
      aria-labelledby="home-styles-heading"
    >
      <h2 id="home-styles-heading" className="home-page__styles-heading">
        Choose Your Style
      </h2>
      <p className="home-page__styles-lede">
        Tap a finish to preview it on this page. {defaultName} is the default until you choose.
      </p>
      <div className="home-page__styles-grid">
        <StylePickerGrid themeId={themeId} themes={themes} onSelect={handleSelect} />
      </div>
      <p className="home-page__styles-footnote">
        Your choice saves for Demo Mode, Settings, and every screen until you pick another.
      </p>
    </section>
  )
}
