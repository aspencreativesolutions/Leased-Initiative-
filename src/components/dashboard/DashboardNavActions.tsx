import { Plus, UserPlus, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  DEMO_GUIDE_CUE_EVENT,
  isPublicDemoSession,
  peekNewRegistrantsDemoCue,
  type DemoGuideCueDetail,
} from '@/lib/publicDemo'
import { cn } from '@/lib/utils'

interface DashboardNavActionsProps {
  registrationCount: number
  onOpenRegistrations: () => void
  onOpenAddClient: () => void
  onOpenSendInvite: () => void
  /** Compact strip for the main nav (beside Tenant Alerts). */
  variant?: 'page' | 'nav'
  className?: string
}

const iconBtnBase =
  'h-8 min-w-8 shrink-0 !gap-1 !px-2 !py-0 cursor-pointer'

export function DashboardNavActions({
  registrationCount,
  onOpenRegistrations,
  onOpenAddClient,
  onOpenSendInvite,
  variant = 'page',
  className,
}: DashboardNavActionsProps) {
  const isNav = variant === 'nav'
  const navOutlineClass = isNav
    ? '!border-nav-fg/35 !text-nav-fg hover:!border-nav-fg hover:!bg-transparent hover:!text-nav-fg'
    : undefined
  const [demoCueActive, setDemoCueActive] = useState(() =>
    Boolean(isPublicDemoSession() && peekNewRegistrantsDemoCue())
  )

  useEffect(() => {
    if (!isPublicDemoSession()) return
    setDemoCueActive(Boolean(peekNewRegistrantsDemoCue()))
    const onCue = (event: Event) => {
      const detail = (event as CustomEvent<DemoGuideCueDetail>).detail
      if (detail?.kind === 'new-registrants') setDemoCueActive(true)
      if (detail?.kind === 'pending-tenant') setDemoCueActive(false)
    }
    window.addEventListener(DEMO_GUIDE_CUE_EVENT, onCue)
    return () => window.removeEventListener(DEMO_GUIDE_CUE_EVENT, onCue)
  }, [])

  return (
    <div
      className={cn(
        'flex flex-nowrap items-center gap-1.5',
        isNav ? 'justify-end' : 'justify-end',
        className
      )}
      data-tenant-actions
      aria-label="Tenant action buttons"
    >
      {registrationCount > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-onboarding="dashboard-registrations"
          className={cn(
            iconBtnBase,
            'quick-tooltip quick-tooltip--below',
            isNav && 'tenant-action-registers--attention',
            demoCueActive && 'tenant-action-registers--demo-cue',
            navOutlineClass
          )}
          onClick={() => {
            setDemoCueActive(false)
            onOpenRegistrations()
          }}
          data-tooltip="View New Registers"
          aria-label={`View New Registers, ${registrationCount} waiting`}
        >
          <UserPlus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
          <span className="min-w-[0.75rem] text-[11px] font-bold tabular-nums leading-none">
            {registrationCount}
          </span>
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-onboarding="dashboard-send-invite"
        className={cn(iconBtnBase, 'w-8', 'quick-tooltip quick-tooltip--below', navOutlineClass)}
        data-tooltip="Send Invite Link"
        aria-label="Send Invite Link"
        onClick={onOpenSendInvite}
      >
        <Link2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
      </Button>
      <Button
        type="button"
        variant="primary"
        size="sm"
        data-onboarding="dashboard-add-client"
        className={cn(iconBtnBase, 'w-8', 'quick-tooltip quick-tooltip--below')}
        data-tooltip="Add Tenant"
        aria-label="Add Tenant"
        onClick={onOpenAddClient}
      >
        <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
      </Button>
    </div>
  )
}
