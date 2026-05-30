import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/context/AppContext'
import type { ProjectStatus, ProjectType } from '@/types'

const projectTypes: ProjectType[] = [
  'Website Design',
  'Website Redesign',
  'Branding',
  'SEO',
  'Maintenance',
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

interface AddClientModalProps {
  open: boolean
  onClose: () => void
}

export function AddClientModal({ open, onClose }: AddClientModalProps) {
  const { addClient } = useApp()
  const [form, setForm] = useState({
    name: '',
    businessName: '',
    email: '',
    phone: '',
    projectType: 'Website Design' as ProjectType,
    projectName: '',
    projectDescription: '',
    projectStatus: 'Inquiry' as ProjectStatus,
    notes: '',
    followUpDate: '',
  })

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
      projectName: form.projectName || `${form.businessName} Project`,
      projectDescription: form.projectDescription,
      projectStatus: form.projectStatus,
      contractStatus: 'Not Started',
      paymentStatus: 'Unpaid',
      isOfficialClient: false,
      followUpDate: form.followUpDate || undefined,
      profileNotes: form.notes,
    })
    onClose()
    setForm({
      name: '',
      businessName: '',
      email: '',
      phone: '',
      projectType: 'Website Design',
      projectName: '',
      projectDescription: '',
      projectStatus: 'Inquiry',
      notes: '',
      followUpDate: '',
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Add New Client" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Client Name"
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
            label="Project Type"
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
            label="Project Status"
            name="projectStatus"
            value={form.projectStatus}
            onChange={(e) => update('projectStatus', e.target.value)}
          >
            {projectStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="Project Name"
          name="projectName"
          placeholder="Homepage Redesign"
          value={form.projectName}
          onChange={(e) => update('projectName', e.target.value)}
        />
        <Textarea
          label="Project Description"
          name="projectDescription"
          placeholder="Brief overview of the project..."
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
          <Button type="submit">Save Client</Button>
        </div>
      </form>
    </Modal>
  )
}
