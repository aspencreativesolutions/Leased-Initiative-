import type { Client } from '@/types'

export type DashboardFilter = 'clients' | 'pending' | 'active' | 'contracts' | 'due'

const PENDING_CONTRACT_STATUSES = [
  'Not Started',
  'Draft in Progress',
  'Generated',
  'Sent',
] as const

export function matchesDashboardFilter(client: Client, filter: DashboardFilter): boolean {
  switch (filter) {
    case 'clients':
      return client.isOfficialClient
    case 'pending':
      return !client.isOfficialClient
    case 'active':
      return client.projectStatus === 'In Progress' || client.projectStatus === 'Contract Sent'
    case 'contracts':
      return PENDING_CONTRACT_STATUSES.includes(
        client.contractStatus as (typeof PENDING_CONTRACT_STATUSES)[number]
      )
    case 'due':
      return hasOpenDeadlines(client)
    default:
      return true
  }
}

export function hasOpenDeadlines(client: Client): boolean {
  if (client.followUpDate) return true
  return client.deadlines.some((d) => !d.completed)
}

export function filterClientsForDashboard(
  clients: Client[],
  filter: DashboardFilter | null
): Client[] {
  if (!filter) return clients
  return clients.filter((client) => matchesDashboardFilter(client, filter))
}

export function dashboardFilterShowsClients(filter: DashboardFilter | null): boolean {
  return filter === null || filter !== 'due'
}

export function dashboardFilterShowsDeadlines(filter: DashboardFilter | null): boolean {
  return filter === null || filter === 'due'
}

export function dashboardFilterShowsTimelineNotes(filter: DashboardFilter | null): boolean {
  return filter === null
}

export const DASHBOARD_FILTER_LABELS: Record<DashboardFilter, string> = {
  clients: 'Official clients',
  pending: 'Pending clients',
  active: 'Active projects',
  contracts: 'Pending contracts',
  due: 'Upcoming deadlines',
}
