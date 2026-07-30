import { generateId } from './notifications.js'

export const DEFAULT_CONDITION_REPORT_PREFERENCES = {
  required: true,
  moveInDays: 7,
  moveOutDays: 7,
}

const CLAUSE_START = 'Condition Report.'

export const DEFAULT_CONDITION_CHECKLIST = [
  { area: 'Entry / Living', label: 'Walls & ceilings' },
  { area: 'Entry / Living', label: 'Floors & carpets' },
  { area: 'Entry / Living', label: 'Windows' },
  { area: 'Entry / Living', label: 'Blinds / curtains' },
  { area: 'Entry / Living', label: 'Lights & fixtures' },
  { area: 'Entry / Living', label: 'Doors & locks' },
  { area: 'Kitchen', label: 'Counters & cabinets' },
  { area: 'Kitchen', label: 'Sink & faucet' },
  { area: 'Kitchen', label: 'Appliances' },
  { area: 'Kitchen', label: 'Floors' },
  { area: 'Bathroom', label: 'Toilet' },
  { area: 'Bathroom', label: 'Sink & vanity' },
  { area: 'Bathroom', label: 'Shower / tub' },
  { area: 'Bathroom', label: 'Floors & tiles' },
  { area: 'Bedroom', label: 'Walls & floors' },
  { area: 'Bedroom', label: 'Windows & closets' },
  { area: 'Utilities', label: 'Heating / cooling' },
  { area: 'Utilities', label: 'Smoke / CO detectors' },
  { area: 'Utilities', label: 'Electrical outlets' },
  { area: 'General', label: 'Overall cleanliness' },
  { area: 'General', label: 'Keys, fobs & remotes' },
]

export const CONDITION_ITEM_RATINGS = [
  'good',
  'fair',
  'poor',
  'damaged',
  'not_applicable',
]

export function getConditionReportPreferences(settings) {
  const raw = settings?.conditionReport
  const moveIn = Number(raw?.moveInDays)
  const moveOut = Number(raw?.moveOutDays)
  const custom = String(raw?.clauseWording ?? '').trim()
  return {
    required: raw?.required !== false,
    moveInDays:
      Number.isFinite(moveIn) && moveIn >= 1
        ? Math.min(90, Math.round(moveIn))
        : DEFAULT_CONDITION_REPORT_PREFERENCES.moveInDays,
    moveOutDays:
      Number.isFinite(moveOut) && moveOut >= 1
        ? Math.min(90, Math.round(moveOut))
        : DEFAULT_CONDITION_REPORT_PREFERENCES.moveOutDays,
    clauseWording: custom || undefined,
  }
}

export function isConditionReportRequired(settings, property) {
  if (property?.conditionReportRequired === true) return true
  if (property?.conditionReportRequired === false) return false
  return getConditionReportPreferences(settings).required
}

export function buildConditionReportClause(prefs) {
  if (!prefs?.required) {
    const optional =
      `${CLAUSE_START} Tenant is encouraged to complete move-in and move-out condition reports ` +
      `(inspection checklists) electronically so both parties have a record of the property’s condition.`
    const custom = String(prefs?.clauseWording ?? '').trim()
    if (custom) {
      return custom.startsWith(CLAUSE_START) ? custom : `${CLAUSE_START} ${custom}`
    }
    return optional
  }
  const custom = String(prefs.clauseWording ?? '').trim()
  if (custom) {
    return custom.startsWith(CLAUSE_START) ? custom : `${CLAUSE_START} ${custom}`
  }
  const daysIn = prefs.moveInDays
  const daysOut = prefs.moveOutDays
  return (
    `${CLAUSE_START} Tenant must complete a move-in condition report within ${daysIn} ` +
    `${daysIn === 1 ? 'day' : 'days'} after lease start, and a move-out condition report within ` +
    `${daysOut} ${daysOut === 1 ? 'day' : 'days'} before lease end. Reports are submitted ` +
    `electronically for landlord review.`
  )
}

export function stripConditionReportClause(text) {
  const raw = String(text ?? '')
  const idx = raw.indexOf(CLAUSE_START)
  if (idx < 0) return raw.trim()
  return raw.slice(0, idx).trim()
}

export function withConditionReportClause(existingTerms, prefs) {
  const base = stripConditionReportClause(existingTerms ?? '')
  const clause = buildConditionReportClause(prefs)
  return base ? `${base}\n\n${clause}` : clause
}

export function buildDefaultChecklistItems() {
  return DEFAULT_CONDITION_CHECKLIST.map((entry) => ({
    id: generateId(),
    area: entry.area,
    label: entry.label,
    condition: null,
    notes: '',
    photoFileIds: [],
  }))
}

export function conditionReportKindLabel(kind) {
  return kind === 'move_in' ? 'Move-In' : 'Move-Out'
}

function addDaysToYmd(ymd, days) {
  const d = new Date(`${String(ymd).slice(0, 10)}T12:00:00`)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isUsableLeaseDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value.trim())
}

export function dueDateForKind(kind, leaseStartDate, leaseEndDate, prefs) {
  if (kind === 'move_in' && isUsableLeaseDate(leaseStartDate)) {
    return addDaysToYmd(leaseStartDate, prefs.moveInDays)
  }
  if (kind === 'move_out' && isUsableLeaseDate(leaseEndDate)) {
    return addDaysToYmd(leaseEndDate, -prefs.moveOutDays)
  }
  return undefined
}

function createReportSkeleton({ clientId, propertyId, kind, dueDate }) {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    clientId,
    ...(propertyId ? { propertyId } : {}),
    kind,
    status: 'pending',
    ...(dueDate ? { dueDate } : {}),
    items: buildDefaultChecklistItems(),
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Ensure move-in and move-out reports exist for an official client with lease dates.
 * Returns { store, reports } — store may be unchanged.
 */
export function ensureConditionReportsForClient(store, client, contract) {
  if (!client?.id || !client.isOfficialClient) {
    return { store, reports: (store.conditionReports ?? []).filter((r) => r.clientId === client?.id) }
  }

  const leaseStart = isUsableLeaseDate(contract?.startDate)
    ? String(contract.startDate).slice(0, 10)
    : null
  const leaseEnd = isUsableLeaseDate(contract?.completionDate)
    ? String(contract.completionDate).slice(0, 10)
    : null
  if (!leaseStart && !leaseEnd) {
    return { store, reports: (store.conditionReports ?? []).filter((r) => r.clientId === client.id) }
  }

  const prefs = getConditionReportPreferences(store.settings)
  const property = client.propertyId
    ? (store.properties ?? []).find((p) => p.id === client.propertyId)
    : null
  const existing = store.conditionReports ?? []
  const clientReports = existing.filter((r) => r.clientId === client.id)
  const additions = []

  for (const kind of ['move_in', 'move_out']) {
    if (clientReports.some((r) => r.kind === kind)) continue
    if (kind === 'move_in' && !leaseStart) continue
    if (kind === 'move_out' && !leaseEnd) continue
    additions.push(
      createReportSkeleton({
        clientId: client.id,
        propertyId: client.propertyId || property?.id,
        kind,
        dueDate: dueDateForKind(kind, leaseStart, leaseEnd, prefs),
      })
    )
  }

  if (additions.length === 0) {
    return { store, reports: clientReports }
  }

  const next = {
    ...store,
    conditionReports: [...additions, ...existing],
  }
  return {
    store: next,
    reports: [...additions, ...clientReports],
  }
}

export function summarizeConditionReports(reports, required) {
  return (reports ?? []).map((r) => ({
    id: r.id,
    kind: r.kind,
    status: r.status,
    dueDate: r.dueDate,
    required: Boolean(required),
    submittedAt: r.submittedAt,
    reviewedAt: r.reviewedAt,
    landlordNotes: r.landlordNotes,
  }))
}

export function isChecklistComplete(items) {
  return Array.isArray(items) && items.length > 0 && items.every((item) => item.condition != null)
}

export function normalizeSubmittedItems(existingItems, incomingItems) {
  if (!Array.isArray(incomingItems)) return null
  const byId = new Map(existingItems.map((item) => [item.id, item]))
  const next = []
  for (const raw of incomingItems) {
    const id = String(raw?.id ?? '').trim()
    const existing = byId.get(id)
    if (!existing) continue
    const condition = String(raw?.condition ?? '').trim()
    if (!CONDITION_ITEM_RATINGS.includes(condition)) return null
    next.push({
      ...existing,
      condition,
      notes: typeof raw?.notes === 'string' ? raw.notes.trim().slice(0, 2000) : existing.notes ?? '',
      photoFileIds: Array.isArray(raw?.photoFileIds)
        ? raw.photoFileIds.map(String).filter(Boolean)
        : existing.photoFileIds ?? [],
    })
  }
  if (next.length !== existingItems.length) return null
  return next
}
