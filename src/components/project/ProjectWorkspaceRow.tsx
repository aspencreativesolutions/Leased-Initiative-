import { ProjectChecklistSection } from '@/components/project/ProjectChecklistSection'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import type { ServiceTier } from '@/types'

interface ProjectWorkspaceRowProps {
  files: ReactNode
  /** Portal: Report Issue panel. Admin: project checklist (default). */
  sidePanel?: ReactNode
  serviceTier?: ServiceTier
  completedItemIds?: string[]
  onChecklistToggle?: (itemId: string, completed: boolean) => void | Promise<void>
  variant?: 'admin' | 'portal'
  className?: string
}

export function ProjectWorkspaceRow({
  files,
  sidePanel,
  serviceTier,
  completedItemIds = [],
  onChecklistToggle,
  variant = 'admin',
  className,
}: ProjectWorkspaceRowProps) {
  return (
    <div
      className={cn(
        'grid w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start lg:gap-5',
        className
      )}
    >
      <div className="min-w-0">{files}</div>
      {sidePanel ??
        (serviceTier && onChecklistToggle ? (
          <ProjectChecklistSection
            serviceTier={serviceTier}
            completedItemIds={completedItemIds}
            onToggle={onChecklistToggle}
            variant={variant}
          />
        ) : null)}
    </div>
  )
}
