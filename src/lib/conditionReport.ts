import type {
  BusinessSettings,
  ConditionItemRating,
  ConditionReport,
  ConditionReportItem,
  ConditionReportKind,
  ConditionReportPreferences,
  Property,
} from '@/types'

export const DEFAULT_CONDITION_REPORT_PREFERENCES: ConditionReportPreferences = {
  required: true,
  moveInDays: 7,
  moveOutDays: 7,
}

const CLAUSE_START = 'Condition Report.'

export const DEFAULT_CONDITION_REPORT_CLAUSE =
  `${CLAUSE_START} Tenant must complete a move-in condition report (inspection checklist) ` +
  `within the landlord’s required timeframe after lease start, and a move-out condition report ` +
  `before lease end. Reports are submitted electronically for landlord review.`

export const CONDITION_ITEM_RATINGS: {
  value: ConditionItemRating
  label: string
}[] = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'not_applicable', label: 'N/A' },
]

/** Default checklist areas/items for every rental condition report. */
export const DEFAULT_CONDITION_CHECKLIST: { area: string; label: string }[] = [
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

export function getConditionReportPreferences(
  settings?:
    | Pick<BusinessSettings, 'conditionReport'>
    | { conditionReport?: Partial<ConditionReportPreferences> | null }
    | null
): ConditionReportPreferences {
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

/**
 * Resolve whether condition reports are required for a rental.
 * Property override wins when explicitly set; otherwise account default.
 */
export function isConditionReportRequired(
  settings?:
    | Pick<BusinessSettings, 'conditionReport'>
    | { conditionReport?: Partial<ConditionReportPreferences> | null }
    | null,
  property?: Pick<Property, 'conditionReportRequired'> | null
): boolean {
  if (property?.conditionReportRequired === true) return true
  if (property?.conditionReportRequired === false) return false
  return getConditionReportPreferences(settings).required
}

export function buildConditionReportClause(prefs: ConditionReportPreferences): string {
  if (!prefs.required) {
    const optional =
      `${CLAUSE_START} Tenant is encouraged to complete move-in and move-out condition reports ` +
      `(inspection checklists) electronically so both parties have a record of the property’s condition.`
    const custom = prefs.clauseWording?.trim()
    if (custom) {
      return custom.startsWith(CLAUSE_START) ? custom : `${CLAUSE_START} ${custom}`
    }
    return optional
  }
  const custom = prefs.clauseWording?.trim()
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

export function stripConditionReportClause(text: string): string {
  const raw = String(text ?? '')
  const idx = raw.indexOf(CLAUSE_START)
  if (idx < 0) return raw.trim()
  return raw.slice(0, idx).trim()
}

export function withConditionReportClause(
  existingTerms: string | undefined,
  prefs: ConditionReportPreferences
): string {
  const base = stripConditionReportClause(existingTerms ?? '')
  const clause = buildConditionReportClause(prefs)
  return base ? `${base}\n\n${clause}` : clause
}

export function buildDefaultChecklistItems(
  generateId: () => string
): ConditionReportItem[] {
  return DEFAULT_CONDITION_CHECKLIST.map((entry) => ({
    id: generateId(),
    area: entry.area,
    label: entry.label,
    condition: null,
    notes: '',
    photoFileIds: [],
  }))
}

export function conditionReportKindLabel(kind: ConditionReportKind): string {
  return kind === 'move_in' ? 'Move-In' : 'Move-Out'
}

export function conditionReportStatusLabel(status: ConditionReport['status']): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'submitted':
      return 'Submitted'
    case 'approved':
      return 'Approved'
    case 'changes_requested':
      return 'Changes requested'
    default:
      return status
  }
}

export function isChecklistComplete(items: ConditionReportItem[]): boolean {
  return items.every((item) => item.condition != null)
}

export function addDaysToYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd.slice(0, 10)}T12:00:00`)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function subtractDaysFromYmd(ymd: string, days: number): string {
  return addDaysToYmd(ymd, -days)
}
