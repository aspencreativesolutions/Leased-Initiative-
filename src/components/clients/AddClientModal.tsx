import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/context/AppContext'
import { getProjectStatusDisplayLabel } from '@/lib/clientUtils'
import { DEFAULT_SERVICE_TIER, SERVICE_TIERS } from '@/lib/serviceTiers'
import type { ProjectStatus, ProjectType } from '@/types'

const projectTypes: ProjectType[] = [
  'Apartment',
  'House',
  'Condo',
  'Townhouse',
  'Other',
]

const projectStatuses: ProjectStatus[] = [
  'Inquiry',
  'In Progress',
  'Contract Sent',
  'Contract Signed',
  'Completed',
  'Follow-Up Needed',
]

const EMPTY_FORM = {
  name: '',
  businessName: '',
  email: '',
  phone: '',
  projectType: 'Apartment' as ProjectType,
  projectName: '',
  projectDescription: '',
  projectStatus: 'Inquiry' as ProjectStatus,
  serviceTier: DEFAULT_SERVICE_TIER,
  notes: '',
  followUpDate: '',
}

export type AddClientInitialValues = Partial<typeof EMPTY_FORM>

interface AddClientModalProps {
  open: boolean
  onClose: () => void
  initialValues?: AddClientInitialValues
  registrationUserId?: string
  onAdded?: () => void
}

export function AddClientModal({
  open,
  onClose,
  initialValues,
  registrationUserId,
  onAdded,
}: AddClientModalProps) {
  const { addClient } = useApp()
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, ...initialValues })
    }
  }, [open, initialValues])

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addClient({
      name: form.name,
      businessName: form.businessName || form.name,
      email: form.email,
      phone: form.phone,
      projectType: form.projectType,
      projectName: form.projectName || `${form.businessName || form.name} Project`,
      projectDescription: form.projectDescription,
      projectStatus: form.projectStatus,
      serviceTier: form.serviceTier,
      contractStatus: 'Not Started',
      paymentStatus: 'Unpaid',
      isOfficialClient: false,
      followUpDate: form.followUpDate || undefined,
      profileNotes: form.notes,
      accountUserId: registrationUserId,
    })
    onAdded?.()
    onClose()
    setForm(EMPTY_FORM)
  }

  const title = registrationUserId ? 'Add Tenant from Registration' : 'Add New Tenant'

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {registrationUserId && (
        <p className="mb-4 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink-muted">
          Pre-filled from portal sign-up. Complete any missing details, then save to add them to
          your roster.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Tenant Name"
            name="name"
            required
            placeholder="Jane Smith"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
          <Input
            label="Business Name"
            name="businessName"
            placeholder="Smith & Co."
            value={form.businessName}
            onChange={(e) => update('businessName', e.target.value)}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            required
            placeholder="jane@example.com"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            readOnly={Boolean(registrationUserId)}
          />
          <Input
            label="Phone"
            name="phone"
            placeholder="(555) 123-4567"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Property Type"
            name="projectType"
            value={form.projectType}
            onChange={(e) => update('projectType', e.target.value)}
          >
            {projectTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select
            label="Lease Status"
            name="projectStatus"
            value={form.projectStatus}
            onChange={(e) => update('projectStatus', e.target.value)}
          >
            {projectStatuses.map((s) => (
              <option key={s} value={s}>
                {getProjectStatusDisplayLabel(s)}
              </option>
            ))}
          </Select>
          <Select
            label="Service Tier"
            name="serviceTier"
            value={form.serviceTier}
            onChange={(e) => update('serviceTier', e.target.value)}
          >
            {SERVICE_TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="Address"
          name="projectName"
          placeholder="123 Main St, Unit 4B"
          value={form.projectName}
          onChange={(e) => update('projectName', e.target.value)}
        />
        <Textarea
          label="Notes on property"
          name="projectDescription"
          placeholder="Unit details, parking, amenities..."
          value={form.projectDescription}
          onChange={(e) => update('projectDescription', e.target.value)}
        />
        <Input
          label="Follow-up Date"
          name="followUpDate"
          type="date"
          value={form.followUpDate}
          onChange={(e) => update('followUpDate', e.target.value)}
        />
        <Textarea
          label="Notes"
          name="notes"
          placeholder="Internal notes about this client..."
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {registrationUserId ? 'Confirm & Add Tenant' : 'Save Tenant'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
