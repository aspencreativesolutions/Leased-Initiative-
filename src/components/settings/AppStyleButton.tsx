import { useState } from 'react'
import { Palette } from 'lucide-react'
import { AppStyleModal } from '@/components/settings/AppStyleModal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface AppStyleButtonProps {
  size?: 'sm' | 'md'
  variant?: 'ghost' | 'outline'
  className?: string
  showLabel?: 'always' | 'sm' | 'never'
}

export function AppStyleButton({
  size = 'sm',
  variant = 'ghost',
  className,
  showLabel = 'sm',
}: AppStyleButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={cn(
          variant === 'ghost'
            ? '!border-nav-fg/30 !text-nav-fg-muted hover:!border-nav-fg hover:!text-nav-fg'
            : undefined,
          className
        )}
        title="Choose style"
      >
        <Palette className="h-3.5 w-3.5 shrink-0" />
        {showLabel === 'always' && <span>Choose Style</span>}
        {showLabel === 'sm' && <span className="hidden sm:inline">Choose Style</span>}
        {showLabel === 'never' && <span className="sr-only">Choose Style</span>}
      </Button>
      <AppStyleModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
