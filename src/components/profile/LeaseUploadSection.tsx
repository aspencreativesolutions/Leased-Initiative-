import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Check,
  FileUp,
  Link2,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Replace,
  ScanSearch,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { useApp } from '@/context/AppContext'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import {
  LEASE_IMPORT_FILE_ACCEPT,
  LEASE_IMPORT_FILE_TYPES_LABEL,
} from '@/lib/allowedFileTypes'
import { buildContractPlaceholderFields } from '@/lib/contractPlaceholders'
import {
  confidenceLabel,
  displayScanValue,
  fileTypeLabel,
  formatFileSize,
  formatLeaseLengthLabel,
  isAllowedLeaseImportFile,
  scanLeaseFilesProgressive,
  type FieldConfidence,
  type ScanFieldKey,
  type ScannedLeaseRow,
} from '@/lib/leaseScan'
import {
  buildOfficialTenantHighlightQuery,
  writeOfficialTenantSpotlightIds,
} from '@/lib/officialTenantSpotlight'
import { paymentMethodsTextForProvider } from '@/lib/paymentProvider'
import { createTenantInvite, markTenantInviteDelivered } from '@/lib/portalUsersApi'
import { DEFAULT_SERVICE_TIER } from '@/lib/serviceTiers'
import { generateId } from '@/lib/storage'
import { withLeasePreferenceClauses } from '@/lib/leasePreferenceClauses'
import { openSmsCompose } from '@/lib/tenantMessageTemplates'
import { cn, formatDate } from '@/lib/utils'
import type { BusinessSettings, Client, ContractData } from '@/types'

type QueueStatus = 'queued' | 'ready' | 'scanning' | 'done' | 'error'

interface QueueFile {
  id: string
  file: File
  status: QueueStatus
  progress: number
  error?: string
}

type RowStatus =
  | 'scanning'
  | 'review'
  | 'dismissed'
  | 'confirming'
  | 'confirmed'
  | 'inviteReady'
  | 'linkSent'

interface WorkingRow extends ScannedLeaseRow {
  status: RowStatus
  pendingFields: Set<ScanFieldKey>
  clientId?: string
  inviteId?: string
  inviteUrl?: string
  inviteStatus?: 'pending' | 'opened' | 'accepted' | 'expired'
  inviteMethod?: 'email' | 'sms'
  inviteSentAt?: string
  reveal: boolean
  showCheck: boolean
  /** Selected for bulk official add or duplicate merge. */
  selected: boolean
}

type InviteChannel = 'email' | 'sms'

const FIELD_LABELS: Record<ScanFieldKey, string> = {
  tenantName: 'Tenant name',
  address: 'Property address',
  rentAmount: 'Monthly rent',
  leaseStartDate: 'Lease start date',
  leaseLengthMonths: 'Lease length',
  leaseEndDate: 'Lease end date',
  nextPaymentDueDate: 'Next payment due',
  email: 'Email address',
  phone: 'Phone number',
}

function buildDraftFromScan(
  client: Client,
  row: ScannedLeaseRow,
  settings: BusinessSettings
): ContractData {
  const placeholders = buildContractPlaceholderFields(client)
  const rent = row.rentAmount?.trim()
  return {
    id: generateId(),
    clientId: client.id,
    clientName: client.name,
    businessName: client.businessName,
    email: client.email,
    phone: client.phone,
    clientAddress: client.projectName || row.address,
    serviceTier: DEFAULT_SERVICE_TIER,
    projectTitle: client.projectName,
    projectScope:
      client.projectDescription ||
      `Imported from ${row.sourceFileNames.join(', ') || row.sourceFileName}`,
    servicesIncluded: placeholders.servicesIncluded,
    servicesNotIncluded: placeholders.servicesNotIncluded,
    deliverables: placeholders.deliverables,
    startDate: row.leaseStartDate || placeholders.startDate,
    completionDate: row.leaseEndDate || placeholders.completionDate,
    totalCost: rent || placeholders.totalCost,
    depositAmount: placeholders.depositAmount,
    remainingBalance: placeholders.remainingBalance,
    paymentSchedule: settings.defaultPaymentTerms,
    paymentProvider: 'paypal',
    allowPrepaidRent: true,
    paymentMethods: paymentMethodsTextForProvider('paypal'),
    latePaymentPolicy: 'Late payments may incur a 1.5% monthly fee on outstanding balances.',
    revisionCount: settings.defaultRevisionLimit,
    extraRevisionFee: placeholders.extraRevisionFee,
    revisionLimits: 'Revisions must be requested within 14 days of delivery.',
    clientResponsibilities:
      'The tenant agrees to pay rent on time, care for the premises, and notify the landlord of needed repairs.',
    communicationMethod: 'Email',
    responseTime: '1-2 business days',
    meetingExpectations: 'Scheduled walkthroughs as needed; 24-hour notice for rescheduling.',
    ownershipTerms: 'The landlord retains ownership of the leased premises.',
    portfolioRights: 'Landlord may reference the property address in portfolio materials.',
    terminationTerms: withLeasePreferenceClauses(
      settings.defaultContractFooter || 'Either party may terminate per lease terms.',
      settings
    ),
    isPlaceholderDraft: !rent || !row.leaseStartDate,
    createdAt: new Date().toISOString(),
  }
}

function inviteMessage(companyName: string, address: string, inviteUrl: string): string {
  const where = address.trim() || 'your property'
  return `Hi! ${companyName} invited you to join the tenant portal for ${where}. Register here to stay connected for leases, rent, and updates: ${inviteUrl}`
}

function confidenceChipClass(confidence: FieldConfidence | ScannedLeaseRow['confidence']): string {
  if (confidence === 'high') return 'border-[var(--deposit-border)] bg-[var(--deposit-bg)] text-[var(--deposit-fg)]'
  if (confidence === 'review' || confidence === 'medium') {
    return 'border-amber-300/80 bg-amber-50 text-amber-900'
  }
  if (confidence === 'missing') return 'border-line bg-surface text-ink-muted'
  return 'border-accent/40 bg-accent-light text-accent'
}

function FieldScanValue({
  pending,
  value,
  confidence,
  sourceFile,
}: {
  pending: boolean
  value: string
  confidence: FieldConfidence
  sourceFile?: string
}) {
  if (pending) {
    return (
      <span className="lease-field-scan inline-flex items-center gap-2 text-xs text-ink-muted">
        <span className="lease-field-scan__ring" aria-hidden />
        Scanning…
      </span>
    )
  }
  const display = displayScanValue(value)
  const missing = !value
  return (
    <div className="min-w-0">
      <p className={cn('truncate text-sm', missing ? 'text-ink-muted italic' : 'font-medium text-ink')}>
        {display}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'rounded-sm border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
            confidenceChipClass(confidence)
          )}
        >
          {confidenceLabel(confidence)}
        </span>
        {sourceFile && !missing && (
          <span className="truncate text-[10px] text-ink-faint" title={sourceFile}>
            from {sourceFile}
          </span>
        )}
      </div>
    </div>
  )
}

export function LeaseUploadSection() {
  const {
    settings,
    properties,
    addClient,
    addClientWithContract,
    addProperty,
    saveContract,
    updateClient,
  } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const objectUrlsRef = useRef<Map<string, string>>(new Map())

  const [queue, setQueue] = useState<QueueFile[]>([])
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null)
  const [rows, setRows] = useState<WorkingRow[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)
  const [scanError, setScanError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [scanProgress, setScanProgress] = useState({
    processed: 0,
    remaining: 0,
    found: 0,
    currentFile: '',
  })

  const [inviteRowId, setInviteRowId] = useState<string | null>(null)
  const [inviteChannel, setInviteChannel] = useState<InviteChannel>('email')
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePhone, setInvitePhone] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const inviteRow = rows.find((r) => r.id === inviteRowId) ?? null
  const companyName = settings.businessName?.trim() || 'Your landlord'
  const reviewRows = rows.filter((r) => r.status !== 'dismissed')
  const confirmableRows = reviewRows.filter((r) => r.status === 'review')
  const selectedRows = confirmableRows.filter((r) => r.selected)
  const allConfirmableSelected =
    confirmableRows.length > 0 && selectedRows.length === confirmableRows.length

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      for (const url of objectUrlsRef.current.values()) URL.revokeObjectURL(url)
      objectUrlsRef.current.clear()
    }
  }, [])

  useEffect(() => {
    if (!inviteRowId) return
    const row = rows.find((r) => r.id === inviteRowId)
    if (!row) return
    setInviteEmail(row.email || '')
    setInvitePhone(row.phone || '')
  }, [inviteRowId, rows])

  const updateRow = (id: string, patch: Partial<WorkingRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const patchRowFields = (
    id: string,
    field: ScanFieldKey,
    value: string | number | null,
    confidence: FieldConfidence,
    sourceFileName?: string
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const pendingFields = new Set(r.pendingFields)
        pendingFields.delete(field)
        const next: WorkingRow = {
          ...r,
          pendingFields,
          fieldConfidence: { ...r.fieldConfidence, [field]: confidence },
        }
        if (field === 'leaseLengthMonths') {
          next.leaseLengthMonths =
            typeof value === 'number' && Number.isFinite(value) ? value : null
        } else if (field === 'tenantName') next.tenantName = String(value ?? '')
        else if (field === 'address') next.address = String(value ?? '')
        else if (field === 'rentAmount') next.rentAmount = String(value ?? '')
        else if (field === 'leaseStartDate') next.leaseStartDate = String(value ?? '')
        else if (field === 'leaseEndDate') next.leaseEndDate = String(value ?? '')
        else if (field === 'nextPaymentDueDate') next.nextPaymentDueDate = String(value ?? '')
        else if (field === 'email') next.email = String(value ?? '')
        else if (field === 'phone') next.phone = String(value ?? '')
        if (sourceFileName && !next.sourceFileNames.includes(sourceFileName)) {
          next.sourceFileNames = [...next.sourceFileNames, sourceFileName]
        }
        return next
      })
    )
  }

  const enqueueFiles = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList)
    if (!incoming.length) return
    setScanError('')
    setScanComplete(false)
    const additions: QueueFile[] = []
    for (const file of incoming) {
      const check = isAllowedLeaseImportFile(file)
      if (!check.ok) {
        setScanError(check.reason)
        continue
      }
      additions.push({
        id: generateId(),
        file,
        status: 'ready',
        progress: 100,
      })
    }
    if (additions.length) setQueue((prev) => [...prev, ...additions])
  }

  const removeQueueFile = (id: string) => {
    const url = objectUrlsRef.current.get(id)
    if (url) {
      URL.revokeObjectURL(url)
      objectUrlsRef.current.delete(id)
    }
    setQueue((prev) => prev.filter((item) => item.id !== id))
  }

  const clearQueue = () => {
    for (const url of objectUrlsRef.current.values()) URL.revokeObjectURL(url)
    objectUrlsRef.current.clear()
    setQueue([])
  }

  const openSourceFile = (fileName: string) => {
    const item = queue.find((q) => q.file.name === fileName)
    if (!item) {
      setScanError(`Source file “${fileName}” is no longer in the upload queue.`)
      return
    }
    let url = objectUrlsRef.current.get(item.id)
    if (!url) {
      url = URL.createObjectURL(item.file)
      objectUrlsRef.current.set(item.id, url)
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleScanFiles = async () => {
    const files = queue.filter((q) => q.status === 'ready' || q.status === 'done').map((q) => q.file)
    if (!files.length) {
      setScanError('Add at least one file before scanning.')
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setScanning(true)
    setScanComplete(false)
    setScanError('')
    setRows([])
    setScanProgress({
      processed: 0,
      remaining: files.length,
      found: 0,
      currentFile: files[0]?.name ?? '',
    })
    setQueue((prev) =>
      prev.map((item) =>
        files.some((f) => f === item.file)
          ? { ...item, status: 'scanning', progress: 15 }
          : item
      )
    )

    try {
      await scanLeaseFilesProgressive(
        files,
        (event) => {
          if (event.type === 'file-start') {
            setScanProgress((prev) => ({
              ...prev,
              currentFile: event.fileName,
              remaining: Math.max(0, event.total - event.index),
              processed: event.index,
            }))
            setQueue((prev) =>
              prev.map((item) =>
                item.file.name === event.fileName
                  ? { ...item, status: 'scanning', progress: 35 }
                  : item
              )
            )
          }
          if (event.type === 'file-done') {
            setScanProgress((prev) => ({
              ...prev,
              processed: event.index + 1,
              remaining: Math.max(0, event.total - event.index - 1),
            }))
            setQueue((prev) =>
              prev.map((item) =>
                item.file.name === event.fileName
                  ? { ...item, status: 'done', progress: 100 }
                  : item
              )
            )
          }
          if (event.type === 'row-created') {
            const working: WorkingRow = {
              ...event.row,
              status: 'scanning',
              pendingFields: new Set(event.pendingFields),
              reveal: true,
              showCheck: false,
              selected: false,
            }
            setRows((prev) => [...prev, working])
            setScanProgress((prev) => ({ ...prev, found: prev.found + 1 }))
          }
          if (event.type === 'field-update') {
            patchRowFields(
              event.rowId,
              event.field,
              event.value,
              event.confidence,
              event.sourceFileName
            )
          }
          if (event.type === 'row-complete') {
            setRows((prev) =>
              prev.map((r) =>
                r.id === event.rowId
                  ? {
                      ...r,
                      ...event.row,
                      status: 'review',
                      pendingFields: new Set(),
                      reveal: true,
                      selected: false,
                    }
                  : r
              )
            )
          }
          if (event.type === 'batch-complete') {
            setRows((prev) => {
              const byId = new Map(prev.map((r) => [r.id, r]))
              return event.rows.map((row) => {
                const existing = byId.get(row.id)
                return {
                  ...row,
                  status: 'review' as const,
                  pendingFields: new Set<ScanFieldKey>(),
                  reveal: true,
                  showCheck: existing?.showCheck ?? false,
                  selected: false,
                  clientId: existing?.clientId,
                  inviteUrl: existing?.inviteUrl,
                  inviteId: existing?.inviteId,
                }
              })
            })
            setScanProgress((prev) => ({
              ...prev,
              processed: event.filesProcessed,
              remaining: 0,
              found: event.recordsFound,
              currentFile: '',
            }))
          }
        },
        { signal: controller.signal }
      )
      setScanComplete(true)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setScanError(err instanceof Error ? err.message : 'Could not scan those files')
    } finally {
      setScanning(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRescan = () => {
    void handleScanFiles()
  }

  const ensureProperty = async (
    address: string,
    knownAddresses: Set<string>
  ) => {
    const trimmed = address.trim()
    if (!trimmed) return
    const key = trimmed.toLowerCase()
    if (knownAddresses.has(key)) return
    const exists = properties.some((p) => p.address.trim().toLowerCase() === key)
    if (exists) {
      knownAddresses.add(key)
      return
    }
    await addProperty({
      address: trimmed,
      propertyType: 'Single-Family Home',
      unitCount: 1,
      bedrooms: 1,
      maxTenants: 1,
      importedFromLeaseScan: true,
    })
    knownAddresses.add(key)
  }

  const confirmRow = async (row: WorkingRow, knownAddresses?: Set<string>) => {
    if (
      row.status === 'confirming' ||
      row.status === 'confirmed' ||
      row.status === 'inviteReady' ||
      row.status === 'linkSent'
    ) {
      return
    }
    if (!row.tenantName.trim()) {
      setScanError('Add a tenant name before confirming.')
      return
    }
    setScanError('')
    updateRow(row.id, { status: 'confirming' })
    const addressSet =
      knownAddresses ??
      new Set(properties.map((p) => p.address.trim().toLowerCase()))
    try {
      if (row.address.trim()) {
        await ensureProperty(row.address, addressSet)
      }
      const sourceFiles = row.sourceFileNames.length
        ? row.sourceFileNames
        : [row.sourceFileName]
      const client = addClient({
        name: row.tenantName.trim(),
        businessName: row.tenantName.trim(),
        email: row.email.trim(),
        phone: row.phone.trim(),
        projectType: 'Apartment',
        projectName: row.address.trim() || `${row.tenantName.trim()} property`,
        projectDescription: `Imported from lease scan (${sourceFiles.join(', ')})`,
        projectStatus: 'Inquiry',
        contractStatus: 'Not Started',
        paymentStatus: 'Unpaid',
        isOfficialClient: false,
        serviceTier: DEFAULT_SERVICE_TIER,
        leaseLengthMonths: row.leaseLengthMonths ?? undefined,
        importedFromLeaseScan: true,
        importSourceFiles: sourceFiles,
        importedAt: new Date().toISOString(),
        importConfirmedBy: user?.email || user?.name || 'landlord',
        profileNotes: [
          row.rentAmount ? `Scanned monthly rent: $${row.rentAmount}` : null,
          row.leaseStartDate ? `Lease start: ${row.leaseStartDate}` : null,
          row.leaseEndDate ? `Lease end: ${row.leaseEndDate}` : null,
          row.nextPaymentDueDate ? `Next payment due: ${row.nextPaymentDueDate}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      })
      await saveContract(buildDraftFromScan(client, row, settings), { asDraft: true })
      updateRow(row.id, {
        status: 'confirmed',
        clientId: client.id,
        showCheck: true,
      })
      window.setTimeout(() => {
        updateRow(row.id, { status: 'inviteReady' })
      }, 900)
    } catch (err) {
      updateRow(row.id, { status: 'review' })
      setScanError(err instanceof ApiError ? err.message : 'Could not add tenant to dashboard')
    }
  }

  const confirmAllReviewed = async () => {
    const knownAddresses = new Set(
      properties.map((p) => p.address.trim().toLowerCase())
    )
    for (const row of confirmableRows) {
      await confirmRow(row, knownAddresses)
    }
  }

  const dismissRow = (id: string) => {
    updateRow(id, { status: 'dismissed', selected: false })
  }

  const dismissAllReview = () => {
    setRows((prev) =>
      prev.map((r) =>
        r.status === 'review' || r.status === 'scanning'
          ? { ...r, status: 'dismissed', selected: false }
          : r
      )
    )
  }

  const setAllConfirmableSelected = (selected: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.status === 'review' ? { ...r, selected } : r))
    )
  }

  const mergeSelectedDuplicates = () => {
    if (selectedRows.length < 2) {
      setScanError('Select at least two records to mark as duplicates.')
      return
    }
    const [primary, ...rest] = selectedRows
    const mergedFiles = Array.from(
      new Set([
        ...primary.sourceFileNames,
        ...rest.flatMap((r) => r.sourceFileNames),
      ])
    )
    const merged: WorkingRow = {
      ...primary,
      tenantName: primary.tenantName || rest.find((r) => r.tenantName)?.tenantName || '',
      address: primary.address || rest.find((r) => r.address)?.address || '',
      rentAmount: primary.rentAmount || rest.find((r) => r.rentAmount)?.rentAmount || '',
      leaseStartDate:
        primary.leaseStartDate || rest.find((r) => r.leaseStartDate)?.leaseStartDate || '',
      leaseEndDate: primary.leaseEndDate || rest.find((r) => r.leaseEndDate)?.leaseEndDate || '',
      leaseLengthMonths:
        primary.leaseLengthMonths ??
        rest.find((r) => r.leaseLengthMonths != null)?.leaseLengthMonths ??
        null,
      nextPaymentDueDate:
        primary.nextPaymentDueDate ||
        rest.find((r) => r.nextPaymentDueDate)?.nextPaymentDueDate ||
        '',
      email: primary.email || rest.find((r) => r.email)?.email || '',
      phone: primary.phone || rest.find((r) => r.phone)?.phone || '',
      sourceFileNames: mergedFiles,
      sourceFileName: mergedFiles[0] || primary.sourceFileName,
      possibleDuplicateOf: undefined,
      selected: false,
      status: 'review',
    }
    const dropIds = new Set(rest.map((r) => r.id))
    setRows((prev) =>
      prev
        .filter((r) => !dropIds.has(r.id))
        .map((r) => (r.id === primary.id ? merged : { ...r, selected: false }))
    )
    setScanError('')
  }

  const addRowAsOfficial = async (row: WorkingRow, knownAddresses?: Set<string>) => {
    if (
      row.status === 'confirming' ||
      row.status === 'confirmed' ||
      row.status === 'inviteReady' ||
      row.status === 'linkSent'
    ) {
      return null
    }
    if (!row.tenantName.trim()) {
      setScanError('Add a tenant name before adding to Official Tenants.')
      return null
    }
    updateRow(row.id, { status: 'confirming', selected: false })
    const addressSet =
      knownAddresses ??
      new Set(properties.map((p) => p.address.trim().toLowerCase()))
    const now = new Date().toISOString()
    try {
      if (row.address.trim()) {
        await ensureProperty(row.address, addressSet)
      }
      const sourceFiles = row.sourceFileNames.length
        ? row.sourceFileNames
        : [row.sourceFileName]
      const client = await addClientWithContract(
        {
          name: row.tenantName.trim(),
          businessName: row.tenantName.trim(),
          email: row.email.trim(),
          phone: row.phone.trim(),
          projectType: 'Apartment',
          projectName: row.address.trim() || `${row.tenantName.trim()} property`,
          projectDescription: `Imported from lease scan (${sourceFiles.join(', ')})`,
          projectStatus: 'In Progress',
          contractStatus: 'Signed',
          paymentStatus: 'Unpaid',
          isOfficialClient: true,
          officialClientSince: now,
          serviceTier: DEFAULT_SERVICE_TIER,
          leaseLengthMonths: row.leaseLengthMonths ?? undefined,
          importedFromLeaseScan: true,
          importSourceFiles: sourceFiles,
          importedAt: now,
          importConfirmedBy: user?.email || user?.name || 'landlord',
          profileNotes: [
            row.rentAmount ? `Scanned monthly rent: $${row.rentAmount}` : null,
            row.leaseStartDate ? `Lease start: ${row.leaseStartDate}` : null,
            row.leaseEndDate ? `Lease end: ${row.leaseEndDate}` : null,
            row.nextPaymentDueDate ? `Next payment due: ${row.nextPaymentDueDate}` : null,
          ]
            .filter(Boolean)
            .join(' · '),
        },
        (created) => ({
          ...buildDraftFromScan(created, row, settings),
          signedAt: now,
          confirmedByClient: true,
        })
      )
      updateRow(row.id, {
        status: 'confirmed',
        clientId: client.id,
        showCheck: true,
        selected: false,
      })
      window.setTimeout(() => {
        updateRow(row.id, { status: 'inviteReady' })
      }, 900)
      return client.id
    } catch (err) {
      updateRow(row.id, { status: 'review' })
      setScanError(
        err instanceof ApiError ? err.message : 'Could not add tenant to Official Tenants'
      )
      return null
    }
  }

  const addSelectedToOfficialTenants = async () => {
    if (selectedRows.length === 0) {
      setScanError('Select one or more reviewed tenants to add to Official Tenants.')
      return
    }
    const missingName = selectedRows.find((r) => !r.tenantName.trim())
    if (missingName) {
      setScanError('Add a tenant name to every selected record before adding.')
      return
    }
    setScanError('')
    const knownAddresses = new Set(
      properties.map((p) => p.address.trim().toLowerCase())
    )
    const addedIds: string[] = []
    for (const row of selectedRows) {
      const id = await addRowAsOfficial(row, knownAddresses)
      if (id) addedIds.push(id)
    }
    if (addedIds.length === 0) return
    writeOfficialTenantSpotlightIds(addedIds)
    const highlight = buildOfficialTenantHighlightQuery(addedIds)
    navigate(highlight ? `/studio?${highlight}` : '/studio')
  }

  const openInviteForRow = async (row: WorkingRow) => {
    setInviteError('')
    setInviteBusy(true)
    setInviteRowId(row.id)
    setInviteChannel(row.email ? 'email' : row.phone ? 'sms' : 'email')
    try {
      if (row.inviteUrl && row.inviteId) {
        setInviteUrl(row.inviteUrl)
        return
      }
      const result = await createTenantInvite(row.address.trim() || undefined, {
        clientId: row.clientId,
        source: 'lease-import',
      })
      setInviteUrl(result.inviteUrl)
      updateRow(row.id, { inviteUrl: result.inviteUrl, inviteId: result.invite.id })
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : 'Could not create invite link')
    } finally {
      setInviteBusy(false)
    }
  }

  const markLinkSent = async (rowId: string, method: InviteChannel, destination: string) => {
    const row = rows.find((r) => r.id === rowId)
    if (row?.inviteId) {
      try {
        await markTenantInviteDelivered(row.inviteId, { method, destination })
      } catch {
        // Delivery tracking is best-effort; local UI still advances.
      }
    }
    if (row?.clientId) {
      updateClient(row.clientId, {
        importInvite: {
          method,
          sentAt: new Date().toISOString(),
          status: 'pending',
          destination,
        },
      })
    }
    updateRow(rowId, {
      status: 'linkSent',
      showCheck: true,
      inviteMethod: method,
      inviteSentAt: new Date().toISOString(),
      inviteStatus: 'pending',
    })
    setInviteRowId(null)
    setInviteUrl('')
  }

  const handleSendInvite = async () => {
    if (!inviteRow || !inviteUrl) return
    if (inviteChannel === 'email') {
      const to = inviteEmail.trim()
      if (!to) {
        setInviteError('Enter an email address before sending.')
        return
      }
      const subject = `${companyName} — tenant portal invite`
      const body = inviteMessage(companyName, inviteRow.address, inviteUrl)
      window.open(
        `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        '_blank'
      )
      await markLinkSent(inviteRow.id, 'email', to)
      return
    }
    const phone = invitePhone.trim()
    if (!phone) {
      setInviteError('Enter a phone number before sending.')
      return
    }
    const body = inviteMessage(companyName, inviteRow.address, inviteUrl)
    const opened = openSmsCompose(phone, body)
    if (!opened) {
      setInviteError('That phone number looks invalid. Use a 10-digit US number or include +country code.')
      return
    }
    await markLinkSent(inviteRow.id, 'sms', phone)
  }

  const editable = (row: WorkingRow) => row.status === 'review' || row.status === 'scanning'

  return (
    <>
      <Card data-onboarding="admin-lease-upload">
        <CardHeader
          title="Import existing leases"
          subtitle="Upload lease documents, scan for tenant and lease details, select who to keep, then Add to Official Tenants — or Confirm to Pending."
        />

        <div
          className={cn(
            'lease-upload-dropzone rounded-[var(--radius-md)] border-2 border-dashed px-4 py-8 text-center transition-colors',
            dragOver ? 'border-brand bg-brand/5' : 'border-line bg-surface'
          )}
          onDragEnter={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setDragOver(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (!scanning) enqueueFiles(e.dataTransfer.files)
          }}
        >
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface-paper text-brand">
            <ScanSearch className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-ink">Drop lease files here, or browse</p>
          <p className="mt-1 text-xs text-ink-muted">{LEASE_IMPORT_FILE_TYPES_LABEL}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={scanning}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Choose files
            </Button>
            {queue.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={scanning}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload more files
              </Button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={LEASE_IMPORT_FILE_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) enqueueFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <input
            ref={replaceInputRef}
            type="file"
            accept={LEASE_IMPORT_FILE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file && replaceTargetId) {
                const check = isAllowedLeaseImportFile(file)
                if (!check.ok) {
                  setScanError(check.reason)
                } else {
                  setQueue((prev) =>
                    prev.map((item) =>
                      item.id === replaceTargetId
                        ? { ...item, file, status: 'ready', progress: 100, error: undefined }
                        : item
                    )
                  )
                  setScanComplete(false)
                }
              }
              setReplaceTargetId(null)
              e.target.value = ''
            }}
          />
        </div>

        {queue.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="label-caps">Upload queue ({queue.length})</p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={scanning}
                onClick={clearQueue}
              >
                Clear queue
              </Button>
            </div>
            <ul className="space-y-2">
              {queue.map((item) => (
                <li
                  key={item.id}
                  className="rounded-[var(--radius-md)] border border-line bg-surface-paper px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{item.file.name}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {fileTypeLabel(item.file.name, item.file.type)} ·{' '}
                        {formatFileSize(item.file.size)} ·{' '}
                        <span className="capitalize">{item.status}</span>
                      </p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/60">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            item.status === 'error' ? 'bg-accent' : 'bg-brand'
                          )}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={scanning}
                        title="Replace file"
                        onClick={() => {
                          setReplaceTargetId(item.id)
                          replaceInputRef.current?.click()
                        }}
                      >
                        <Replace className="h-3.5 w-3.5" />
                        Replace
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={scanning}
                        title="Remove file"
                        onClick={() => removeQueueFile(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <Button
                type="button"
                disabled={scanning || queue.length === 0}
                onClick={() => void handleScanFiles()}
              >
                {scanning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ScanSearch className="h-4 w-4" />
                )}
                {scanning ? 'Scanning…' : 'Scan Files'}
              </Button>
            </div>
          </div>
        )}

        {(scanning || scanComplete) && (
          <div className="mt-4 rounded-[var(--radius-md)] border border-line bg-surface px-3 py-3">
            <p className="label-caps mb-2">Scan progress</p>
            <div className="grid gap-2 text-sm text-ink-muted sm:grid-cols-2 lg:grid-cols-4">
              <p>
                Files processed:{' '}
                <span className="font-semibold text-ink">{scanProgress.processed}</span>
              </p>
              <p>
                Remaining:{' '}
                <span className="font-semibold text-ink">{scanProgress.remaining}</span>
              </p>
              <p>
                Possible tenants:{' '}
                <span className="font-semibold text-ink">{scanProgress.found}</span>
              </p>
              <p className="truncate">
                Current:{' '}
                <span className="font-semibold text-ink">
                  {scanProgress.currentFile || (scanning ? '…' : 'Done')}
                </span>
              </p>
            </div>
            {scanning && (
              <div className="lease-scan-live mt-3 flex items-center gap-2 text-xs text-ink-muted">
                <span className="lease-field-scan__ring" aria-hidden />
                Reading documents and matching tenant details…
              </div>
            )}
          </div>
        )}

        {scanError && (
          <p className="mt-3 rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
            {scanError}
          </p>
        )}

        {reviewRows.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="label-caps">Proposed tenant records</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Review every field, select the tenants you want, then Add to Official Tenants —
                  or Confirm one to keep them in Pending. Nothing is saved until you choose.
                </p>
              </div>
              {scanComplete && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={selectedRows.length === 0 || scanning}
                    onClick={() => void addSelectedToOfficialTenants()}
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Add to Official Tenants
                    {selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={confirmableRows.length === 0 || scanning}
                    onClick={() => void confirmAllReviewed()}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Confirm All to Pending
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={scanning}
                    onClick={dismissAllReview}
                  >
                    <X className="h-3.5 w-3.5" />
                    Dismiss
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={scanning || queue.length === 0}
                    onClick={handleRescan}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Rescan
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={scanning}
                    onClick={() => inputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload More Files
                  </Button>
                </div>
              )}
            </div>

            {confirmableRows.length > 0 && scanComplete && (
              <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2">
                <label className="inline-flex items-center gap-2 text-xs text-ink">
                  <input
                    type="checkbox"
                    className="accent-[var(--brand)]"
                    checked={allConfirmableSelected}
                    onChange={(e) => setAllConfirmableSelected(e.target.checked)}
                  />
                  Select all ({confirmableRows.length})
                </label>
                {selectedRows.length > 0 && (
                  <p className="text-xs text-ink-muted">
                    {selectedRows.length} selected
                  </p>
                )}
                {selectedRows.length >= 2 && (
                  <Button type="button" size="sm" variant="outline" onClick={mergeSelectedDuplicates}>
                    Mark as duplicates & merge
                  </Button>
                )}
              </div>
            )}

            {reviewRows.map((row) => (
              <article
                key={row.id}
                className={cn(
                  'lease-scan-row rounded-[var(--radius-md)] border border-line bg-surface-paper p-4',
                  row.reveal && 'lease-scan-row--revealed',
                  row.status === 'inviteReady' && 'lease-scan-row--invite-ready',
                  row.possibleDuplicateOf && 'ring-1 ring-amber-300/70',
                  row.selected && row.status === 'review' && 'ring-1 ring-brand/50'
                )}
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {row.pendingFields.has('tenantName')
                        ? 'Discovering tenant…'
                        : row.tenantName.trim() || 'Unnamed tenant'}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                      <FileUp className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {(row.sourceFileNames.length
                          ? row.sourceFileNames
                          : [row.sourceFileName]
                        ).join(' · ')}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-wide',
                          confidenceChipClass(row.confidence)
                        )}
                      >
                        {confidenceLabel(row.confidence)}
                      </span>
                      {row.possibleDuplicateOf && (
                        <span className="rounded-sm border border-amber-300/80 bg-amber-50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-900">
                          Possible duplicate — review
                        </span>
                      )}
                    </p>
                  </div>
                  {row.showCheck &&
                    (row.status === 'confirmed' ||
                      row.status === 'inviteReady' ||
                      row.status === 'linkSent') && (
                      <span
                        className={cn(
                          'lease-added-check inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                          row.status === 'linkSent'
                            ? 'border-brand/40 bg-brand/10 text-brand'
                            : 'border-[var(--deposit-border)] bg-[var(--deposit-bg)] text-[var(--deposit-fg)]'
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {row.status === 'linkSent'
                          ? 'Link sent'
                          : 'Tenant and lease added to the dashboard'}
                      </span>
                    )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(
                    [
                      'tenantName',
                      'address',
                      'rentAmount',
                      'leaseStartDate',
                      'leaseLengthMonths',
                      'leaseEndDate',
                      'nextPaymentDueDate',
                      'email',
                      'phone',
                    ] as ScanFieldKey[]
                  ).map((field) => {
                    const pending = row.pendingFields.has(field)
                    const confidence = row.fieldConfidence[field]
                    const source =
                      row.sourceFileNames[0] || row.sourceFileName || undefined
                    if (!editable(row) || pending) {
                      return (
                        <div
                          key={field}
                          className={cn(
                            field === 'address' && 'sm:col-span-2 lg:col-span-2'
                          )}
                        >
                          <p className="label-caps mb-1.5">{FIELD_LABELS[field]}</p>
                          <FieldScanValue
                            pending={pending}
                            value={
                              field === 'leaseLengthMonths'
                                ? row.leaseLengthMonths != null
                                  ? formatLeaseLengthLabel(row.leaseLengthMonths)
                                  : ''
                                : String(row[field] ?? '')
                            }
                            confidence={confidence}
                            sourceFile={source}
                          />
                        </div>
                      )
                    }
                    if (field === 'leaseLengthMonths') {
                      return (
                        <Input
                          key={field}
                          label={FIELD_LABELS[field]}
                          type="number"
                          min={1}
                          max={60}
                          value={row.leaseLengthMonths ?? ''}
                          hint={confidenceLabel(confidence)}
                          onChange={(e) => {
                            const n = Number(e.target.value)
                            updateRow(row.id, {
                              leaseLengthMonths: Number.isFinite(n) && n > 0 ? n : null,
                              fieldConfidence: {
                                ...row.fieldConfidence,
                                leaseLengthMonths:
                                  Number.isFinite(n) && n > 0 ? 'high' : 'missing',
                              },
                            })
                          }}
                        />
                      )
                    }
                    return (
                      <Input
                        key={field}
                        label={FIELD_LABELS[field]}
                        type={
                          field === 'email'
                            ? 'email'
                            : field.includes('Date')
                              ? 'date'
                              : 'text'
                        }
                        value={String(row[field] ?? '')}
                        hint={
                          !row[field]
                            ? 'Not found — enter manually'
                            : confidenceLabel(confidence)
                        }
                        className={
                          field === 'address' ? 'sm:col-span-2 lg:col-span-2' : undefined
                        }
                        placeholder={!row[field] ? 'Not found' : undefined}
                        onChange={(e) => {
                          const value = e.target.value
                          updateRow(row.id, {
                            [field]: value,
                            fieldConfidence: {
                              ...row.fieldConfidence,
                              [field]: value.trim() ? 'high' : 'missing',
                            },
                          } as Partial<WorkingRow>)
                        }}
                      />
                    )
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                  <span>
                    Term:{' '}
                    <span className="font-medium text-ink">
                      {formatLeaseLengthLabel(row.leaseLengthMonths)}
                    </span>
                  </span>
                  {row.leaseStartDate && (
                    <span>
                      Starts{' '}
                      <span className="font-medium text-ink">{formatDate(row.leaseStartDate)}</span>
                    </span>
                  )}
                  {row.leaseEndDate && (
                    <span>
                      Ends{' '}
                      <span className="font-medium text-ink">{formatDate(row.leaseEndDate)}</span>
                    </span>
                  )}
                  {row.nextPaymentDueDate && (
                    <span>
                      Next due{' '}
                      <span className="font-medium text-ink">
                        {formatDate(row.nextPaymentDueDate)}
                      </span>
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(row.sourceFileNames.length
                    ? row.sourceFileNames
                    : [row.sourceFileName]
                  ).map((name) => (
                    <Button
                      key={name}
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => openSourceFile(name)}
                    >
                      <FileUp className="h-3.5 w-3.5" />
                      Open {name}
                    </Button>
                  ))}
                </div>

                {row.status === 'linkSent' && (
                  <p className="mt-3 text-xs text-ink-muted">
                    Invitation {row.inviteStatus || 'pending'}
                    {row.inviteMethod ? ` via ${row.inviteMethod}` : ''}
                    {row.inviteSentAt ? ` · sent ${formatDate(row.inviteSentAt)}` : ''}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {row.status === 'review' && (
                    <>
                      <label className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-line px-2.5 py-1.5 text-xs text-ink">
                        <input
                          type="checkbox"
                          className="accent-[var(--brand)]"
                          checked={row.selected}
                          onChange={(e) =>
                            updateRow(row.id, { selected: e.target.checked })
                          }
                        />
                        Select
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void confirmRow(row)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Confirm to Pending
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => dismissRow(row.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                        Dismiss
                      </Button>
                    </>
                  )}
                  {row.status === 'scanning' && (
                    <Button type="button" size="sm" variant="outline" disabled>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Scanning fields…
                    </Button>
                  )}
                  {row.status === 'confirming' && (
                    <Button type="button" size="sm" disabled>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Confirming…
                    </Button>
                  )}
                  {(row.status === 'confirmed' || row.status === 'inviteReady') && (
                    <Button
                      type="button"
                      size="sm"
                      className={cn(row.status === 'inviteReady' && 'lease-send-link-breathe')}
                      onClick={() => void openInviteForRow(row)}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Send Link to Tenant
                    </Button>
                  )}
                  {row.status === 'linkSent' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void openInviteForRow(row)}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Resend link
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(inviteRowId)}
        onClose={() => {
          setInviteRowId(null)
          setInviteUrl('')
          setInviteError('')
        }}
        title="Send invite link"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Share this link so{' '}
            <span className="font-semibold text-ink">
              {inviteRow?.tenantName.trim() || 'the tenant'}
            </span>{' '}
            can register already linked to{' '}
            <span className="font-semibold text-ink">{companyName}</span>
            {inviteRow?.address.trim() ? ` at ${inviteRow.address.trim()}` : ''}. Their imported
            lease details stay attached after signup — no need to re-enter them.
          </p>

          {inviteError && (
            <p className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
              {inviteError}
            </p>
          )}

          {inviteBusy && !inviteUrl ? (
            <div className="flex items-center gap-2 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating invite link…
            </div>
          ) : inviteUrl ? (
            <>
              <div>
                <p className="label-caps mb-2">Invite link</p>
                <input
                  readOnly
                  value={inviteUrl}
                  className="w-full rounded-[var(--radius-sm)] border-[length:var(--border-width)] border-line bg-surface px-3 py-2.5 text-sm text-ink"
                  onFocus={(e) => e.target.select()}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={inviteChannel === 'email' ? 'primary' : 'outline'}
                  onClick={() => {
                    setInviteChannel('email')
                    setInviteError('')
                  }}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Send by email
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={inviteChannel === 'sms' ? 'primary' : 'outline'}
                  onClick={() => {
                    setInviteChannel('sms')
                    setInviteError('')
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Send by text message
                </Button>
              </div>

              {inviteChannel === 'email' ? (
                <Input
                  label="Email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value)
                    setInviteError('')
                  }}
                  placeholder="tenant@email.com"
                />
              ) : (
                <Input
                  label="Phone"
                  value={invitePhone}
                  onChange={(e) => {
                    setInvitePhone(e.target.value)
                    setInviteError('')
                  }}
                  placeholder="(555) 123-4567"
                />
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleSendInvite()}>
                  {inviteChannel === 'email' ? (
                    <Mail className="h-4 w-4" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                  Send
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setInviteRowId(null)
                    setInviteUrl('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Modal>
    </>
  )
}
