import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Mail, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useApp } from '@/context/AppContext'
import { downloadContractPdf } from '@/lib/pdf'
import { generateId } from '@/lib/storage'
import { ContractFormLayout } from './ContractFormLayout'
import { ContractReviewView } from './ContractReviewView'
import {
  ContractInput,
  ContractSelect,
  ContractSignatureRow,
  ContractTextarea,
} from './ContractFormField'
import { SendContractModal } from './SendContractModal'
import type { BusinessSettings, Client, ContractData, PaymentProvider, ServiceTier } from '@/types'
import { paymentMethodsTextForProvider } from '@/lib/paymentProvider'
import { DEFAULT_SERVICE_TIER } from '@/lib/serviceTiers'
import { buildResidentialLeaseFields } from '@/lib/residentialLeaseTemplate'
import { findPropertyByAddress } from '@/lib/properties'

const STEPS = [
  'Parties',
  'Rental Premises',
  'Rent & Deposit',
  'Occupancy & Care',
  'Rules & Signatures',
  'Review & Generate PDF',
]

const STEP_META = [
  {
    heading: 'Landlord & Tenant.',
    intro: 'Confirm the parties to this residential lease agreement.',
  },
  {
    heading: 'Rental Premises.',
    intro: 'Property address, unit details, and lease term dates.',
  },
  {
    heading: 'Rent & Deposit.',
    intro: 'Monthly rent, security deposit, due date, and payment methods.',
  },
  {
    heading: 'Occupancy & Care.',
    intro: 'Occupancy limits, utilities, maintenance, and pets.',
  },
  {
    heading: 'Rules & Signatures.',
    intro: 'Property use, entry, renewal, notices, and signatures.',
  },
  {
    heading: 'Review & Generate.',
    intro: 'Confirm the lease details, then generate a PDF or send it to your tenant.',
  },
]

interface ContractFormProps {
  client: Client
  existingContract?: ContractData
}

function emptyOrPlain(value: string | undefined): string {
  if (!value?.trim()) return ''
  return value.includes('[To be customized]') ? '' : value
}

function emptyContract(
  client: Client,
  settings: BusinessSettings,
  property: ReturnType<typeof findPropertyByAddress>
): ContractData {
  const fields = buildResidentialLeaseFields({
    client,
    settings,
    property: property ?? null,
    leaseOptions: {
      clientAddress: client.projectName || '',
      leaseLengthMonths: client.leaseLengthMonths,
    },
  })

  return {
    id: generateId(),
    clientId: client.id,
    clientName: client.name,
    businessName: client.businessName,
    email: client.email,
    phone: client.phone,
    clientAddress: client.projectName || '',
    serviceTier: (client.serviceTier ?? DEFAULT_SERVICE_TIER) as ServiceTier,
    projectTitle: fields.projectTitle,
    projectScope: fields.projectScope,
    servicesIncluded: fields.servicesIncluded,
    servicesNotIncluded: fields.servicesNotIncluded,
    deliverables: fields.deliverables,
    startDate: fields.startDate,
    completionDate: fields.completionDate,
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
    leaseGenerationStatus: 'ready',
    leaseVersion: 1,
    versionHistory: [],
    createdAt: new Date().toISOString(),
  }
}

export function ContractForm({ client, existingContract }: ContractFormProps) {
  const { settings, saveContract, properties } = useApp()
  const matchedProperty = findPropertyByAddress(properties, client.projectName)
  const [step, setStep] = useState(0)
  const [contract, setContract] = useState<ContractData>(
    existingContract || emptyContract(client, settings, matchedProperty)
  )
  const [emailOpen, setEmailOpen] = useState(false)
  const [pdfGenerated, setPdfGenerated] = useState(existingContract?.pdfGenerated ?? false)
  const [draftSaving, setDraftSaving] = useState(false)
  const [draftMessage, setDraftMessage] = useState('')

  const update = (field: keyof ContractData, value: string) =>
    setContract((c) => ({ ...c, [field]: value }))

  const handleSaveDraft = async () => {
    setDraftSaving(true)
    setDraftMessage('')
    try {
      await saveContract(contract, { asDraft: true })
      setDraftMessage('Draft saved.')
    } catch {
      setDraftMessage('Could not save draft. Make sure the app server is running.')
    } finally {
      setDraftSaving(false)
    }
  }

  const handleGeneratePdf = async () => {
    const updated = { ...contract, pdfGenerated: true }
    setContract(updated)
    await saveContract(updated)
    downloadContractPdf(updated, settings)
    setPdfGenerated(true)
  }

  const canProceed = step < STEPS.length - 1
  const wasSentToClient = Boolean(contract.sentAt)

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={draftSaving}
          onClick={() => void handleSaveDraft()}
        >
          {draftSaving ? 'Saving…' : 'Save Draft'}
        </Button>
        {draftMessage && (
          <span
            className={
              draftMessage === 'Draft saved.'
                ? 'text-xs font-medium text-brand'
                : 'text-xs text-accent'
            }
          >
            {draftMessage}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {step > 0 && (
          <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        {canProceed && (
          <Button
            size="sm"
            onClick={() => {
              saveContract(contract)
              setStep((s) => s + 1)
            }}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {step === 5 ? (
        <>
          <ContractReviewView
            contract={contract}
            designerName={settings.ownerName}
            businessName={settings.businessName}
          />
          <div className="contract-form-shell mt-4">
            <div className="contract-form-paper px-8 py-6 sm:px-14">
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={handleGeneratePdf}>
                  <Download className="h-4 w-4" />
                  Generate Lease Agreement PDF
                </Button>
                {pdfGenerated && (
                  <>
                    <Button variant="outline" onClick={() => downloadContractPdf(contract, settings)}>
                      <Download className="h-4 w-4" />
                      Download Again
                    </Button>
                    <Button variant="secondary" onClick={() => setEmailOpen(true)}>
                      <Mail className="h-4 w-4" />
                      {wasSentToClient ? 'Resend to Tenant' : 'Send to Tenant'}
                    </Button>
                  </>
                )}
              </div>
              {pdfGenerated && (
                <p className="mt-4 flex items-center justify-center gap-2 font-serif text-sm italic text-ink-muted">
                  <FileCheck className="h-4 w-4 shrink-0" />
                  PDF generated. You can download it again or send the lease to your tenant.
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line/40 pt-6">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={draftSaving}
                    onClick={() => void handleSaveDraft()}
                  >
                    {draftSaving ? 'Saving…' : 'Save Draft'}
                  </Button>
                  {draftMessage && (
                    <span
                      className={
                        draftMessage === 'Draft saved.'
                          ? 'text-xs font-medium text-brand'
                          : 'text-xs text-accent'
                      }
                    >
                      {draftMessage}
                    </span>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <ContractFormLayout
          step={step}
          totalSteps={STEPS.length}
          stepMeta={STEP_META[step]}
          footer={footer}
        >
          {step === 0 && (
            <div className="mx-auto max-w-lg space-y-8">
              <ContractInput
                label="Tenant Full Name"
                value={contract.clientName}
                onChange={(e) => update('clientName', e.target.value)}
              />
              <ContractInput
                label="Tenant Email"
                type="email"
                value={contract.email}
                onChange={(e) => update('email', e.target.value)}
              />
              <ContractInput
                label="Tenant Phone"
                value={contract.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
              <ContractInput
                label="Tenant Mailing Address"
                hint="optional — current mailing address if different from the rental"
                value={contract.businessName || ''}
                onChange={(e) => update('businessName', e.target.value)}
              />
              <ContractTextarea
                label="Landlord / Company Information"
                value={contract.portfolioRights}
                onChange={(e) => update('portfolioRights', e.target.value)}
                rows={5}
              />
            </div>
          )}

          {step === 1 && (
            <div className="mx-auto max-w-lg space-y-8">
              <ContractInput
                label="Rental Property Address"
                value={contract.clientAddress || ''}
                onChange={(e) => update('clientAddress', e.target.value)}
              />
              <ContractInput
                label="Lease Title"
                value={contract.projectTitle}
                onChange={(e) => update('projectTitle', e.target.value)}
              />
              <ContractTextarea
                label="Premises Details"
                hint="Unit number, rental type, bedrooms, max tenants, lease duration"
                value={contract.projectScope}
                onChange={(e) => update('projectScope', e.target.value)}
                rows={5}
              />
              <div className="grid gap-8 sm:grid-cols-2">
                <ContractInput
                  label="Lease Start Date"
                  type="date"
                  value={emptyOrPlain(contract.startDate)}
                  onChange={(e) => update('startDate', e.target.value)}
                />
                <ContractInput
                  label="Lease End Date"
                  type="date"
                  value={emptyOrPlain(contract.completionDate)}
                  onChange={(e) => update('completionDate', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mx-auto max-w-lg space-y-8">
              <div className="grid gap-8 sm:grid-cols-3">
                <ContractInput
                  label="Monthly Rent"
                  value={emptyOrPlain(contract.totalCost)}
                  onChange={(e) => update('totalCost', e.target.value)}
                  placeholder="$1,850"
                />
                <ContractInput
                  label="Security Deposit"
                  value={emptyOrPlain(contract.depositAmount)}
                  onChange={(e) => update('depositAmount', e.target.value)}
                  placeholder="$1,850"
                />
                <ContractInput
                  label="Move-in Total"
                  hint="optional"
                  value={emptyOrPlain(contract.remainingBalance)}
                  onChange={(e) => update('remainingBalance', e.target.value)}
                  placeholder="$3,700"
                />
              </div>
              <ContractTextarea
                label="Rent Due Date / Payment Schedule"
                value={contract.paymentSchedule}
                onChange={(e) => update('paymentSchedule', e.target.value)}
              />
              <ContractSelect
                label="Invoice Provider"
                hint="checkout method for this tenant"
                value={contract.paymentProvider ?? 'paypal'}
                onChange={(e) => {
                  const provider = e.target.value as PaymentProvider
                  setContract((c) => ({
                    ...c,
                    paymentProvider: provider,
                    paymentMethods: paymentMethodsTextForProvider(provider),
                  }))
                }}
                required
              >
                <option value="paypal">PayPal</option>
                <option value="stripe">Stripe</option>
                <option value="square">Square</option>
              </ContractSelect>
              <ContractSelect
                label="Prepaid rent"
                hint="let tenants pay consecutive months upfront from their portal"
                value={contract.allowPrepaidRent === false ? 'no' : 'yes'}
                onChange={(e) => {
                  setContract((c) => ({
                    ...c,
                    allowPrepaidRent: e.target.value === 'yes',
                  }))
                }}
              >
                <option value="yes">Allow multi-month upfront payments</option>
                <option value="no">Next month only</option>
              </ContractSelect>
              <ContractInput
                label="Payment Methods"
                value={contract.paymentMethods}
                onChange={(e) => update('paymentMethods', e.target.value)}
              />
              <ContractTextarea
                label="Late-Payment Terms"
                value={contract.latePaymentPolicy}
                onChange={(e) => update('latePaymentPolicy', e.target.value)}
              />
            </div>
          )}

          {step === 3 && (
            <div className="mx-auto max-w-lg space-y-8">
              <ContractInput
                label="Occupancy Limit"
                value={emptyOrPlain(contract.revisionCount)}
                onChange={(e) => update('revisionCount', e.target.value)}
                placeholder="e.g. 3"
              />
              <ContractTextarea
                label="Occupancy & Permitted Use"
                value={contract.deliverables}
                onChange={(e) => update('deliverables', e.target.value)}
                rows={4}
              />
              <ContractTextarea
                label="Utilities & Services Included"
                value={emptyOrPlain(contract.servicesIncluded)}
                onChange={(e) => update('servicesIncluded', e.target.value)}
                rows={3}
              />
              <ContractTextarea
                label="Utilities Tenant Pays"
                value={emptyOrPlain(contract.servicesNotIncluded)}
                onChange={(e) => update('servicesNotIncluded', e.target.value)}
                rows={3}
              />
              <ContractTextarea
                label="Maintenance Responsibilities"
                value={contract.clientResponsibilities}
                onChange={(e) => update('clientResponsibilities', e.target.value)}
                rows={5}
              />
              <ContractTextarea
                label="Pets"
                value={emptyOrPlain(contract.revisionLimits)}
                onChange={(e) => update('revisionLimits', e.target.value)}
                rows={3}
              />
              <ContractInput
                label="Pet Deposit / Fee"
                hint="optional"
                value={emptyOrPlain(contract.extraRevisionFee)}
                onChange={(e) => update('extraRevisionFee', e.target.value)}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-10">
              <div className="mx-auto max-w-lg space-y-8">
                <ContractTextarea
                  label="Property-Use Rules"
                  value={contract.ownershipTerms}
                  onChange={(e) => update('ownershipTerms', e.target.value)}
                  rows={4}
                />
                <ContractTextarea
                  label="Entry & Inspection"
                  value={contract.meetingExpectations}
                  onChange={(e) => update('meetingExpectations', e.target.value)}
                  rows={4}
                />
                <ContractTextarea
                  label="Renewal or Termination"
                  value={contract.terminationTerms}
                  onChange={(e) => update('terminationTerms', e.target.value)}
                  rows={5}
                />
                <ContractInput
                  label="Notices"
                  value={contract.communicationMethod}
                  onChange={(e) => update('communicationMethod', e.target.value)}
                />
                <ContractInput
                  label="Notice Period"
                  hint="follow local law for entry / non-renewal"
                  value={emptyOrPlain(contract.responseTime)}
                  onChange={(e) => update('responseTime', e.target.value)}
                />
              </div>

              <div className="mx-auto max-w-md space-y-10 border-t border-line/40 pt-10">
                <ContractSignatureRow
                  label="Landlord"
                  hint="Signature & Date"
                  value={contract.designerSignature || settings.ownerName}
                  onChange={(v) => update('designerSignature', v)}
                  placeholder={settings.ownerName}
                />
                <ContractSignatureRow
                  label="Tenant"
                  hint="Signature & Date"
                  value={contract.clientSignature || ''}
                  onChange={(v) => update('clientSignature', v)}
                  placeholder={contract.clientName}
                />
                <div className="grid gap-8 sm:grid-cols-2">
                  <ContractInput
                    label="Landlord Signature Date"
                    type="date"
                    value={contract.designerSignDate || ''}
                    onChange={(e) => update('designerSignDate', e.target.value)}
                  />
                  <ContractInput
                    label="Tenant Signature Date"
                    type="date"
                    value={contract.clientSignDate || ''}
                    onChange={(e) => update('clientSignDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </ContractFormLayout>
      )}

      <SendContractModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        client={client}
        contract={contract}
        onSent={() => {}}
      />
    </div>
  )
}
