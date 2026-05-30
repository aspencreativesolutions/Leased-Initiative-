import { cn } from '@/lib/utils'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface LabelProps {
  label: string
  htmlFor?: string
  hint?: string
  required?: boolean
}

export function FormLabel({ label, htmlFor, hint, required }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block">
      <span className="label-caps">{label}</span>
      {required && <span className="text-accent"> *</span>}
      {hint && <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-ink-faint">{hint}</span>}
    </label>
  )
}

const inputClass =
  'w-full rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none focus:ring-0'

export function Input({
  label,
  hint,
  required,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & LabelProps) {
  const fieldId = id || props.name
  return (
    <div className={className}>
      {label && <FormLabel label={label} htmlFor={fieldId} hint={hint} required={required} />}
      <input id={fieldId} className={inputClass} {...props} />
    </div>
  )
}

export function Textarea({
  label,
  hint,
  required,
  className,
  id,
  rows = 4,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & LabelProps) {
  const fieldId = id || props.name
  return (
    <div className={className}>
      {label && <FormLabel label={label} htmlFor={fieldId} hint={hint} required={required} />}
      <textarea id={fieldId} rows={rows} className={cn(inputClass, 'resize-y min-h-[80px]')} {...props} />
    </div>
  )
}

export function Select({
  label,
  hint,
  required,
  className,
  children,
  id,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & LabelProps & { children: ReactNode }) {
  const fieldId = id || props.name
  return (
    <div className={className}>
      {label && <FormLabel label={label} htmlFor={fieldId} hint={hint} required={required} />}
      <select id={fieldId} className={inputClass} {...props}>
        {children}
      </select>
    </div>
  )
}
