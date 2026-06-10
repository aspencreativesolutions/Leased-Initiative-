import { useMemo, useState } from 'react'
import { Plus, Search, UserCog, Users } from 'lucide-react'
import { AddClientModal } from '@/components/clients/AddClientModal'
import { ClientAccountsModal } from '@/components/clients/ClientAccountsModal'
import { ClientTable } from '@/components/clients/ClientTable'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/FormField'
import { EmptyState } from '@/components/ui/EmptyState'
import { useApp } from '@/context/AppContext'
import { countOfficialClients, countPendingClients } from '@/lib/clientUtils'
import type { ContractStatus, PaymentStatus, ProjectStatus } from '@/types'

export function ClientsPage() {
  const { clients, refresh } = useApp()
  const [addOpen, setAddOpen] = useState(false)
  const [accountsOpen, setAccountsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState<ProjectStatus | ''>('')
  const [contractFilter, setContractFilter] = useState<ContractStatus | ''>('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | ''>('')
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'upcoming' | 'overdue'>('all')
  const [clientTypeFilter, setClientTypeFilter] = useState<'all' | 'clients' | 'pending'>('all')

  const officialCount = countOfficialClients(clients)
  const pendingCount = countPendingClients(clients)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const today = new Date().toISOString().split('T')[0]

    return clients.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.businessName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.projectName.toLowerCase().includes(q)

      const matchesProject = !projectFilter || c.projectStatus === projectFilter
      const matchesContract = !contractFilter || c.contractStatus === contractFilter
      const matchesPayment = !paymentFilter || c.paymentStatus === paymentFilter

      let matchesDeadline = true
      if (deadlineFilter === 'upcoming') {
        const dates = [
          c.followUpDate,
          ...c.deadlines.filter((d) => !d.completed).map((d) => d.date),
        ].filter(Boolean) as string[]
        matchesDeadline = dates.some((d) => d >= today)
      } else if (deadlineFilter === 'overdue') {
        const dates = [
          c.followUpDate,
          ...c.deadlines.filter((d) => !d.completed).map((d) => d.date),
        ].filter(Boolean) as string[]
        matchesDeadline = dates.some((d) => d < today)
      }

      const matchesType =
        clientTypeFilter === 'all' ||
        (clientTypeFilter === 'clients' && c.isOfficialClient) ||
        (clientTypeFilter === 'pending' && !c.isOfficialClient)

      return (
        matchesSearch &&
        matchesProject &&
        matchesContract &&
        matchesPayment &&
        matchesDeadline &&
        matchesType
      )
    })
  }, [clients, search, projectFilter, contractFilter, paymentFilter, deadlineFilter, clientTypeFilter])

  return (
    <div className="w-full min-w-0">
      <PageHeader
        title="Clients"
        subtitle="Official clients and pending prospects in your pipeline."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setAccountsOpen(true)}>
              <UserCog className="h-4 w-4" />
              Client Accounts
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </div>
        }
      />

      <Card className="mb-6 w-full min-w-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="label-caps mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                type="search"
                placeholder="Search by name, business, email, or project..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-sm border-2 border-line bg-surface-paper py-2.5 pl-10 pr-3 text-sm text-ink focus:border-ink focus:outline-none"
              />
            </div>
          </div>
          <Select
            label="Project Status"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value as ProjectStatus | '')}
            className="w-full lg:w-40"
          >
            <option value="">All</option>
            {(['Inquiry', 'In Progress', 'Contract Sent', 'Contract Signed', 'Completed', 'Follow-Up Needed'] as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select
            label="Contract Status"
            value={contractFilter}
            onChange={(e) => setContractFilter(e.target.value as ContractStatus | '')}
            className="w-full lg:w-40"
          >
            <option value="">All</option>
            {(['Not Started', 'Draft in Progress', 'Generated', 'Sent', 'Signed', 'Completed', 'Cancelled'] as ContractStatus[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select
            label="Payment"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as PaymentStatus | '')}
            className="w-full lg:w-36"
          >
            <option value="">All</option>
            {(['Unpaid', 'Pay Link Clicked', 'Deposit Paid', 'Partial', 'Paid', 'Overdue'] as PaymentStatus[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select
            label="Deadlines"
            value={deadlineFilter}
            onChange={(e) => setDeadlineFilter(e.target.value as typeof deadlineFilter)}
            className="w-full lg:w-36"
          >
            <option value="all">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="overdue">Overdue</option>
          </Select>
          <Select
            label="Type"
            value={clientTypeFilter}
            onChange={(e) => setClientTypeFilter(e.target.value as typeof clientTypeFilter)}
            className="w-full lg:w-36"
          >
            <option value="all">All</option>
            <option value="clients">Clients</option>
            <option value="pending">Pending Clients</option>
          </Select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={clients.length === 0 ? 'No clients yet' : 'No matching clients'}
          description={
            clients.length === 0
              ? 'Add your first client to get started.'
              : 'Try adjusting your search or filters.'
          }
          action={
            clients.length === 0 ? (
              <Button onClick={() => setAddOpen(true)}>Add Client</Button>
            ) : undefined
          }
        />
      ) : (
        <ClientTable clients={filtered} fullWidth />
      )}

      <p className="mt-4 text-sm text-ink-muted">
        Showing {filtered.length} of {clients.length} in roster ({officialCount}{' '}
        {officialCount === 1 ? 'client' : 'clients'}, {pendingCount} pending)
      </p>

      <AddClientModal open={addOpen} onClose={() => setAddOpen(false)} />
      <ClientAccountsModal
        open={accountsOpen}
        onClose={() => setAccountsOpen(false)}
        onChanged={refresh}
      />
    </div>
  )
}
