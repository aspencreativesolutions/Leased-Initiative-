import { useEffect, useState } from 'react'
import { UserPlus, Users } from 'lucide-react'
import { AddClientModal, type AddClientInitialValues } from '@/components/clients/AddClientModal'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import type { PendingRegistration } from '@/types'

interface NewRegistrationsModalProps {
  open: boolean
  onClose: () => void
  registrations: PendingRegistration[]
  onRefresh: () => void
  onListRefresh: () => void
}

export function NewRegistrationsModal({
  open,
  onClose,
  registrations,
  onRefresh,
  onListRefresh,
}: NewRegistrationsModalProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<PendingRegistration | null>(null)

  useEffect(() => {
    if (!open) {
      setAddOpen(false)
      setSelected(null)
    } else {
      onListRefresh()
    }
  }, [open, onListRefresh])

  const handleAddClient = (registration: PendingRegistration) => {
    setSelected(registration)
    setAddOpen(true)
  }

  const handleClientAdded = () => {
    setAddOpen(false)
    setSelected(null)
    onRefresh()
  }

  const initialValues: AddClientInitialValues | undefined = selected
    ? {
        name: selected.name,
        email: selected.email,
        businessName: selected.name,
        projectName: `${selected.name} Project`,
        notes: `Added from portal registration on ${formatDate(selected.createdAt)}.`,
      }
    : undefined

  return (
    <>
      <Modal open={open} onClose={onClose} title="New Registrations" size="lg">
        {registrations.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No pending sign-ups"
            description="When clients register at the portal without a matching profile, they'll appear here."
          />
        ) : (
          <ul className="divide-y divide-line">
            {registrations.map((registration) => (
              <li
                key={registration.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{registration.name}</p>
                  <p className="truncate text-sm text-ink-muted">{registration.email}</p>
                  <p className="mt-1 text-xs text-ink-faint">
                    Registered {formatDate(registration.createdAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleAddClient(registration)}
                >
                  <UserPlus className="h-4 w-4" />
                  Add Client
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <AddClientModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false)
          setSelected(null)
        }}
        initialValues={initialValues}
        registrationUserId={selected?.id}
        onAdded={handleClientAdded}
      />
    </>
  )
}
