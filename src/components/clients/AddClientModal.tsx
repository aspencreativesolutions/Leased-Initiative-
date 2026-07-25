import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FileSignature, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useApp } from '@/context/AppContext'
import { paymentMethodsTextForProvider } from '@/lib/paymentProvider'
import { findPropertyByAddress } from '@/lib/properties'
import { buildResidentialLeaseFields } from '@/lib/residentialLeaseTemplate'
import {
  computeLeaseEndDate,
  DEFAULT_LEASE_LENGTH_MONTHS,
  formatLeaseLengthLabel,
  LEASE_LENGTH_OPTIONS,
  listUpcomingSeasonalLeaseStarts,
  resolveScheduleAsOf,
  type LeaseLengthMonths,
} from '@/lib/leaseSchedule'
import { DEFAULT_SERVICE_TIER } from '@/lib/serviceTiers'
import { generateId } from '@/lib/storage'
import { requestLeaseAgreementPreview } from '@/lib/leaseAgreementPreview'
import type { BusinessSettings, Client, ContractData, ProjectType, Property } from '@/types'

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  propertyAddress: '',
  leaseStartDate: '',
  leaseLengthMonths: String(DEFAULT_LEASE_LENGTH_MONTHS),
}

export type AddClientInitialValues = Partial<typeof EMPTY_FORM>

interface AddClientModalProps {
  open: boolean
  onClose: () => void
  initialValues?: AddClientInitialValues
  registrationUserId?: string
  onAdded?: () => void
}

function toProjectType(property: Property | undefined): ProjectType {
  const housing = property?.propertyType ?? ''
  if (housing === 'Townhouse') return 'Townhouse'
  if (housing === 'Duplex') return 'Duplex'
  if (housing.includes('Condo')) return 'Condo'
  if (housing.includes('Single-Family') || housing.includes('House')) return 'House'
  return 'Apartment'
}

function buildGeneratingLease(
  client: Client,
  settings: BusinessSettings,
  property: Property | null,
  leaseStartDate: string,
  leaseEndDate: string,
  leaseLengthMonths: number
): ContractData {
  const fields = buildResidentialLeaseFields({
    client,
    settings,
    property,
    leaseOptions: {
      clientAddress: client.projectName,
      startDate: leaseStartDate,
      completionDate: leaseEndDate,
      leaseLengthMonths,
    },
  })
  const now = new Date().toISOString()
  return {
    id: generateId(),
    clientId: client.id,
    clientName: client.name,
    businessName: client.businessName,
    email: client.email,
    phone: client.phone || '',
    clientAddress: client.projectName || '',
    serviceTier: client.serviceTier ?? DEFAULT_SERVICE_TIER,
    projectTitle: fields.projectTitle,
    projectScope: fields.projectScope,
    servicesIncluded: fields.servicesIncluded,
    servicesNotIncluded: fields.servicesNotIncluded,
    deliverables: fields.deliverables,
    startDate: leaseStartDate,
    completionDate: leaseEndDate,
    totalCost: fields.totalCost,
    depositAmount: fields.depositAmount,
    remainingBalance: fields.remainingBalance,
    paymentSchedule: fields.paymentSchedule,
    paymentProvider: 'paypal',
    allowPrepaidRent: true,
    paymentMethods: paymentMethodsTextForProvider('paypal'),
    latePaymentPolicy: fields.latePaymentPolicy,
    revisionCount: fields.revisionCount,
    extraRevisionFee: fields.extraRevisionFee,
    revisionLimits: fields.revisionLimits,
    clientResponsibilities: fields.clientResponsibilities,
    communicationMethod: fields.communicationMethod,
    responseTime: fields.responseTime,
    meetingExpectations: fields.meetingExpectations,
    ownershipTerms: fields.ownershipTerms,
    portfolioRights: fields.portfolioRights,
    terminationTerms: fields.terminationTerms,
    designerSignature: settings.ownerName || '',
    isPlaceholderDraft: false,
    leaseGenerationStatus: 'generating',
    leaseGenerationStartedAt: now,
    leaseVersion: 1,
    versionHistory: [],
    createdAt: now,
  }
}

export function AddClientModal({
  open,
  onClose,
  initialValues,
  registrationUserId,
  onAdded,
}: AddClientModalProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { properties, settings, addClientWithContract } = useApp()
  const seasonalStarts = listUpcomingSeasonalLeaseStarts(resolveScheduleAsOf())
  const defaultStart = seasonalStarts[0]?.date ?? ''
  const [form, setForm] = useState({ ...EMPTY_FORM, leaseStartDate: defaultStart })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const propertyOptions = useMemo(
    () =>
      [...properties]
        .map((p) => p.address.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [properties]
  )

  useEffect(() => {
    if (!open) return
    const starts = listUpcomingSeasonalLeaseStarts(resolveScheduleAsOf())
    setForm({
      ...EMPTY_FORM,
      ...initialValues,
      leaseStartDate: initialValues?.leaseStartDate || starts[0]?.date || '',
    })
    setError('')
    setSubmitting(false)
  }, [open, initialValues])

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const address = form.propertyAddress.trim()
    if (!address) {
      setError('Choose a property address.')
      return
    }
    if (!form.leaseStartDate) {
      setError('Choose a lease start date.')
      return
    }

    const leaseLengthMonths = Number(form.leaseLengthMonths) as LeaseLengthMonths
    const leaseEndDate = computeLeaseEndDate(form.leaseStartDate, leaseLengthMonths)
    const property = findPropertyByAddress(properties, address) ?? null

    setSubmitting(true)
    setError('')
    try {
      const client = await addClientWithContract(
        {
          name: form.name.trim(),
          businessName: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          projectType: toProjectType(property ?? undefined),
          projectName: address,
          projectDescription: '',
          projectStatus: 'Inquiry',
          contractStatus: 'Draft in Progress',
          paymentStatus: 'Unpaid',
          isOfficialClient: false,
          serviceTier: DEFAULT_SERVICE_TIER,
          leaseLengthMonths,
          accountUserId: registrationUserId,
        },
        (client) =>
          buildGeneratingLease(
            client,
            settings,
            property,
            form.leaseStartDate,
            leaseEndDate,
            leaseLengthMonths
          )
      )
      requestLeaseAgreementPreview(client.id)
      onAdded?.()
      onClose()
      const studioPath = location.pathname.startsWith('/studio')
        ? location.pathname
        : '/studio'
      navigate({ pathname: studioPath, hash: 'tenants-waiting-lease' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate lease agreement')
    } finally {
      setSubmitting(false)
    }
  }

  const title = registrationUserId ? 'Add Tenant from Registration' : 'Add New Tenant'

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {registrationUserId && (
        <p className="mb-4 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink-muted">
          Pre-filled from portal sign-up. Confirm the details, choose lease dates, then generate
          their lease agreement.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Tenant Name"
            name="name"
            required
            placeholder="Jane Smith"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            required
            placeholder="jane@example.com"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            readOnly={Boolean(registrationUserId)}
          />
          <Input
            label="Phone"
            name="phone"
            placeholder="(555) 123-4567"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            hint="Optional"
          />
          <SearchableSelect
            label="Property Address"
            name="propertyAddress"
            required
            options={propertyOptions}
            value={form.propertyAddress}
            onChange={(value) => update('propertyAddress', value)}
            placeholder={
              propertyOptions.length > 0
                ? 'Search rentals…'
                : 'Add a rental first under Rentals'
            }
            emptyMessage={
              propertyOptions.length === 0
                ? 'No rentals yet — add one under Rentals'
                : 'No matching rentals'
            }
            disabled={propertyOptions.length === 0}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Lease Start Date"
            name="leaseStartDate"
            required
            value={form.leaseStartDate}
            onChange={(e) => update('leaseStartDate', e.target.value)}
          >
            {seasonalStarts.map((option) => (
              <option key={option.date} value={option.date}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Lease Duration"
            name="leaseLengthMonths"
            required
            value={form.leaseLengthMonths}
            onChange={(e) => update('leaseLengthMonths', e.target.value)}
          >
            {LEASE_LENGTH_OPTIONS.map((months) => (
              <option key={months} value={months}>
                {formatLeaseLengthLabel(months)}
              </option>
            ))}
          </Select>
        </div>

        <p className="rounded-sm border border-line bg-surface px-3 py-2.5 text-sm text-ink-muted">
          Once this tenant is added, they will appear in the Pending Tenants section. The lease
          will need to be signed by them.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || propertyOptions.length === 0}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSignature className="h-4 w-4" />
            )}
            {submitting ? 'Generating…' : 'Generate Lease Agreement'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
