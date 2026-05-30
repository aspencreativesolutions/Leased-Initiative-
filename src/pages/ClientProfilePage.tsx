import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  FileText,
  Pencil,
  CheckCircle,
  StickyNote,
  ExternalLink,
} from 'lucide-react'
import { NotesSection } from '@/components/clients/NotesSection'
import { AddNoteModal } from '@/components/clients/AddNoteModal'
import { MarkOfficialClientCard } from '@/components/clients/MarkOfficialClientCard'
import { OfficialClientBadge } from '@/components/clients/OfficialClientBadge'
import { SampleClientBadge } from '@/components/clients/SampleClientBadge'
import { PayPalPaymentSection } from '@/components/payments/PayPalPaymentSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/FormField'
import { useApp } from '@/context/AppContext'
import { formatDate } from '@/lib/utils'
import type { ContractStatus, PaymentStatus, ProjectStatus, ProjectType } from '@/types'

export function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getClient, updateClient } = useApp()
  const client = id ? getClient(id) : undefined
  const [editOpen, setEditOpen] = useState(false)
  const [noteQuickOpen, setNoteQuickOpen] = useState(false)

  if (!client) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-600">Client not found.</p>
        <Link to="/clients" className="mt-4 inline-block text-brand hover:underline">
          Back to clients
        </Link>
      </div>
    )
  }

  const handleFollowUpComplete = () => {
    updateClient(client.id, {
      followUpDate: undefined,
      projectStatus: client.projectStatus === 'Follow-Up Needed' ? 'In Progress' : client.projectStatus,
    })
  }

  const handleSendEmail = () => {
    window.open(`mailto:${client.email}`, '_blank')
  }

  return (
    <div className="w-full min-w-0">
      <Link
        to="/clients"
        className="mb-2 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to clients
      </Link>

      <PageHeader
        title={client.name}
        subtitle={client.businessName}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit Client
            </Button>
            <Button size="sm" onClick={() => navigate(`/clients/${client.id}/contract`)}>
              <FileText className="h-4 w-4" />
              Start Contract
            </Button>
            <Button variant="outline" size="sm" onClick={handleSendEmail}>
              <Mail className="h-4 w-4" />
              Send Email
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNoteQuickOpen(true)}>
              <StickyNote className="h-4 w-4" />
              Add Note
            </Button>
            <Button variant="secondary" size="sm" onClick={handleFollowUpComplete}>
              <CheckCircle className="h-4 w-4" />
              Mark Follow-Up Complete
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge type="project" status={client.projectStatus} />
        <StatusBadge type="contract" status={client.contractStatus} />
        <StatusBadge type="payment" status={client.paymentStatus} />
        {client.isSampleClient && <SampleClientBadge />}
        {client.isOfficialClient && <OfficialClientBadge />}
      </div>

      {client.isSampleClient && (
        <p className="mb-6 rounded-[var(--radius-sm)] border border-dashed border-line bg-surface px-4 py-3 text-sm text-ink-muted">
          This is a <strong className="text-ink">sample client</strong> included for demo purposes.
          Edit freely or remove when you add real clients.
        </p>
      )}

      <div className="mb-6 grid w-full min-w-0 gap-6 lg:grid-cols-2">
        <MarkOfficialClientCard client={client} />
        {client.isOfficialClient && (
          <div className="lg:col-span-2">
            <PayPalPaymentSection client={client} />
          </div>
        )}
      </div>

      <div className="grid w-full min-w-0 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Contact Information" />
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-stone-500">Email</dt>
              <dd className="font-medium text-stone-800">{client.email}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Phone</dt>
              <dd className="font-medium text-stone-800">{client.phone || '—'}</dd>
            </div>
            {client.website && (
              <div>
                <dt className="text-stone-500">Website</dt>
                <dd>
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                  >
                    {client.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </dd>
              </div>
            )}
            {client.socialLinks && (
              <div>
                <dt className="text-stone-500">Social</dt>
                <dd className="font-medium text-stone-800">{client.socialLinks}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <CardHeader title="Project Details" />
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-stone-500">Project Type</dt>
              <dd className="font-medium text-stone-800">{client.projectType}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Project Name</dt>
              <dd className="font-medium text-stone-800">{client.projectName}</dd>
            </div>
            {client.projectDescription && (
              <div>
                <dt className="text-stone-500">Description</dt>
                <dd className="text-stone-700">{client.projectDescription}</dd>
              </div>
            )}
            <div>
              <dt className="text-stone-500">Next Follow-up</dt>
              <dd className="font-medium text-stone-800">{formatDate(client.followUpDate)}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Contract Information" />
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-stone-500">Status</dt>
              <StatusBadge type="contract" status={client.contractStatus} />
            </div>
            <div className="pt-2">
              <Button size="sm" onClick={() => navigate(`/clients/${client.id}/contract`)}>
                <FileText className="h-4 w-4" />
                {client.contractStatus === 'Not Started' ? 'Start Contract' : 'View / Edit Contract'}
              </Button>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Payment Information" />
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-stone-500">Payment Status</dt>
              <StatusBadge type="payment" status={client.paymentStatus} />
            </div>
            {client.invoice && (
              <>
                <div>
                  <dt className="text-stone-500">Invoice</dt>
                  <dd className="font-medium text-stone-800">
                    ${client.invoice.amount.toFixed(2)} {client.invoice.currency}
                  </dd>
                </div>
                {client.invoice.paymentLink && !client.invoice.paidAt && (
                  <div>
                    <dt className="text-stone-500">Payment Link</dt>
                    <dd>
                      <a
                        href={client.invoice.paymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-brand hover:underline break-all"
                      >
                        Open PayPal checkout
                      </a>
                    </dd>
                  </div>
                )}
              </>
            )}
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Important Dates & Deadlines" />
          {client.deadlines.length === 0 && !client.followUpDate ? (
            <p className="text-sm text-stone-500">No deadlines set.</p>
          ) : (
            <ul className="space-y-2">
              {client.followUpDate && (
                <li className="flex justify-between rounded-lg border border-stone-100 px-3 py-2 text-sm">
                  <span>Follow-up</span>
                  <span className="font-medium">{formatDate(client.followUpDate)}</span>
                </li>
              )}
              {client.deadlines.map((d) => (
                <li
                  key={d.id}
                  className="flex justify-between rounded-lg border border-stone-100 px-3 py-2 text-sm"
                >
                  <span>
                    {d.label}
                    <span className="ml-2 text-xs text-stone-400 capitalize">({d.type})</span>
                  </span>
                  <span className="font-medium">{formatDate(d.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {client.profileNotes && (
          <Card className="lg:col-span-2">
            <CardHeader title="Profile Notes" />
            <p className="text-sm text-stone-700 whitespace-pre-wrap">{client.profileNotes}</p>
          </Card>
        )}

        <div className="lg:col-span-2">
          <NotesSection client={client} />
        </div>
      </div>

      <EditClientModal open={editOpen} onClose={() => setEditOpen(false)} client={client} />
      <AddNoteModal open={noteQuickOpen} onClose={() => setNoteQuickOpen(false)} clientId={client.id} />
    </div>
  )
}

function EditClientModal({
  open,
  onClose,
  client,
}: {
  open: boolean
  onClose: () => void
  client: import('@/types').Client
}) {
  const { updateClient } = useApp()
  const [form, setForm] = useState({
    name: client.name,
    businessName: client.businessName,
    email: client.email,
    phone: client.phone,
    website: client.website || '',
    socialLinks: client.socialLinks || '',
    projectType: client.projectType,
    projectName: client.projectName,
    projectDescription: client.projectDescription || '',
    projectStatus: client.projectStatus,
    contractStatus: client.contractStatus,
    paymentStatus: client.paymentStatus,
    followUpDate: client.followUpDate || '',
    profileNotes: client.profileNotes || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateClient(client.id, {
      ...form,
      website: form.website || undefined,
      socialLinks: form.socialLinks || undefined,
      followUpDate: form.followUpDate || undefined,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Client" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Business" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          <Input label="Social Links" value={form.socialLinks} onChange={(e) => setForm({ ...form, socialLinks: e.target.value })} />
        </div>
        <Select label="Project Type" value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value as ProjectType })}>
          {(['Website Design', 'Website Redesign', 'Branding', 'SEO', 'Maintenance', 'Other'] as ProjectType[]).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <Input label="Project Name" value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} />
        <Textarea label="Description" value={form.projectDescription} onChange={(e) => setForm({ ...form, projectDescription: e.target.value })} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Project Status" value={form.projectStatus} onChange={(e) => setForm({ ...form, projectStatus: e.target.value as ProjectStatus })}>
            {(['Inquiry', 'In Progress', 'Contract Sent', 'Contract Signed', 'Completed', 'Follow-Up Needed'] as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select label="Contract Status" value={form.contractStatus} onChange={(e) => setForm({ ...form, contractStatus: e.target.value as ContractStatus })}>
            {(['Not Started', 'Draft in Progress', 'Generated', 'Sent', 'Signed', 'Completed', 'Cancelled'] as ContractStatus[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select label="Payment Status" value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value as PaymentStatus })}>
            {(['Unpaid', 'Deposit Paid', 'Partial', 'Paid', 'Overdue'] as PaymentStatus[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
        <Input label="Follow-up Date" type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
        <Textarea label="Notes" value={form.profileNotes} onChange={(e) => setForm({ ...form, profileNotes: e.target.value })} />
        <div className="flex justify-end gap-2 sticky bottom-0 bg-white pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Modal>
  )
}
