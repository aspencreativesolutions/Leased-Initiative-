/**
 * Soft line-break opportunities for property addresses.
 * Prefer wrapping after commas (street → suite → city → region) when the
 * container narrows, instead of mid-word or mid-token cuts.
 */

export type AddressSoftBreakSegment =
  | { kind: 'text'; value: string }
  | { kind: 'comma'; value: string }

/**
 * Parse an address into text runs and comma delimiters so the UI can insert
 * `<wbr>` after each comma.
 */
export function parseAddressSoftBreaks(address: string): AddressSoftBreakSegment[] {
  const trimmed = address.trim()
  if (!trimmed) return []

  const segments: AddressSoftBreakSegment[] = []
  const re = /([^,]+)(,\s*)?/g
  let match: RegExpExecArray | null
  while ((match = re.exec(trimmed)) !== null) {
    const text = match[1]
    if (text) segments.push({ kind: 'text', value: text })
    const comma = match[2]
    if (comma) segments.push({ kind: 'comma', value: comma })
    // Avoid zero-length matches stalling the loop on a trailing comma edge case.
    if (match[0].length === 0) re.lastIndex += 1
  }
  return segments
}
