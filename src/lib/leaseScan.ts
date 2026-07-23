/**
 * Client-side lease document scan: extract text from PDFs / plain text / CSV,
 * then pull tenant name, address, rent, and lease dates with heuristics.
 * Progressive events power the live scanning UI.
 */

export type FieldConfidence = 'high' | 'review' | 'low' | 'missing'

export type ScanFieldKey =
  | 'tenantName'
  | 'address'
  | 'rentAmount'
  | 'leaseStartDate'
  | 'leaseLengthMonths'
  | 'leaseEndDate'
  | 'nextPaymentDueDate'
  | 'email'
  | 'phone'

export interface ScannedLeaseFields {
  tenantName: string
  address: string
  rentAmount: string
  leaseStartDate: string
  leaseEndDate: string
  leaseLengthMonths: number | null
  nextPaymentDueDate: string
  email: string
  phone: string
}

export interface ScannedLeaseRow extends ScannedLeaseFields {
  id: string
  sourceFileName: string
  sourceFileNames: string[]
  confidence: 'high' | 'medium' | 'low'
  fieldConfidence: Record<ScanFieldKey, FieldConfidence>
  /** Set when another row looks similar but was not auto-merged */
  possibleDuplicateOf?: string
}

export type ScanProgressEvent =
  | {
      type: 'file-start'
      fileName: string
      index: number
      total: number
    }
  | {
      type: 'file-done'
      fileName: string
      index: number
      total: number
    }
  | {
      type: 'row-created'
      row: ScannedLeaseRow
      pendingFields: ScanFieldKey[]
    }
  | {
      type: 'field-update'
      rowId: string
      field: ScanFieldKey
      value: string | number | null
      confidence: FieldConfidence
      sourceFileName?: string
    }
  | {
      type: 'row-complete'
      rowId: string
      row: ScannedLeaseRow
    }
  | {
      type: 'batch-complete'
      rows: ScannedLeaseRow[]
      filesProcessed: number
      recordsFound: number
    }

export const SCAN_FIELD_KEYS: ScanFieldKey[] = [
  'tenantName',
  'address',
  'rentAmount',
  'leaseStartDate',
  'leaseLengthMonths',
  'leaseEndDate',
  'nextPaymentDueDate',
  'email',
  'phone',
]

const MONTH_MAP: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
}

const LANDLORD_NOISE =
  /\b(landlord|lessor|property\s+manager|management\s+company|owner\s+of\s+record|management\s+office)\b/i

const VENDOR_NOISE =
  /\b(invoice|vendor|contractor|insurance|inspection|maintenance|emergency\s+contact|one[\s-]?time\s+fee|office\s+expense|hoa\s+fee)\b/i

const DEPOSIT_NOISE =
  /\b(security\s+deposit|pet\s+deposit|key\s+deposit|holding\s+deposit|last\s+month'?s?\s+rent)\b/i

const MAX_LEASE_IMPORT_BYTES = 25 * 1024 * 1024

const ALLOWED_LEASE_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.jpg',
  '.jpeg',
  '.png',
  '.csv',
  '.txt',
  '.md',
  '.xls',
  '.xlsx',
  '.webp',
])

function decodePdfEscape(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
}

/** Pull readable strings from PDF content streams (no external PDF lib). */
export function extractTextFromPdfBytes(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }

  const parts: string[] = []

  const literalRe = /\((?:\\.|[^\\)])*\)\s*Tj/g
  for (const match of binary.matchAll(literalRe)) {
    const inner = match[0].slice(1, match[0].lastIndexOf(')'))
    const text = decodePdfEscape(inner).trim()
    if (text) parts.push(text)
  }

  const arrayRe = /\[(.*?)\]\s*TJ/gs
  for (const match of binary.matchAll(arrayRe)) {
    const chunkText: string[] = []
    const innerLiterals = match[1].matchAll(/\((?:\\.|[^\\)])*\)/g)
    for (const lit of innerLiterals) {
      const inner = lit[0].slice(1, -1)
      chunkText.push(decodePdfEscape(inner))
    }
    const joined = chunkText.join('').trim()
    if (joined) parts.push(joined)
  }

  if (parts.length < 4) {
    const runs = binary.match(/[\x20-\x7E]{6,}/g) ?? []
    for (const run of runs) {
      if (/[A-Za-z]{3,}/.test(run) && !/obj|endobj|stream|xref/.test(run)) {
        parts.push(run)
      }
    }
  }

  return parts.join('\n').replace(/\u0000/g, '')
}

export function getLeaseFileExtension(fileName: string): string {
  const match = fileName.toLowerCase().match(/(\.[a-z0-9]+)$/)
  return match?.[1] ?? ''
}

export function isAllowedLeaseImportFile(file: File): { ok: true } | { ok: false; reason: string } {
  const ext = getLeaseFileExtension(file.name)
  if (!ext || !ALLOWED_LEASE_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      reason: `${file.name}: unsupported file type. Use PDF, Word, images, CSV, or spreadsheets.`,
    }
  }
  if (file.size <= 0) {
    return { ok: false, reason: `${file.name}: file is empty` }
  }
  if (file.size > MAX_LEASE_IMPORT_BYTES) {
    return { ok: false, reason: `${file.name}: exceeds the 25 MB limit` }
  }
  return { ok: true }
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function fileTypeLabel(fileName: string, mimeType = ''): string {
  const ext = getLeaseFileExtension(fileName).replace('.', '').toUpperCase()
  if (ext) return ext
  if (mimeType.includes('pdf')) return 'PDF'
  if (mimeType.includes('image')) return 'IMAGE'
  if (mimeType.includes('csv') || mimeType.includes('sheet')) return 'CSV'
  return 'FILE'
}

async function readFileAsText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  const type = file.type

  if (
    type.startsWith('text/') ||
    name.endsWith('.txt') ||
    name.endsWith('.csv') ||
    name.endsWith('.md')
  ) {
    return file.text()
  }

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    const buffer = await file.arrayBuffer()
    return extractTextFromPdfBytes(new Uint8Array(buffer))
  }

  // Word / images / xlsx: no reliable OCR/binary parse here — empty text → editable blanks
  return ''
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')
}

function toIsoDate(raw: string): string {
  const cleaned = raw.trim().replace(/,/g, '')
  const iso = cleaned.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/)
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  }
  const us = cleaned.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)
  if (us) {
    let year = us[3]
    if (year.length === 2) year = Number(year) > 70 ? `19${year}` : `20${year}`
    return `${year}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`
  }
  const named = cleaned.match(
    /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+|,?\s*)(\d{4})$/
  )
  if (named) {
    const month = MONTH_MAP[named[1].toLowerCase()]
    if (month) return `${named[3]}-${month}-${named[2].padStart(2, '0')}`
  }
  return ''
}

function monthsBetween(startIso: string, endIso: string): number | null {
  if (!startIso || !endIso) return null
  const start = new Date(`${startIso}T12:00:00`)
  const end = new Date(`${endIso}T12:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null
  const days = (end.getTime() - start.getTime()) / 86_400_000
  return Math.max(1, Math.round(days / 30.4375))
}

function lineContext(text: string, matchIndex: number): string {
  const start = text.lastIndexOf('\n', matchIndex)
  const end = text.indexOf('\n', matchIndex)
  return text.slice(start === -1 ? 0 : start, end === -1 ? text.length : end)
}

function firstMatch(
  text: string,
  patterns: RegExp[],
  options?: { rejectIf?: (context: string, value: string) => boolean }
): string {
  for (const pattern of patterns) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
    const global = new RegExp(pattern.source, flags)
    for (const m of text.matchAll(global)) {
      const value = m[1]?.trim()
      if (!value) continue
      const context = lineContext(text, m.index ?? 0)
      if (options?.rejectIf?.(context, value)) continue
      return value
    }
  }
  return ''
}

function parseMoneyAmount(raw: string): string {
  const digits = raw.replace(/[^0-9.]/g, '')
  if (!digits) return ''
  const num = Number(digits)
  if (!Number.isFinite(num)) return raw.trim()
  return num.toFixed(2).replace(/\.00$/, '')
}

function rejectLandlordOrVendor(context: string): boolean {
  return LANDLORD_NOISE.test(context) || VENDOR_NOISE.test(context)
}

function rejectDepositRent(context: string): boolean {
  return DEPOSIT_NOISE.test(context)
}

function computeNextPaymentDue(leaseStartDate: string, explicitDue: string): string {
  if (explicitDue) return explicitDue
  if (!leaseStartDate) return ''
  const start = new Date(`${leaseStartDate}T12:00:00`)
  if (Number.isNaN(start.getTime())) return ''
  const dueDay = start.getDate()
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth()
  const candidate = new Date(year, month, Math.min(dueDay, 28), 12)
  // Prefer the next upcoming due date relative to today
  if (candidate.getTime() < now.getTime() - 12 * 60 * 60 * 1000) {
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }
  const next = new Date(year, month, Math.min(dueDay, daysInMonth(year, month)), 12)
  const y = next.getFullYear()
  const m = String(next.getMonth() + 1).padStart(2, '0')
  const d = String(next.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function emptyFields(): ScannedLeaseFields {
  return {
    tenantName: '',
    address: '',
    rentAmount: '',
    leaseStartDate: '',
    leaseEndDate: '',
    leaseLengthMonths: null,
    nextPaymentDueDate: '',
    email: '',
    phone: '',
  }
}

function buildFieldConfidence(
  fields: ScannedLeaseFields,
  hadText: boolean
): Record<ScanFieldKey, FieldConfidence> {
  const score = (value: string | number | null, weight: 'core' | 'contact'): FieldConfidence => {
    if (value == null || value === '') return 'missing'
    if (!hadText) return 'low'
    if (weight === 'contact') return 'review'
    return 'high'
  }

  return {
    tenantName: score(fields.tenantName, 'core'),
    address: score(fields.address, 'core'),
    rentAmount: score(fields.rentAmount, 'core'),
    leaseStartDate: score(fields.leaseStartDate, 'core'),
    leaseLengthMonths: score(fields.leaseLengthMonths, 'core'),
    leaseEndDate: score(fields.leaseEndDate, 'core'),
    nextPaymentDueDate: fields.nextPaymentDueDate
      ? fields.leaseStartDate && !hadText
        ? 'low'
        : 'review'
      : 'missing',
    email: score(fields.email, 'contact'),
    phone: score(fields.phone, 'contact'),
  }
}

function scoreConfidence(
  fields: ScannedLeaseFields,
  hadText: boolean
): ScannedLeaseRow['confidence'] {
  let hits = 0
  if (fields.tenantName) hits += 1
  if (fields.address) hits += 1
  if (fields.rentAmount) hits += 1
  if (fields.leaseStartDate) hits += 1
  if (fields.leaseEndDate || fields.leaseLengthMonths) hits += 1
  if (!hadText) return 'low'
  if (hits >= 4) return 'high'
  if (hits >= 2) return 'medium'
  return 'low'
}

/** Parse one lease block of text into structured fields. */
export function parseLeaseText(text: string, sourceFileName = 'lease'): ScannedLeaseFields {
  const normalized = normalizeWhitespace(text)
  if (!normalized.trim()) return emptyFields()

  const tenantName = firstMatch(
    normalized,
    [
      /(?:tenant(?:[ \t]*name)?|lessee|occupant)\s*[:\-][ \t]*([A-Z][A-Za-z'’\-]+(?:[ \t]+[A-Z][A-Za-z'’\-]+){0,3})/i,
      /(?:this[ \t]+lease[ \t]+(?:agreement[ \t]+)?is[ \t]+(?:made[ \t]+)?between.+?and)[ \t]+([A-Z][A-Za-z'’\-]+(?:[ \t]+[A-Z][A-Za-z'’\-]+){1,3})/i,
      /(?:renter|resident)\s*[:\-][ \t]*([A-Z][A-Za-z'’\-]+(?:[ \t]+[A-Z][A-Za-z'’\-]+){0,3})/i,
    ],
    {
      rejectIf: (context) =>
        rejectLandlordOrVendor(context) || /\bemergency\s+contact\b/i.test(context),
    }
  )

  const address = firstMatch(
    normalized,
    [
      /(?:premises|property|leased\s+(?:premises|property)|unit\s+address|address)\s*[:\-]\s*([^\n]{8,120})/i,
      /(\d{1,6}\s+[A-Za-z0-9.'’\-]+(?:\s+[A-Za-z0-9.'’\-]+){0,6}\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Ct|Court|Way|Pl|Place)\.?(?:\s*,?\s*[A-Za-z .]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)?)/i,
    ],
    {
      rejectIf: (context) =>
        /\b(landlord|billing|remit|management\s+office|corporate)\b/i.test(context),
    }
  ).replace(/\s+/g, ' ')

  const rentRaw = firstMatch(
    normalized,
    [
      /(?:monthly\s+rent|rent\s+amount|base\s+rent|rent)\s*(?:of|:)?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
      /\$\s*([\d,]+(?:\.\d{2})?)\s*(?:per\s+month|\/\s*mo(?:nth)?|monthly)/i,
    ],
    { rejectIf: (context) => rejectDepositRent(context) || rejectLandlordOrVendor(context) }
  )
  const rentAmount = rentRaw ? parseMoneyAmount(rentRaw) : ''

  const startRaw = firstMatch(
    normalized,
    [
      /(?:lease\s+start(?:\s*date)?|commencement(?:\s*date)?|start\s*date|beginning\s*date)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2})/i,
      /(?:from|starting)\s+([A-Za-z]+\s+\d{1,2},?\s*\d{4}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
    ],
    {
      rejectIf: (context) =>
        /\b(inspection|maintenance|insurance|renewal|emergency)\b/i.test(context),
    }
  )
  const endRaw = firstMatch(
    normalized,
    [
      /(?:lease\s+end(?:\s*date)?|expiration(?:\s*date)?|end\s*date|termination\s*date)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2})/i,
      /(?:through|until|ending)\s+([A-Za-z]+\s+\d{1,2},?\s*\d{4}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
    ],
    {
      rejectIf: (context) =>
        /\b(inspection|maintenance|insurance|renewal)\b/i.test(context),
    }
  )

  const leaseStartDate = toIsoDate(startRaw)
  const leaseEndDate = toIsoDate(endRaw)

  const lengthRaw = firstMatch(normalized, [
    /(?:lease\s+(?:term|length|period)|term\s+of)\s*[:\-]?\s*(\d{1,2})\s*(?:month|mo)/i,
    /(\d{1,2})\s*(?:month|mo)\s+(?:lease|term)/i,
  ])
  let leaseLengthMonths = lengthRaw ? Number(lengthRaw) : null
  if (!leaseLengthMonths || !Number.isFinite(leaseLengthMonths)) {
    leaseLengthMonths = monthsBetween(leaseStartDate, leaseEndDate)
  }

  const nextDueRaw = firstMatch(
    normalized,
    [
      /(?:next\s+(?:rent\s+)?(?:payment\s+)?due(?:\s*date)?|rent\s+due(?:\s*date)?|payment\s+due(?:\s*date)?)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2})/i,
    ],
    {
      rejectIf: (context) =>
        /\b(inspection|insurance|maintenance|deposit)\b/i.test(context),
    }
  )
  const nextPaymentDueDate = computeNextPaymentDue(leaseStartDate, toIsoDate(nextDueRaw))

  const email = firstMatch(
    normalized,
    [/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/],
    {
      rejectIf: (context) =>
        rejectLandlordOrVendor(context) || /\b(vendor|billing|noreply)\b/i.test(context),
    }
  ).toLowerCase()

  const phone = firstMatch(
    normalized,
    [
      /(?:phone|mobile|cell|tel)\s*[:\-]?\s*((?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i,
      /((?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/,
    ],
    {
      rejectIf: (context) =>
        rejectLandlordOrVendor(context) || /\bemergency\b/i.test(context),
    }
  )

  let nameFromFile = ''
  const base = sourceFileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
  const nameHint = base.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/)
  if (nameHint) nameFromFile = nameHint[1]

  return {
    tenantName: tenantName || nameFromFile,
    address,
    rentAmount,
    leaseStartDate,
    leaseEndDate,
    leaseLengthMonths,
    nextPaymentDueDate,
    email,
    phone,
  }
}

function splitLeaseBlocks(text: string): string[] {
  const normalized = normalizeWhitespace(text)
  if (!normalized.trim()) return ['']

  const parts = normalized.split(
    /\n(?=(?:lease\s+agreement|residential\s+lease|rental\s+agreement|tenant\s*[:\-]|lessee\s*[:\-]))/i
  )
  return parts.map((p) => p.trim()).filter(Boolean).length > 1
    ? parts.map((p) => p.trim()).filter(Boolean)
    : [normalized]
}

let rowSeq = 0
function nextRowId(): string {
  rowSeq += 1
  return `scan-${Date.now()}-${rowSeq}`
}

function toRow(
  fields: ScannedLeaseFields,
  sourceFileName: string,
  hadText: boolean,
  extra?: Partial<ScannedLeaseRow>
): ScannedLeaseRow {
  return {
    id: nextRowId(),
    sourceFileName,
    sourceFileNames: [sourceFileName],
    confidence: scoreConfidence(fields, hadText),
    fieldConfidence: buildFieldConfidence(fields, hadText),
    ...fields,
    ...extra,
  }
}

function fieldValue(row: ScannedLeaseRow, field: ScanFieldKey): string | number | null {
  if (field === 'leaseLengthMonths') return row.leaseLengthMonths
  return row[field]
}

function normalizeKeyPart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ')
}

function mergeFields(a: ScannedLeaseFields, b: ScannedLeaseFields): ScannedLeaseFields {
  return {
    tenantName: a.tenantName || b.tenantName,
    address: a.address || b.address,
    rentAmount: a.rentAmount || b.rentAmount,
    leaseStartDate: a.leaseStartDate || b.leaseStartDate,
    leaseEndDate: a.leaseEndDate || b.leaseEndDate,
    leaseLengthMonths: a.leaseLengthMonths ?? b.leaseLengthMonths,
    nextPaymentDueDate: a.nextPaymentDueDate || b.nextPaymentDueDate,
    email: a.email || b.email,
    phone: a.phone || b.phone,
  }
}

function preferConfidence(a: FieldConfidence, b: FieldConfidence): FieldConfidence {
  const rank: Record<FieldConfidence, number> = {
    high: 3,
    review: 2,
    low: 1,
    missing: 0,
  }
  return rank[a] >= rank[b] ? a : b
}

/** Merge clear duplicates; flag uncertain pairs for review. */
export function dedupeScannedRows(rows: ScannedLeaseRow[]): ScannedLeaseRow[] {
  const result: ScannedLeaseRow[] = []

  for (const row of rows) {
    const nameKey = normalizeKeyPart(row.tenantName)
    const addressKey = normalizeKeyPart(row.address)
    const emailKey = normalizeKeyPart(row.email)
    const phoneKey = row.phone.replace(/\D/g, '')

    let merged = false
    for (let i = 0; i < result.length; i++) {
      const existing = result[i]
      const existingName = normalizeKeyPart(existing.tenantName)
      const existingAddress = normalizeKeyPart(existing.address)
      const existingEmail = normalizeKeyPart(existing.email)
      const existingPhone = existing.phone.replace(/\D/g, '')

      const sameName = Boolean(nameKey && existingName && nameKey === existingName)
      const sameAddress = Boolean(addressKey && existingAddress && addressKey === existingAddress)
      const sameContact =
        (Boolean(emailKey && existingEmail && emailKey === existingEmail) ||
          (Boolean(phoneKey && existingPhone && phoneKey === existingPhone && phoneKey.length >= 10)))

      if ((sameName && sameAddress) || (sameName && sameContact) || (sameAddress && sameContact)) {
        const fields = mergeFields(existing, row)
        const sources = Array.from(
          new Set([...existing.sourceFileNames, ...row.sourceFileNames, row.sourceFileName])
        )
        const fieldConfidence = { ...existing.fieldConfidence }
        for (const key of SCAN_FIELD_KEYS) {
          fieldConfidence[key] = preferConfidence(
            existing.fieldConfidence[key],
            row.fieldConfidence[key]
          )
          if (!fieldValue({ ...existing, ...fields }, key) && fieldValue(row, key)) {
            fieldConfidence[key] = row.fieldConfidence[key]
          }
        }
        result[i] = {
          ...existing,
          ...fields,
          sourceFileName: sources[0],
          sourceFileNames: sources,
          confidence: scoreConfidence(fields, true),
          fieldConfidence,
          possibleDuplicateOf: undefined,
        }
        merged = true
        break
      }

      // Same name, different address — keep separate and flag
      if (sameName && addressKey && existingAddress && addressKey !== existingAddress) {
        row.possibleDuplicateOf = existing.id
      }
    }

    if (!merged) result.push(row)
  }

  return result
}

export async function scanLeaseFile(file: File): Promise<ScannedLeaseRow[]> {
  const text = await readFileAsText(file)
  const blocks = splitLeaseBlocks(text)
  const hadText = Boolean(text.trim())

  return blocks.map((block) => {
    const fields = parseLeaseText(block, file.name)
    return toRow(fields, file.name, hadText)
  })
}

export async function scanLeaseFiles(files: File[]): Promise<ScannedLeaseRow[]> {
  const rows: ScannedLeaseRow[] = []
  for (const file of files) {
    const scanned = await scanLeaseFile(file)
    rows.push(...scanned)
  }
  return dedupeScannedRows(rows)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/**
 * Progressive scan: emits tenant rows as soon as a name is known, then streams
 * field updates so the UI can show per-field scanning indicators.
 */
export async function scanLeaseFilesProgressive(
  files: File[],
  onEvent: (event: ScanProgressEvent) => void,
  options?: { signal?: AbortSignal; fieldDelayMs?: number }
): Promise<ScannedLeaseRow[]> {
  const fieldDelay = options?.fieldDelayMs ?? 110
  const collected: ScannedLeaseRow[] = []
  const total = files.length

  for (let index = 0; index < files.length; index++) {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const file = files[index]
    onEvent({ type: 'file-start', fileName: file.name, index, total })

    const text = await readFileAsText(file)
    const blocks = splitLeaseBlocks(text)
    const hadText = Boolean(text.trim())

    for (const block of blocks) {
      if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const fields = parseLeaseText(block, file.name)
      const finalRow = toRow(fields, file.name, hadText)

      const pendingFields = SCAN_FIELD_KEYS.filter((key) => {
        if (key === 'tenantName') return false
        return true
      })

      const shell: ScannedLeaseRow = {
        ...toRow(emptyFields(), file.name, hadText, { id: finalRow.id }),
        tenantName: fields.tenantName || '',
        fieldConfidence: {
          ...buildFieldConfidence(emptyFields(), hadText),
          tenantName: fields.tenantName
            ? buildFieldConfidence(fields, hadText).tenantName
            : 'missing',
        },
        confidence: 'low',
      }

      onEvent({
        type: 'row-created',
        row: shell,
        pendingFields: fields.tenantName ? pendingFields : ['tenantName', ...pendingFields],
      })

      // Reveal tenant name first when found (or mark missing)
      if (fields.tenantName) {
        onEvent({
          type: 'field-update',
          rowId: finalRow.id,
          field: 'tenantName',
          value: fields.tenantName,
          confidence: finalRow.fieldConfidence.tenantName,
          sourceFileName: file.name,
        })
      } else {
        await delay(fieldDelay)
        onEvent({
          type: 'field-update',
          rowId: finalRow.id,
          field: 'tenantName',
          value: '',
          confidence: 'missing',
          sourceFileName: file.name,
        })
      }

      for (const field of SCAN_FIELD_KEYS) {
        if (field === 'tenantName') continue
        await delay(fieldDelay)
        if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
        onEvent({
          type: 'field-update',
          rowId: finalRow.id,
          field,
          value: fieldValue(finalRow, field),
          confidence: finalRow.fieldConfidence[field],
          sourceFileName: file.name,
        })
      }

      collected.push(finalRow)
      onEvent({ type: 'row-complete', rowId: finalRow.id, row: finalRow })
    }

    onEvent({ type: 'file-done', fileName: file.name, index, total })
  }

  const deduped = dedupeScannedRows(collected)
  onEvent({
    type: 'batch-complete',
    rows: deduped,
    filesProcessed: total,
    recordsFound: deduped.length,
  })
  return deduped
}

export function formatLeaseLengthLabel(months: number | null | undefined): string {
  if (months == null || months <= 0) return '—'
  if (months === 1) return '1 month'
  return `${months} months`
}

export function confidenceLabel(confidence: FieldConfidence | ScannedLeaseRow['confidence']): string {
  if (confidence === 'high') return 'High confidence'
  if (confidence === 'medium' || confidence === 'review') return 'Review suggested'
  if (confidence === 'missing') return 'Not found'
  return 'Low confidence'
}

export function displayScanValue(value: string | number | null | undefined): string {
  if (value == null || value === '') return 'Not found'
  return String(value)
}
