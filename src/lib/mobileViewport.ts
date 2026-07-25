/**
 * Dismiss keyboard / clear focus and reset scroll before a client-side
 * navigation. Pair with ≥16px input font-size so iOS Safari never zooms
 * the field in the first place.
 */
export async function prepareViewportForNavigation(
  focusTarget?: HTMLElement | null
): Promise<void> {
  if (typeof document === 'undefined') return

  focusTarget?.blur()
  const active = document.activeElement
  if (active instanceof HTMLElement && active !== document.body) {
    active.blur()
  }

  window.scrollTo(0, 0)

  // Let iOS settle keyboard dismissal before the next route paints.
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })

  window.scrollTo(0, 0)
}
