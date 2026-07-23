import { useEffect, useMemo, useState } from 'react'
import { Link2, Plus, Search, UserCog, Users } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { AddClientModal } from '@/components/clients/AddClientModal'
import { ClientAccountsModal } from '@/components/clients/ClientAccountsModal'
import { ClientTable } from '@/components/clients/ClientTable'
import { OfficialTenantsSortControls } from '@/components/clients/OfficialTenantsSortControls'
import { SendInviteModal } from '@/components/clients/SendInviteModal'
import { TenantPipelineSections } from '@/components/clients/TenantPipelineSections'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/FormField'
import { EmptyState } from '@/components/ui/EmptyState'
import { useApp } from '@/context/AppContext'
import {
  getClientServiceTier,
  getProjectStatusDisplayLabel,
  shouldShowInOfficialTenants,
} from '@/lib/clientUtils'
import {
  loadOfficialTenantLocationDisplayMode,
  saveOfficialTenantLocationDisplayMode,
  type OfficialTenantLocationDisplayMode,
} from '@/lib/officialTenantLocationDisplay'
import {
  sortOfficialTenants,
  type OfficialTenantAddressFocus,
  type OfficialTenantSortMode,
} from '@/lib/officialTenantSort'
import { SERVICE_TIERS } from '@/lib/serviceTiers'
import type { ContractStatus, PaymentStatus, ProjectStatus, ServiceTier } from '@/types'

const compactFilterSelectClass = [
  'shrink-0 w-[4.75rem]',
  '[&_label]:mb-0.5 [&_label_span]:text-[8px] [&_label_span]:leading-tight',
  '[&_select]:w-full [&_select]:py-1 [&_select]:pl-1.5 [&_select]:pr-4 [&_select]:text-[10px]',
  '[&_select]:appearance-none [&_select]:bg-no-repeat [&_select]:bg-[length:0.55rem_0.55rem] [&_select]:bg-[position:right_0.2rem_center]',
  '[&_select]:bg-[url(\'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%23737373" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="m6 9 6 6 6-6"/%3E%3C/svg%3E\')]',
].join(' ')

export function ClientsPage() {
  const { clients, refresh, getContractForClient, settings, properties } = useApp()
  const location = useLocation()
  const [addOpen, setAddOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [accountsOpen, setAccountsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState<ProjectStatus | ''>('')
  const [contractFilter, setContractFilter] = useState<ContractStatus | ''>('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | ''>('')
  const [tierFilter, setTierFilter] = useState<ServiceTier | ''>('')
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'upcoming' | 'overdue'>('all')
  const [sortMode, setSortMode] = useState<OfficialTenantSortMode>('officialDate')
  const [addressFocus, setAddressFocus] = useState<OfficialTenantAddressFocus>({ kind: 'all' })
  const [locationDisplayMode, setLocationDisplayMode] = useState<OfficialTenantLocationDisplayMode>(
    loadOfficialTenantLocationDisplayMode
  )

  useEffect(() => {
    if (!location.hash) return
    const targetId = location.hash.slice(1)
    if (!targetId) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.hash, clients.length])

  const regions = settings.contractRegions ?? []

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const today = new Date().toISOString().split('T')[0]

    const matched = clients.filter((c) => {
      if (!shouldShowInOfficialTenants(c, getContractForClient(c.id))) return false

      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.businessName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.projectName.toLowerCase().includes(q)

      const matchesProject = !projectFilter || c.projectStatus === projectFilter
      const matchesContract = !contractFilter || c.contractStatus === contractFilter
      const matchesPayment = !paymentFilter || c.paymentStatus === paymentFilter
      const matchesTier =
        !tierFilter ||
        getClientServiceTier(c, getContractForClient(c.id)) === tierFilter

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

      return (
        matchesSearch &&
        matchesProject &&
        matchesContract &&
        matchesPayment &&
        matchesTier &&
        matchesDeadline
      )
    })

    return sortOfficialTenants(
      matched,
      getContractForClient,
      regions,
      sortMode === 'officialDate'
        ? { mode: 'officialDate' }
        : { mode: 'address', focus: addressFocus },
      { properties, locationDisplayMode }
    )
  }, [
    clients,
    search,
    projectFilter,
    contractFilter,
    paymentFilter,
    tierFilter,
    deadlineFilter,
    getContractForClient,
    regions,
    sortMode,
    addressFocus,
    properties,
    locationDisplayMode,
  ])

  const actualTenants = useMemo(
    () =>
      clients.filter((c) => shouldShowInOfficialTenants(c, getContractForClient(c.id))),
    [clients, getContractForClient],
  )

  return (
    <div className="w-full min-w-0">
      <div className="mb-5 border-b-[length:var(--border-width)] border-ink pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="heading-display text-2xl sm:text-3xl">Tenants</h1>
            <p className="mt-0.5 text-sm text-ink-muted">
              Review Official Tenants, Waiting to Connect, and Pending Tenants in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Sends a link so they can register. They’ll appear under Waiting to Connect, already linked to your company."
              onClick={() => setInviteOpen(true)}
            >
              <Link2 className="h-4 w-4" />
              Send Invite
            </Button>
            <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Tenant
            </Button>
          </div>
        </div>
      </div>

      <section data-onboarding="tenants-directory" className="pb-8">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <Users className="h-4 w-4 text-ink-muted" />
              <h2 className="heading-display text-lg">Official Tenants</h2>
            </div>
            <p className="text-sm text-ink-muted">
              Search and filter tenants with signed leases that are active or starting soon.
            </p>
          </div>

          <Card className="w-full shrink-0 p-3 lg:w-auto" padding="none">
            <div className="flex min-w-0 flex-col gap-2.5">
              <OfficialTenantsSortControls
                clients={actualTenants}
                getContractForClient={getContractForClient}
                regions={regions}
                properties={properties}
                sortMode={sortMode}
                addressFocus={addressFocus}
                onSortModeChange={setSortMode}
                onAddressFocusChange={setAddressFocus}
              />
              <div className="flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2.5 xl:flex-nowrap">
              <div className="w-full shrink-0 sm:w-36">
                <label className="mb-0.5 block text-[8px] font-semibold uppercase tracking-caps text-ink-faint">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-faint" />
                  <input
                    type="search"
                    placeholder="Search tenants..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-sm border-2 border-line bg-surface-paper py-1 pl-7 pr-2 text-[10px] text-ink focus:border-ink focus:outline-none"
                  />
                </div>
              </div>
              <Select
                label="Lease Status"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value as ProjectStatus | '')}
                className={compactFilterSelectClass}
              >
                <option value="">All</option>
                {(['Inquiry', 'In Progress', 'Contract Sent', 'Contract Signed', 'Completed', 'Follow-Up Needed'] as ProjectStatus[]).map((s) => (
                  <option key={s} value={s}>{getProjectStatusDisplayLabel(s)}</option>
                ))}
              </Select>
              <Select
                label="Lease Progress"
                value={contractFilter}
                onChange={(e) => setContractFilter(e.target.value as ContractStatus | '')}
                className={compactFilterSelectClass}
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
                className={compactFilterSelectClass}
              >
                <option value="">All</option>
                {(['Unpaid', 'Pay Link Clicked', 'Deposit Paid', 'Partial', 'Paid', 'Overdue'] as PaymentStatus[]).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              <Select
                label="Project Tier"
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value as ServiceTier | '')}
                className={compactFilterSelectClass}
              >
                <option value="">All</option>
                {SERVICE_TIERS.map((tier) => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
              </Select>
              <Select
                label="Deadlines"
                value={deadlineFilter}
                onChange={(e) => setDeadlineFilter(e.target.value as typeof deadlineFilter)}
                className={compactFilterSelectClass}
              >
                <option value="all">All</option>
                <option value="upcoming">Upcoming</option>
                <option value="overdue">Overdue</option>
              </Select>
              </div>
            </div>
          </Card>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={actualTenants.length === 0 ? 'No official tenants yet' : 'No matching tenants'}
            description={
              actualTenants.length === 0
                ? 'Tenants appear here once their lease is signed.'
                : 'Try adjusting your search or filters.'
            }
          />
        ) : (
          <ClientTable
            clients={filtered}
            locationDisplayMode={locationDisplayMode}
            onLocationDisplayModeChange={(mode) => {
              saveOfficialTenantLocationDisplayMode(mode)
              setLocationDisplayMode(mode)
            }}
          />
        )}
      </section>

      <TenantPipelineSections pendingSectionTitle="Pending Tenants" />

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => setAccountsOpen(true)}>
          <UserCog className="h-4 w-4" />
          Tenant Accounts
        </Button>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      <AddClientModal open={addOpen} onClose={() => setAddOpen(false)} />
      <SendInviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <ClientAccountsModal
        open={accountsOpen}
        onClose={() => setAccountsOpen(false)}
        onChanged={refresh}
      />
    </div>
  )
}
