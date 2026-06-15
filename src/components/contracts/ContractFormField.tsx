import { cn } from '@/lib/utils'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface FieldProps {
  label: string
  hint?: string
  required?: boolean
  className?: string
}

const underlineInput =
  'w-full border-0 border-b border-line/70 bg-transparent px-0 py-2.5 text-sm text-ink placeholder:text-ink-faint/60 focus:border-ink focus:outline-none focus:ring-0'

const underlineTextarea =
  'w-full resize-y border-0 border-b border-line/70 bg-transparent px-0 py-2.5 text-sm leading-relaxed text-ink placeholder:text-ink-faint/60 focus:border-ink focus:outline-none focus:ring-0 min-h-[88px]'

function FieldLabel({ label, hint, required, htmlFor }: FieldProps & { htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-3 block">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      {hint && (
        <span className="ml-2 font-serif text-[11px] font-normal italic normal-case tracking-normal text-ink-faint">
          {hint}
        </span>
      )}
    </label>
  )
}

export function ContractInput({
  label,
  hint,
  required,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  const fieldId = id || props.name
  return (
    <div className={className}>
      <FieldLabel label={label} hint={hint} required={required} htmlFor={fieldId} />
      <input id={fieldId} className={underlineInput} {...props} />
    </div>
  )
}

export function ContractTextarea({
  label,
  hint,
  required,
  className,
  id,
  rows = 4,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  const fieldId = id || props.name
  return (
    <div className={className}>
      <FieldLabel label={label} hint={hint} required={required} htmlFor={fieldId} />
      <textarea id={fieldId} rows={rows} className={underlineTextarea} {...props} />
    </div>
  )
}

export function ContractSelect({
  label,
  hint,
  required,
  className,
  children,
  id,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & FieldProps & { children: ReactNode }) {
  const fieldId = id || props.name
  return (
    <div className={className}>
      <FieldLabel label={label} hint={hint} required={required} htmlFor={fieldId} />
      <select id={fieldId} className={cn(underlineInput, 'cursor-pointer')} {...props}>
        {children}
      </select>
    </div>
  )
}

export function ContractSignatureRow({
  label,
  hint,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div className="mx-auto max-w-md">
      <label className="mb-4 flex items-baseline gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink">{label}</span>
        {hint && (
          <span className="font-serif text-[11px] italic text-ink-faint">{hint}</span>
        )}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(underlineInput, 'text-center sm:text-left')}
      />
    </div>
  )
}
