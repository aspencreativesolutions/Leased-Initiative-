import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { FormLabel } from '@/components/ui/FormField'
import { cn } from '@/lib/utils'

interface SearchableSelectProps {
  label: string
  hint?: string
  required?: boolean
  name?: string
  value: string
  options: string[]
  placeholder?: string
  disabled?: boolean
  emptyMessage?: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Text-filterable single-select. Typing filters suggestions; choosing a row sets the value.
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
}: SearchableSelectProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery(value)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open, value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((option) => option.toLowerCase().includes(q))
  }, [options, query])

  const selectOption = (option: string) => {
    onChange(option)
    setQuery(option)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <FormLabel label={label} htmlFor={listId} hint={hint} required={required} />
      <div className="relative">
        <input
          id={listId}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${listId}-listbox`}
          aria-autocomplete="list"
          disabled={disabled}
          required={required}
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            if (value && event.target.value !== value) {
              onChange('')
            }
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false)
              setQuery(value)
            }
            if (event.key === 'Enter' && open && filtered.length === 1) {
              event.preventDefault()
              selectOption(filtered[0])
            }
          }}
          className="w-full rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface-paper px-3 py-2.5 pr-9 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
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
              <li key={option} role="option" aria-selected={option === value}>
                <button
                  type="button"
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm text-ink hover:bg-surface',
                    option === value && 'bg-brand/10 font-semibold'
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                >
                  {option}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
