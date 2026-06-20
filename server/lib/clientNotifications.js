import { generateId } from './notifications.js'

export function pushClientNotification(store, notification) {
  const { userId, type, relatedId } = notification
  if (relatedId) {
    const duplicate = (store.clientNotifications ?? []).find(
      (n) =>
        n.userId === userId &&
        n.type === type &&
        n.relatedId === relatedId &&
        !n.read
    )
    if (duplicate) return store
  }

  const entry = {
    id: generateId(),
    read: false,
    createdAt: new Date().toISOString(),
    ...notification,
  }

  const list = [entry, ...(store.clientNotifications ?? [])].slice(0, 200)
  return { ...store, clientNotifications: list }
}

export function getClientUserForClient(store, client) {
  if (!client) return null
  if (client.accountUserId) {
    return store.users.find((u) => u.id === client.accountUserId) ?? null
  }
  const email = client.email?.trim().toLowerCase()
  if (!email) return null
  return (
    store.users.find(
      (u) => u.role === 'client' && u.email.trim().toLowerCase() === email
    ) ?? null
  )
}

export function notifyClientByClientId(store, clientId, notification) {
  const client = store.clients.find((c) => c.id === clientId)
  if (!client) return store
  const user = getClientUserForClient(store, client)
  if (!user) return store
  return pushClientNotification(store, {
    ...notification,
    userId: user.id,
    clientId,
  })
}

export function getClientNotificationsForUser(store, userId, { unreadOnly = false } = {}) {
  let list = (store.clientNotifications ?? []).filter((n) => n.userId === userId)
  if (unreadOnly) list = list.filter((n) => !n.read)
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}
