import { Modal } from '@/components/ui/Modal'
import { TenantDetailsContent } from '@/components/clients/TenantDetailsContent'

interface TenantDetailsModalProps {
  tenantId: string | null
  open: boolean
  onClose: () => void
  onSelectTenant: (tenantId: string) => void
}

export function TenantDetailsModal({
  tenantId,
  open,
  onClose,
  onSelectTenant,
}: TenantDetailsModalProps) {
  if (!tenantId) return null

  return (
    <Modal open={open} onClose={onClose} title="Tenant details" size="xl" fitContent>
      <TenantDetailsContent tenantId={tenantId} onSelectTenant={onSelectTenant} />
    </Modal>
  )
}
