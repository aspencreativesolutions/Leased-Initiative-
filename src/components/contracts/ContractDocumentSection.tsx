import type { ReactNode } from 'react'

interface ContractDocumentSectionProps {
  id?: string
  label: string
  hint?: string
  children?: ReactNode
  value?: string
}

export function ContractDocumentSection({
  id,
  label,
  hint,
  children,
  value,
}: ContractDocumentSectionProps) {
  const content = children ?? value?.trim() ?? '—'

  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink">
          {label}
        </span>
        {hint && (
          <span className="ml-2 font-serif text-[11px] font-normal italic normal-case tracking-normal text-ink-faint">
            {hint}
          </span>
        )}
      </div>
      <div className="whitespace-pre-wrap border-b border-line/70 pb-2.5 text-sm leading-relaxed text-ink">
        {content}
      </div>
    </section>
  )
}
