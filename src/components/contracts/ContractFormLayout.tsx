import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface StepMeta {
  heading: string
  intro: string
}

interface ContractFormLayoutProps {
  step: number
  totalSteps: number
  stepMeta: StepMeta
  children: ReactNode
  footer?: ReactNode
}

function StepIndicator({ step, totalSteps }: { step: number; totalSteps: number }) {
  return (
    <div
      className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-2.5 sm:flex lg:right-10"
      aria-hidden="true"
    >
      {Array.from({ length: totalSteps }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-2 w-2 rounded-full border transition-colors',
            i === step
              ? 'border-ink bg-ink'
              : i < step
                ? 'border-ink/40 bg-ink/20'
                : 'border-line bg-transparent'
          )}
        />
      ))}
      <span className="mt-2 font-display text-[10px] tracking-[0.2em] text-ink-faint">
        {String(step + 1).padStart(2, '0')}
      </span>
    </div>
  )
}

export function ContractFormLayout({
  step,
  totalSteps,
  stepMeta,
  children,
  footer,
}: ContractFormLayoutProps) {
  return (
    <div className="contract-form-shell">
      <div className="contract-form-paper relative">
        <StepIndicator step={step} totalSteps={totalSteps} />

        <header className="px-8 pb-10 pt-14 text-center sm:px-14 sm:pt-16">
          <h2 className="font-display text-xl font-semibold uppercase tracking-[0.22em] text-ink sm:text-2xl">
            {stepMeta.heading}
          </h2>
          <p className="mx-auto mt-5 max-w-md font-serif text-sm italic leading-relaxed text-ink-muted">
            {stepMeta.intro}
          </p>
        </header>

        <div className="px-8 pb-12 sm:px-14">{children}</div>

        {footer && (
          <footer className="border-t border-line/40 px-8 py-6 sm:px-14">{footer}</footer>
        )}
      </div>
    </div>
  )
}
