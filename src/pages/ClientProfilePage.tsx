import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  FileText,
  Pencil,
  CheckCircle,
  StickyNote,
  UserMinus,
  Eye,
  Trash2,
  ExternalLink,
  FileDown,
} from 'lucide-react'
import { NotesSection } from '@/components/clients/NotesSection'
import { AddNoteModal } from '@/components/clients/AddNoteModal'
import { MarkOfficialClientCard } from '@/components/clients/MarkOfficialClientCard'
import { RemoveClientModal } from '@/components/clients/RemoveClientModal'
import { ClientStatusIcon } from '@/components/clients/ClientStatusIcon'
import { ClientContactInfo } from '@/components/clients/ClientContactInfo'
import { ClientInvoiceCard } from '@/components/payments/ClientInvoiceCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import {
  ClientStatusOverview,
  ContractStatusProgress,
} from '@/components/clients/ClientStatusOverview'
import { PaymentDetailsCard } from '@/components/clients/ContractPaymentSummary'
import { ProjectTimeline } from '@/components/clients/ProjectTimeline'
import { ProjectFilesSection } from '@/components/files/ProjectFilesSection'
import { ContractReviewView } from '@/components/contracts/ContractReviewView'
import { DeleteContractModal } from '@/components/contracts/DeleteContractModal'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/FormField'
import { useApp } from '@/context/AppContext'
import {
  canViewClientContract,
  getContractActionLabel,
  isProjectActive,
} from '@/lib/clientUtils'
import { formatDate } from '@/lib/utils'
import { contractPdfFilename, openContractPdfInNewTab } from '@/lib/pdf'
import type { ContractStatus, PaymentStatus, ProjectStatus, ProjectType } from '@/types'

/** Compact profile header actions on small screens */
const profileActionButtonClass =
  'gap-1 px-2 py-1 text-[9px] sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[11px]'

const profileActionIconClass = 'size-3 shrink-0 sm:size-4'

export function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { getClient, getContractForClient, updateClient, refresh, settings } = useApp()
  const client = id ? getClient(id) : undefined
  const contract = client ? getContractForClient(client.id) : undefined
  const [editOpen, setEditOpen] = useState(false)
  const [noteQuickOpen, setNoteQuickOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [viewContractOpen, setViewContractOpen] = useState(false)
  const [deleteContractOpen, setDeleteContractOpen] = useState(false)
  const showViewContract = client
    ? canViewClientContract(contract, client.contractStatus)
    : false
  const hasContractWorkflow = Boolean(client && client.contractStatus !== 'Not Started')

  useEffect(() => {
    if (!client || contract || !hasContractWorkflow) return
    void refresh()
  }, [client?.id, contract, hasContractWorkflow, refresh])

  useEffect(() => {
    if (!location.hash) return
    const targetId = location.hash.slice(1)
    const el = document.getElementById(targetId)
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [location.hash, client?.id])

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
        title={
          <span
            className="inline-flex items-center gap-2"
            title={client.isSampleClient ? 'THIS IS A MOCK USER.' : undefined}
          >
            {client.name}
            <ClientStatusIcon isOfficialClient={client.isOfficialClient} />
          </span>
        }
        subtitle={client.businessName}
        action={
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className={profileActionButtonClass}
              onClick={() => setEditOpen(true)}
            >
              <Pencil className={profileActionIconClass} />
              Edit Client
            </Button>
            <Button
              size="sm"
              className={profileActionButtonClass}
              onClick={() => navigate(`/clients/${client.id}/contract`)}
            >
              <FileText className={profileActionIconClass} />
              {getContractActionLabel(client.contractStatus)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={profileActionButtonClass}
              onClick={handleSendEmail}
            >
              <Mail className={profileActionIconClass} />
              Send Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={profileActionButtonClass}
              onClick={() => setNoteQuickOpen(true)}
            >
              <StickyNote className={profileActionIconClass} />
              Add Note
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className={profileActionButtonClass}
              onClick={handleFollowUpComplete}
            >
              <CheckCircle className={profileActionIconClass} />
              Mark Follow-Up Complete
            </Button>
            <Button
              variant="danger"
              size="sm"
              className={profileActionButtonClass}
              onClick={() => setRemoveOpen(true)}
            >
              <UserMinus className={profileActionIconClass} />
              Remove Client
            </Button>
          </div>
        }
      />

      <ClientStatusOverview
        className="mb-4 sm:mb-6"
        projectStatus={client.projectStatus}
        contractStatus={client.contractStatus}
        paymentStatus={client.paymentStatus}
        projectStarted={isProjectActive(client)}
        showProgress={false}
      />

      <ProjectTimeline
        client={client}
        aside={<ClientContactInfo client={client} compact />}
      />

      <div className="mb-4 sm:mb-6">
        <ProjectFilesSection clientId={client.id} projectName={client.projectName} />
      </div>

      <section id="deposit-invoice" className="mb-4 scroll-mt-24 space-y-4 sm:mb-6 sm:space-y-6">
        {!client.isOfficialClient && <MarkOfficialClientCard client={client} />}
        {client.isOfficialClient && <ClientInvoiceCard client={client} />}

        <div className="grid w-full min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Contract Information" />
            <div className="space-y-4 text-sm">
              <ContractStatusProgress
                status={client.contractStatus}
                projectStarted={isProjectActive(client)}
                viewedAt={contract?.viewedAt}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => navigate(`/clients/${client.id}/contract`)}>
                  <FileText className="h-4 w-4" />
                  {getContractActionLabel(client.contractStatus)}
                </Button>
                {contract && (
                  <Button
                    variant="outline"
                    size="sm"
                    title={contractPdfFilename(contract)}
                    onClick={() => openContractPdfInNewTab(contract, settings)}
                  >
                    <FileDown className="h-4 w-4 shrink-0" />
                    Contract PDF
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                  </Button>
                )}
                {hasContractWorkflow && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteContractOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete contract
                  </Button>
                )}
                {showViewContract && contract && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewContractOpen(true)}
                  >
                    <Eye className="h-4 w-4" />
                    View Contract
                  </Button>
                )}
              </div>
              {!contract && hasContractWorkflow && (
                <p className="text-xs text-ink-faint">
                  No contract file stored yet (status: {client.contractStatus}). You can still delete
                  to reset the timeline to Inquiry.
                </p>
              )}

              {contract && (
                <p className="break-all font-mono text-[10px] text-ink-faint">ID {contract.id}</p>
              )}
            </div>
          </Card>

          <PaymentDetailsCard client={client} contract={contract} />
        </div>
      </section>

      <div className="grid w-full min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
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

      {contract && (
        <Modal
          open={viewContractOpen}
          onClose={() => setViewContractOpen(false)}
          title="Contract"
          size="xl"
        >
          <div className="max-h-[calc(90vh-5rem)] overflow-y-auto">
            <ContractReviewView
              contract={contract}
              designerName={settings.ownerName}
              businessName={settings.businessName}
            />
          </div>
        </Modal>
      )}

      <EditClientModal open={editOpen} onClose={() => setEditOpen(false)} client={client} />
      {hasContractWorkflow && (
        <DeleteContractModal
          open={deleteContractOpen}
          onClose={() => setDeleteContractOpen(false)}
          contracts={
            contract
              ? [
                  {
                    contract,
                    clientName: client.name,
                    businessName: client.businessName,
                  },
                ]
              : []
          }
          workflowFallback={
            !contract
              ? {
                  clientId: client.id,
                  clientName: client.name,
                  businessName: client.businessName,
                  projectName: client.projectName,
                  contractStatus: client.contractStatus,
                }
              : undefined
          }
          preselectedContractId={contract?.id}
          onDeleted={async () => {
            await refresh()
            setDeleteContractOpen(false)
          }}
        />
      )}
      <AddNoteModal open={noteQuickOpen} onClose={() => setNoteQuickOpen(false)} clientId={client.id} />
      <RemoveClientModal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        clientId={client.id}
        clientName={client.name}
        hasLinkedAccount={Boolean(client.accountUserId)}
        onRemoved={async () => {
          setRemoveOpen(false)
          await refresh()
          navigate('/clients')
        }}
      />
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
            {(['Unpaid', 'Pay Link Clicked', 'Deposit Paid', 'Partial', 'Paid', 'Overdue'] as PaymentStatus[]).map((s) => (
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
