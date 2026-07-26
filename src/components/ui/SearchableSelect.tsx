import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { FormLabel } from '@/components/ui/FormField'
import { useIsMobileViewport } from '@/lib/useMediaQuery'
import { cn } from '@/lib/utils'

export type SearchableSelectOption = {
  value: string
  /** Optional secondary line under the value in the dropdown list */
  description?: string
}

function normalizeOptions(
  options: Array<string | SearchableSelectOption>
): SearchableSelectOption[] {
  return options.map((option) =>
    typeof option === 'string' ? { value: option } : option
  )
}

/** On phones, swap “type to search” copy for tap-to-choose language. */
function pickerPlaceholder(placeholder: string): string {
  if (/start typing/i.test(placeholder)) {
    return placeholder.replace(/start typing/i, 'Tap to choose')
  }
  if (/type to search/i.test(placeholder)) {
    return 'Tap to choose…'
  }
  return placeholder
}

interface SearchableSelectProps {
  label: string
  hint?: string
  required?: boolean
  name?: string
  value: string
  options: Array<string | SearchableSelectOption>
  placeholder?: string
  disabled?: boolean
  emptyMessage?: string
  onChange: (value: string) => void
  className?: string
  /** Applied to the input + list wrapper (e.g. demo guide rim) */
  controlClassName?: string
  /** When true, opens the suggestion list (e.g. demo address cue) */
  openOnMount?: boolean
}

/**
 * Text-filterable single-select on desktop.
 * On mobile: tap opens the full list — no keyboard — and the user picks an option.
 */
export function SearchableSelect({
  label,
  hint,
  required,
  name,
  value,
  options,
  placeholder = 'Type to search…',
  disabled = false,
  emptyMessage = 'No matches',
  onChange,
  className,
  controlClassName,
  openOnMount = false,
}: SearchableSelectProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const normalized = useMemo(() => normalizeOptions(options), [options])
  const pickerOnly = useIsMobileViewport()

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    if (!openOnMount || disabled) return
    setOpen(true)
  }, [openOnMount, disabled])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery(value)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [open, value])

  const filtered = useMemo(() => {
    // Mobile picker: always show the full list (query is the selected value, not a filter).
    if (pickerOnly) return normalized
    const q = query.trim().toLowerCase()
    if (!q) return normalized
    return normalized.filter(
      (option) =>
        option.value.toLowerCase().includes(q) ||
        option.description?.toLowerCase().includes(q)
    )
  }, [normalized, query, pickerOnly])

  const selectOption = (option: SearchableSelectOption) => {
    onChange(option.value)
    setQuery(option.value)
    setOpen(false)
  }

  const openList = () => {
    if (disabled) return
    setOpen(true)
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <FormLabel label={label} htmlFor={listId} hint={hint} required={required} />
      <div className={cn('relative', controlClassName)}>
        <input
          id={listId}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${listId}-listbox`}
          aria-autocomplete={pickerOnly ? 'none' : 'list'}
          aria-haspopup="listbox"
          disabled={disabled}
          required={required}
          autoComplete="off"
          readOnly={pickerOnly}
          inputMode={pickerOnly ? 'none' : undefined}
          placeholder={pickerOnly ? pickerPlaceholder(placeholder) : placeholder}
          value={query}
          onChange={
            pickerOnly
              ? undefined
              : (event) => {
                  setQuery(event.target.value)
                  setOpen(true)
                  if (value && event.target.value !== value) {
                    onChange('')
                  }
                }
          }
          onFocus={openList}
          onClick={openList}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false)
              setQuery(value)
            }
            if (event.key === 'Enter' && open && filtered.length === 1) {
              event.preventDefault()
              selectOption(filtered[0])
            }
            if (event.key === 'ArrowDown' || event.key === 'Enter') {
              openList()
            }
          }}
          className={cn(
            'w-full rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface-paper px-3 py-2.5 pr-9 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60',
            pickerOnly && 'cursor-pointer caret-transparent'
          )}
        />
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          aria-hidden
        />
      </div>
      {open && !disabled && (
        <ul
          id={`${listId}-listbox`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface-paper py-1 shadow-lift"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-muted">{emptyMessage}</li>
          ) : (
            filtered.map((option) => (
              <li key={option.value} role="option" aria-selected={option.value === value}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full flex-col px-3 py-2 text-left hover:bg-surface',
                    option.value === value && 'bg-brand/10'
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                >
                  <span
                    className={cn(
                      'text-sm text-ink',
                      option.value === value && 'font-semibold'
                    )}
                  >
                    {option.value}
                  </span>
                  {option.description ? (
                    <span className="mt-0.5 text-xs leading-snug text-ink-muted">
                      {option.description}
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
