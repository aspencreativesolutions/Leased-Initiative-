import { useState } from 'react'
import { Palette } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PortalStyleModal } from '@/components/portal/PortalStyleModal'

interface PortalStyleButtonProps {
  size?: 'sm' | 'md'
  variant?: 'ghost' | 'outline'
}

export function PortalStyleButton({
  size = 'sm',
  variant = 'ghost',
}: PortalStyleButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={
          variant === 'ghost'
            ? '!border-nav-fg/30 !text-nav-fg-muted hover:!border-nav-fg hover:!text-nav-fg'
            : undefined
        }
      >
        <Palette className="h-3.5 w-3.5" />
        Choose Style
      </Button>
      <PortalStyleModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
