import { useEffect, useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { ServiceTierBadge } from '@/components/scheduler/ServiceTierBadge'
import { getProjectChecklistItems } from '@/lib/projectChecklist'
import { cn } from '@/lib/utils'
import type { ServiceTier } from '@/types'

interface ProjectChecklistSectionProps {
  serviceTier: ServiceTier
  completedItemIds: string[]
  onToggle: (itemId: string, completed: boolean) => void | Promise<void>
  /** Portal uses a lighter section shell; admin uses bordered card */
  variant?: 'admin' | 'portal'
  className?: string
}

function ChecklistItems({
  items,
  completedItemIds,
  onToggle,
}: {
  items: ReturnType<typeof getProjectChecklistItems>
  completedItemIds: string[]
  onToggle: (itemId: string, completed: boolean) => void | Promise<void>
}) {
  const completedSet = new Set(completedItemIds)

  return (
    <ul className="max-h-[min(28rem,70vh)] space-y-2 overflow-y-auto pr-1" role="list">
      {items.map((item) => {
        const checked = completedSet.has(item.id)
        return (
          <li key={item.id}>
            <label
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-sm border border-line/80 bg-surface px-3 py-2 text-sm transition-colors hover:border-line',
                checked && 'bg-surface-paper'
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => void onToggle(item.id, !checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-2 border-ink/25 accent-brand"
              />
              <span
                className={cn(
                  'min-w-0 flex-1 leading-snug text-ink',
                  checked && 'text-ink-muted line-through'
                )}
              >
                {item.label}
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}

export function ProjectChecklistSection({
  serviceTier,
  completedItemIds,
  onToggle,
  variant = 'admin',
  className,
}: ProjectChecklistSectionProps) {
  const items = getProjectChecklistItems(serviceTier)
  const [localCompleted, setLocalCompleted] = useState(completedItemIds)

  useEffect(() => {
    setLocalCompleted(completedItemIds)
  }, [completedItemIds])

  const handleToggle = async (itemId: string, completed: boolean) => {
    setLocalCompleted((current) =>
      completed
        ? current.includes(itemId)
          ? current
          : [...current, itemId]
        : current.filter((id) => id !== itemId)
    )
    try {
      await onToggle(itemId, completed)
    } catch {
      setLocalCompleted(completedItemIds)
    }
  }

  if (variant === 'portal') {
    return (
      <section
        id="project-checklist"
        className={cn('min-w-0 scroll-mt-24', className)}
        aria-labelledby="project-checklist-heading"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="project-checklist-heading" className="label-caps flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Project Checklist
          </h2>
          <ServiceTierBadge tier={serviceTier} small />
        </div>
        <div className="rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper p-4 sm:p-5">
          <ChecklistItems
            items={items}
            completedItemIds={localCompleted}
            onToggle={handleToggle}
          />
        </div>
      </section>
    )
  }

  return (
    <section
      id="project-checklist"
      className={cn(
        'min-w-0 scroll-mt-24 rounded-[var(--radius-sm)] border-2 border-ink bg-surface-paper',
        className
      )}
      aria-labelledby="project-checklist-heading"
    >
      <Card padding="lg" className="border-0 shadow-none">
        <CardHeader
          title="Project Checklist"
          subtitle={`Key deliverables for your ${serviceTier} package`}
          action={<ServiceTierBadge tier={serviceTier} small />}
          dense
        />
        <ChecklistItems
          items={items}
          completedItemIds={localCompleted}
          onToggle={handleToggle}
        />
      </Card>
    </section>
  )
}
