import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BellRing, FileSignature, Loader2, Mail, Phone, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useApp } from '@/context/AppContext'
import { ApiError } from '@/lib/api'
import { paymentMethodsTextForProvider } from '@/lib/paymentProvider'
import { findPropertyByAddress } from '@/lib/properties'
import { buildResidentialLeaseFields } from '@/lib/residentialLeaseTemplate'
import {
  DEFAULT_LEASE_LENGTH_MONTHS,
  findDefaultLeaseOption,
  formatLeaseLengthLabel,
  listDefaultLeaseOptions,
  resolveScheduleAsOf,
  seasonalLeaseOptionId,
} from '@/lib/leaseSchedule'
import { DEFAULT_SERVICE_TIER } from '@/lib/serviceTiers'
import { generateId } from '@/lib/storage'
import { requestLeaseAgreementPreview } from '@/lib/leaseAgreementPreview'
import {
  notifyTenantSetup,
  type TenantSetupNotifyChannels,
} from '@/lib/tenantSetupNotifyApi'
import { cn, formatDate } from '@/lib/utils'
import type { BusinessSettings, Client, ContractData, ProjectType, Property } from '@/types'

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  propertyAddress: '',
  leaseOptionId: seasonalLeaseOptionId(DEFAULT_LEASE_LENGTH_MONTHS),
}

export type AddClientInitialValues = Partial<typeof EMPTY_FORM> & {
  leaseStartDate?: string
  leaseLengthMonths?: string
}

interface AddClientModalProps {
  open: boolean
  onClose: () => void
  initialValues?: AddClientInitialValues
  registrationUserId?: string
  onAdded?: () => void
}

type ModalStep = 'form' | 'notify'

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

const CHANNEL_OPTIONS: Array<{
  id: TenantSetupNotifyChannels
  label: string
  description: string
  icon: typeof Mail
}> = [
  {
    id: 'email',
    label: 'Email',
    description: 'Send a setup link to their email',
    icon: Mail,
  },
  {
    id: 'phone',
    label: 'Phone',
    description: 'Text a setup link to their phone',
    icon: Phone,
  },
  {
    id: 'both',
    label: 'Both',
    description: 'Email and text the setup link',
    icon: Smartphone,
  },
]

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
  const leaseOptions = useMemo(
    () => listDefaultLeaseOptions(settings, resolveScheduleAsOf()),
    [settings]
  )
  const defaultOptionId = seasonalLeaseOptionId(DEFAULT_LEASE_LENGTH_MONTHS)
  const [form, setForm] = useState({ ...EMPTY_FORM, leaseOptionId: defaultOptionId })
  const [step, setStep] = useState<ModalStep>('form')
  const [notifyChannels, setNotifyChannels] = useState<TenantSetupNotifyChannels | null>(null)
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

  const resolveInitialOptionId = () => {
    if (initialValues?.leaseOptionId) {
      const match = findDefaultLeaseOption(
        settings,
        initialValues.leaseOptionId,
        resolveScheduleAsOf()
      )
      if (match) return match.id
    }
    if (initialValues?.leaseStartDate && initialValues?.leaseLengthMonths) {
      const months = Number(initialValues.leaseLengthMonths)
      const seasonalId = seasonalLeaseOptionId(months)
      if (leaseOptions.some((option) => option.id === seasonalId)) return seasonalId
      const custom = leaseOptions.find(
        (option) =>
          option.kind === 'custom' &&
          option.leaseStartDate === initialValues.leaseStartDate &&
          option.leaseLengthMonths === months
      )
      if (custom) return custom.id
    }
    return defaultOptionId
  }

  useEffect(() => {
    if (!open) return
    setForm({
      ...EMPTY_FORM,
      ...initialValues,
      leaseOptionId: resolveInitialOptionId(),
    })
    setStep('form')
    setNotifyChannels(null)
    setError('')
    setSubmitting(false)
  }, [open, initialValues])

  const update = (field: string, value: string) =>
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === 'propertyAddress') {
        const property = findPropertyByAddress(properties, value)
        const propertyOption = property?.defaultLeaseOptionId?.trim()
        if (propertyOption && leaseOptions.some((option) => option.id === propertyOption)) {
          next.leaseOptionId = propertyOption
        }
      }
      return next
    })

  const validateForm = (requirePhone: boolean) => {
    const address = form.propertyAddress.trim()
    if (!address) {
      setError('Choose a property address.')
      return null
    }
    const selected = findDefaultLeaseOption(
      settings,
      form.leaseOptionId,
      resolveScheduleAsOf()
    )
    if (!selected) {
      setError('Choose a default lease option.')
      return null
    }
    if (!form.name.trim()) {
      setError('Enter the tenant name.')
      return null
    }
    if (!form.email.trim()) {
      setError('Enter the tenant email.')
      return null
    }
    if (requirePhone && !form.phone.trim()) {
      setError('Enter a phone number to notify by text.')
      return null
    }
    return {
      address,
      selected,
      property: findPropertyByAddress(properties, address) ?? null,
    }
  }

  const finishAndNavigate = (clientId: string) => {
    requestLeaseAgreementPreview(clientId)
    onAdded?.()
    onClose()
    const studioPath = location.pathname.startsWith('/studio') ? location.pathname : '/studio'
    navigate({ pathname: studioPath, hash: 'tenants-waiting-lease' })
  }

  const createTenant = async () => {
    const validated = validateForm(false)
    if (!validated) return null
    const { address, selected, property } = validated
    return addClientWithContract(
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
        leaseLengthMonths: selected.leaseLengthMonths,
        accountUserId: registrationUserId,
      },
      (client) =>
        buildGeneratingLease(
          client,
          settings,
          property,
          selected.leaseStartDate,
          selected.leaseEndDate,
          selected.leaseLengthMonths
        )
    )
  }

  const handleGenerateOnly = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const client = await createTenant()
      if (!client) return
      finishAndNavigate(client.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate lease agreement')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenNotifyStep = () => {
    setError('')
    if (!validateForm(false)) return
    setStep('notify')
    setNotifyChannels(null)
  }

  const handleGenerateAndNotify = async () => {
    if (!notifyChannels) {
      setError('Choose Email, Phone, or Both.')
      return
    }
    const needsPhone = notifyChannels === 'phone' || notifyChannels === 'both'
    if (!validateForm(needsPhone)) {
      setStep('form')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const client = await createTenant()
      if (!client) return

      try {
        await notifyTenantSetup({
          channels: notifyChannels,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          propertyAddress: form.propertyAddress.trim(),
          landlordCompany: settings.businessName?.trim() || undefined,
        })
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not send the setup notification'
        setError(
          `${message} The lease agreement was still generated — you can notify them later.`
        )
        requestLeaseAgreementPreview(client.id)
        onAdded?.()
        setSubmitting(false)
        return
      }

      finishAndNavigate(client.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate lease agreement')
    } finally {
      setSubmitting(false)
    }
  }

  const title =
    step === 'notify'
      ? 'Notify tenant'
      : registrationUserId
        ? 'Add Tenant from Registration'
        : 'Add New Tenant'

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {step === 'notify' ? (
        <div className="space-y-4">
          {error && (
            <p className="rounded-sm border-2 border-accent bg-accent-light px-3 py-2 text-sm text-accent">
              {error}
            </p>
          )}
          <p className="text-sm text-ink-muted">
            How should we send a test setup link to{' '}
            <span className="font-semibold text-ink">{form.name.trim() || 'this tenant'}</span>?
            The link explains that account creation will be available once the site is official.
          </p>
          <div className="grid gap-2">
            {CHANNEL_OPTIONS.map(({ id, label, description, icon: Icon }) => {
              const selected = notifyChannels === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setNotifyChannels(id)
                    setError('')
                  }}
                  className={cn(
                    'flex items-start gap-3 rounded-[var(--radius-sm)] border-[length:var(--border-width)] px-3 py-3 text-left transition-colors',
                    selected
                      ? 'border-brand bg-brand/5'
                      : 'border-line bg-surface-paper hover:border-ink/40'
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]',
                      selected ? 'bg-brand text-surface-paper' : 'bg-surface text-brand'
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{label}</span>
                    <span className="mt-0.5 block text-xs text-ink-muted">{description}</span>
                    {id !== 'phone' ? (
                      <span className="mt-1 block text-[11px] text-ink-faint">
                        {form.email.trim() || 'Email from the form'}
                      </span>
                    ) : null}
                    {id !== 'email' ? (
                      <span className="mt-1 block text-[11px] text-ink-faint">
                        {form.phone.trim() || 'Add a phone number on the previous step'}
                      </span>
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep('form')
                setError('')
              }}
              disabled={submitting}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleGenerateAndNotify()
              }}
              disabled={submitting || !notifyChannels}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BellRing className="h-4 w-4" />
              )}
              {submitting ? 'Sending…' : 'Generate & Send'}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {registrationUserId && (
            <p className="mb-4 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink-muted">
              Pre-filled from portal sign-up. Confirm the details, choose lease dates, then generate
              their lease agreement.
            </p>
          )}
          <form onSubmit={handleGenerateOnly} className="space-y-4">
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
                hint="Required to notify by text"
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
                label="Default lease option"
                name="leaseOptionId"
                required
                value={form.leaseOptionId}
                onChange={(e) => update('leaseOptionId', e.target.value)}
                hint="Seasonal lengths and custom eras from Help and Settings → Lease Defaults"
              >
                {leaseOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.kind === 'custom'
                      ? `Custom · ${option.label}`
                      : `${formatLeaseLengthLabel(option.leaseLengthMonths)} · ${formatDate(option.leaseStartDate)} – ${formatDate(option.leaseEndDate)}`}
                  </option>
                ))}
              </Select>
              <div className="rounded-sm border border-line bg-surface px-3 py-2.5 text-sm text-ink-muted sm:self-end">
                {(() => {
                  const selected = findDefaultLeaseOption(
                    settings,
                    form.leaseOptionId,
                    resolveScheduleAsOf()
                  )
                  if (!selected) return 'Select a lease option to preview dates.'
                  return (
                    <>
                      Term:{' '}
                      <span className="font-medium text-ink">
                        {formatDate(selected.leaseStartDate)} – {formatDate(selected.leaseEndDate)}
                      </span>{' '}
                      ({formatLeaseLengthLabel(selected.leaseLengthMonths)})
                    </>
                  )
                })()}
              </div>
            </div>

            <p className="rounded-sm border border-line bg-surface px-3 py-2.5 text-sm text-ink-muted">
              Once this tenant is added, they will appear in the Pending Tenants section. The lease
              will need to be signed by them. Use Generate Agreement &amp; Notify to email and/or
              text a setup link (account creation opens when the site is official).
            </p>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitting || propertyOptions.length === 0}
                onClick={handleOpenNotifyStep}
              >
                <BellRing className="h-4 w-4" />
                Generate Agreement &amp; Notify
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
        </>
      )}
    </Modal>
  )
}
