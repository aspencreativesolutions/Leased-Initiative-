import type { ReactNode } from 'react'
import { Check, Send } from 'lucide-react'
import {
  clientStatusIconWrapperClass,
  clientNameMarkersClass,
} from './clientBadgeStyles'
import { getDisplayContractStatus, isContractSigned } from '@/lib/clientUtils'
import { cn } from '@/lib/utils'
import type { Client, ContractData } from '@/types'

interface TenantLeaseStatusIconsProps {
  client: Client
  contract?: ContractData
  /** Tenant name / link rendered after the status icons */
  children: ReactNode
  className?: string
}

/** Icon-only lease markers before the tenant name (blue check when signed). */
export function TenantNameWithLeaseIcons({
  client,
  contract,
  children,
  className,
}: TenantLeaseStatusIconsProps) {
  const status = getDisplayContractStatus(client, contract)
  const signed = isContractSigned(client, contract) || client.isOfficialClient
  const sent = !signed && status === 'Sent'

  return (
    <div className={cn(clientNameMarkersClass, className)}>
      {signed && (
        <span
          className={cn(clientStatusIconWrapperClass, 'text-[#2563eb]')}
          title="Lease signed"
        >
          <Check className="h-4 w-4 shrink-0" strokeWidth={2.75} aria-hidden />
          <span className="sr-only">Lease signed</span>
        </span>
      )}
      {sent && (
        <span
          className={cn(clientStatusIconWrapperClass, 'text-accent')}
          title="Lease sent"
        >
          <Send className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
          <span className="sr-only">Lease sent</span>
        </span>
      )}
      {children}
    </div>
  )
}
