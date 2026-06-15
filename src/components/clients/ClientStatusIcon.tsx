import { OfficialClientBadge } from '@/components/clients/OfficialClientBadge'
import { PendingClientBadge } from '@/components/clients/PendingClientBadge'
import { cn } from '@/lib/utils'

interface ClientStatusIconProps {
  isOfficialClient: boolean
  className?: string
}

export function ClientStatusIcon({ isOfficialClient, className }: ClientStatusIconProps) {
  if (isOfficialClient) {
    return <OfficialClientBadge className={cn(className)} />
  }

  return <PendingClientBadge className={cn(className)} />
}
