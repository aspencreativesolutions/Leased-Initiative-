export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function pushAdminNotification(store, notification) {
  const entry = {
    id: generateId(),
    read: false,
    createdAt: new Date().toISOString(),
    ...notification,
  }
  return {
    ...store,
    adminNotifications: [entry, ...(store.adminNotifications ?? [])],
  }
}
