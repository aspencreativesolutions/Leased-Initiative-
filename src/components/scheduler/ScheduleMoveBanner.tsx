import { Button } from '@/components/ui/Button'

interface ScheduleMoveBannerProps {
  onCancel: () => void
}

export function ScheduleMoveBanner({ onCancel }: ScheduleMoveBannerProps) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2 border border-brand bg-brand/10 px-2 py-1.5 text-xs text-brand">
      <span>Tap an open slot to move this appointment</span>
      <Button variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  )
}
