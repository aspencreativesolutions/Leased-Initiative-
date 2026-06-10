import fs from 'fs'
import path from 'path'
import { UPLOADS_DIR } from './uploads.js'

export function deleteClientUploads(clientId) {
  const dir = path.join(UPLOADS_DIR, clientId)
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

/** Remove client roster data; unlink portal users but keep accounts */
export function removeClientFromStore(store, clientId) {
  const client = store.clients.find((c) => c.id === clientId)
  if (!client) return null

  return {
    ...store,
    users: store.users.map((u) =>
      u.clientId === clientId ? { ...u, clientId: null } : u
    ),
    clients: store.clients.filter((c) => c.id !== clientId),
    contracts: store.contracts.filter((c) => c.clientId !== clientId),
    projectFiles: (store.projectFiles ?? []).filter((f) => f.clientId !== clientId),
    adminNotifications: (store.adminNotifications ?? []).filter(
      (n) => n.clientId !== clientId
    ),
  }
}

/** Delete portal account and linked client roster entry */
export function deleteClientAccountFromStore(store, userId) {
  const user = store.users.find((u) => u.id === userId && u.role === 'client')
  if (!user) return null

  let next = store
  if (user.clientId) {
    next = removeClientFromStore(next, user.clientId)
    deleteClientUploads(user.clientId)
  }

  return {
    ...next,
    users: next.users.filter((u) => u.id !== userId),
    adminNotifications: (next.adminNotifications ?? []).filter(
      (n) => n.userId !== userId
    ),
  }
}
