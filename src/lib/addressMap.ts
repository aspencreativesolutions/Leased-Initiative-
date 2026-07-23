/**
 * Google Maps embed centered on an address with a place pin.
 * Uses maps.google.com + higher zoom so the red pin is large and clear.
 */
export function googleMapsEmbedUrl(address: string, zoom = 17): string {
  const query = encodeURIComponent(address.trim())
  return `https://maps.google.com/maps?q=${query}&z=${zoom}&hl=en&ie=UTF8&iwloc=B&output=embed`
}

/** Opens the same place in a full Google Maps tab (search pin on address). */
export function googleMapsExternalUrl(address: string): string {
  const query = encodeURIComponent(address.trim())
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

export function isMappableAddress(address: string | null | undefined): boolean {
  const trimmed = address?.trim() ?? ''
  return trimmed.length > 0 && trimmed !== '—'
}
