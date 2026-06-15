export const SAMPLE_CLIENT_EMAILS = new Set([
  'sarah@bloombotanicals.com',
  'james@chenarch.com',
  'emily@rodriguezwellness.com',
  'marcus@webblegal.com',
  'lisa@parkphoto.com',
])

/** Days-from-today offsets for each sample client — keeps demo deadlines in the future */
const SAMPLE_SCHEDULES = {
  'sarah@bloombotanicals.com': {
    followUpDate: 5,
    deadlines: [7, 30],
  },
  'james@chenarch.com': {
    followUpDate: null,
    deadlines: [2, 6],
  },
  'emily@rodriguezwellness.com': {
    followUpDate: 9,
    deadlines: [9],
  },
  'lisa@parkphoto.com': {
    followUpDate: 4,
    deadlines: [12],
    paymentStatus: 'Unpaid',
  },
}

function daysFromNow(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function isSampleClient(client) {
  const email = client.email?.trim().toLowerCase()
  return Boolean(client.isSampleClient || (email && SAMPLE_CLIENT_EMAILS.has(email)))
}

export function refreshSampleClientDates(client) {
  if (!isSampleClient(client)) return { client, changed: false }

  const email = client.email.trim().toLowerCase()
  const schedule = SAMPLE_SCHEDULES[email]
  let changed = false
  const next = { ...client }

  const followUpOffset = schedule?.followUpDate ?? 5
  if (next.followUpDate) {
    const refreshed = daysFromNow(followUpOffset)
    if (next.followUpDate !== refreshed) {
      next.followUpDate = refreshed
      changed = true
    }
  }

  if (next.deadlines?.length) {
    const offsets = schedule?.deadlines ?? next.deadlines.map((_, i) => 3 + i * 7)
    next.deadlines = next.deadlines.map((deadline, index) => {
      if (deadline.completed) return deadline
      const offset = offsets[index] ?? 7 + index * 7
      const refreshed = daysFromNow(offset)
      if (deadline.date === refreshed) return deadline
      changed = true
      return { ...deadline, date: refreshed }
    })
  }

  if (schedule?.paymentStatus && next.paymentStatus !== schedule.paymentStatus) {
    next.paymentStatus = schedule.paymentStatus
    changed = true
  }

  return { client: next, changed }
}

export function refreshAllSampleClientDates(clients) {
  let changed = false
  const nextClients = clients.map((client) => {
    const result = refreshSampleClientDates(client)
    if (result.changed) changed = true
    return result.client
  })
  return { clients: nextClients, changed }
}
