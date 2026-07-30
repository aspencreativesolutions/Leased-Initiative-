import { Fragment } from 'react'
import { parseAddressSoftBreaks } from '@/lib/addressDisplay'
import { cn } from '@/lib/utils'

interface AddressTextProps {
  address: string
  className?: string
  /** Hanging indent on wrapped lines (left-aligned contexts). Default true. */
  hangingIndent?: boolean
}

/**
 * Renders a property address that wraps after commas when space is tight,
 * with optional hanging indent on continuation lines.
 */
export function AddressText({
  address,
  className,
  hangingIndent = true,
}: AddressTextProps) {
  const segments = parseAddressSoftBreaks(address)

  return (
    <span
      className={cn(
        'address-text',
        hangingIndent && 'address-text--hanging',
        className
      )}
    >
      {segments.map((segment, index) =>
        segment.kind === 'comma' ? (
          <Fragment key={`c-${index}`}>
            {segment.value}
            <wbr />
          </Fragment>
        ) : (
          <Fragment key={`t-${index}`}>{segment.value}</Fragment>
        )
      )}
    </span>
  )
}
