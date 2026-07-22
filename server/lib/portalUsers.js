import { buildProjectTimeline } from './projectTimeline.js'

export function isPendingPortalRegistration(user) {
  return (
    user?.role === 'client' &&
    !user.clientId &&
    !user.registrationDismissed
  )
}

export function resolveClientTimelineStage(client, contract) {
  const steps = buildProjectTimeline(client, contract ?? null)
  const active = steps.find((s) => s.status === 'active')
  if (active) {
    return { id: active.id, label: active.label }
  }
  const completed = steps.filter((s) => s.status === 'completed')
  if (completed.length > 0) {
    const last = completed[completed.length - 1]
    return { id: last.id, label: last.label }
  }
  return { id: 'inquiry', label: 'Inquiry' }
}

export function buildPortalUsersOverview(store) {
  const handlerName = store.settings?.ownerName || 'Your Name'
  const handlerEmail = store.settings?.email || ''

  const pending = store.users
    .filter(isPendingPortalRegistration)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      preferredLeaseMonths: u.preferredLeaseMonths,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const accepted = store.users
    .filter((u) => u.role === 'client' && u.clientId)
    .map((u) => {
      const client = store.clients.find((c) => c.id === u.clientId)
      if (!client) return null
      const contract = store.contracts.find((c) => c.clientId === client.id)
      const stage = resolveClientTimelineStage(client, contract)
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        registeredAt: u.createdAt,
        clientId: client.id,
        clientName: client.name,
        projectName: client.projectName,
        isOfficialClient: Boolean(client.isOfficialClient),
        timelineStageId: stage.id,
        timelineStageLabel: stage.label,
        acceptedAt: client.createdAt,
        handlerName,
        handlerEmail,
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.acceptedAt).getTime() - new Date(a.acceptedAt).getTime())

  return {
    handlerName,
    handlerEmail,
    pending,
    accepted,
    pendingCount: pending.length,
    acceptedCount: accepted.length,
  }
}
