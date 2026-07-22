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
import { DEFAULT_SERVICE_TIER, SERVICE_TIERS } from '@/lib/serviceTiers'
import { buildContractPlaceholderFields } from '@/lib/contractPlaceholders'

const STEPS = [
  'Client Details',
  'Project Scope',
  'Payment Terms',
  'Revisions & Responsibilities',
  'Termination & Signatures',
  'Review & Generate PDF',
]

const STEP_META = [
  {
    heading: 'Client Details.',
    intro:
      'Enter the client’s contact information exactly as it should appear on the agreement.',
  },
  {
    heading: 'Project Scope.',
    intro:
      'Define the work to be delivered, including services, deliverables, and timeline.',
  },
  {
    heading: 'Payment Terms.',
    intro:
      'Set the financial terms, schedule, and accepted payment methods for this project.',
  },
  {
    heading: 'Revisions & Responsibilities.',
    intro:
      'Clarify revision limits, client obligations, and how you will communicate throughout.',
  },
  {
    heading: 'Lease Agreement.',
    intro:
      'Review ownership, termination, and signatures. Both parties should sign before the project begins.',
  },
  {
    heading: 'Review & Generate.',
    intro:
      'Confirm the details below, then generate your PDF or send the lease to your tenant.',
  },
]

const defaultClientResponsibilities = `The client agrees to provide all necessary content, images, login credentials, approvals, and feedback in a timely manner. Delays in client responses or deliverables may extend the project timeline and completion date accordingly.`

const defaultOwnership = `Upon receipt of full payment, the client owns the final website/design deliverables. Until full payment is received, all work remains the property of the designer/developer.`

const defaultPortfolio = `The designer/developer may display the completed project in their portfolio and marketing materials unless otherwise agreed in writing.`

const defaultTermination = `Either party may terminate this agreement with written notice. If terminated by the client after work has begun, the deposit is non-refundable and the client is responsible for payment for all work completed to date. If the client becomes unresponsive for more than 14 business days, the designer may pause work and invoice for work completed.`

interface ContractFormProps {
  client: Client
  existingContract?: ContractData
}

function emptyContract(client: Client, settings: BusinessSettings): ContractData {
  const placeholders = buildContractPlaceholderFields(client)

  return {
    id: generateId(),
    clientId: client.id,
    clientName: client.name,
    businessName: client.businessName,
    email: client.email,
    phone: client.phone,
    clientAddress: '',
    serviceTier: (client.serviceTier ?? DEFAULT_SERVICE_TIER) as ServiceTier,
    projectTitle: client.projectName,
    projectScope: client.projectDescription || '',
    servicesIncluded: placeholders.servicesIncluded,
    servicesNotIncluded: placeholders.servicesNotIncluded,
    deliverables: placeholders.deliverables,
    startDate: placeholders.startDate,
    completionDate: placeholders.completionDate,
    totalCost: placeholders.totalCost,
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
    clientResponsibilities: defaultClientResponsibilities,
    communicationMethod: 'Email',
    responseTime: '1-2 business days',
    meetingExpectations: 'Scheduled calls as needed; 24-hour notice for rescheduling.',
    ownershipTerms: defaultOwnership,
    portfolioRights: defaultPortfolio,
    terminationTerms: defaultTermination,
    isPlaceholderDraft: true,
    createdAt: new Date().toISOString(),
  }
}

export function ContractForm({ client, existingContract }: ContractFormProps) {
  const { settings, saveContract } = useApp()
  const [step, setStep] = useState(0)
  const [contract, setContract] = useState<ContractData>(
    existingContract || emptyContract(client, settings)
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
      {wasSentToClient && (
        <div className="rounded-sm border border-line bg-surface-paper px-5 py-3 text-sm text-ink">
          <p className="font-medium uppercase tracking-[0.1em]">Sent lease — edits re-deliver</p>
          <p className="mt-1 font-serif text-sm italic text-ink-muted">
            Saving changes to a lease already in the portal clears the previous signature and
            sends the updated version back for review and signing.
          </p>
        </div>
      )}

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
                  Generate Lease PDF
                </Button>
                {pdfGenerated && (
                  <>
                    <Button variant="outline" onClick={() => downloadContractPdf(contract, settings)}>
                      <Download className="h-4 w-4" />
                      Download Again
                    </Button>
                    <Button variant="secondary" onClick={() => setEmailOpen(true)}>
                      <Mail className="h-4 w-4" />
                      Send to Tenant
                    </Button>
                  </>
                )}
              </div>
              {pdfGenerated && (
                <p className="mt-4 flex items-center justify-center gap-2 font-serif text-sm italic text-ink-muted">
                  <FileCheck className="h-4 w-4 shrink-0" />
                  PDF generated. Lease status updated to Generated.
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
              label="Tenant Name"
              value={contract.clientName}
              onChange={(e) => update('clientName', e.target.value)}
            />
            <ContractInput
              label="Business Name"
              value={contract.businessName}
              onChange={(e) => update('businessName', e.target.value)}
            />
            <ContractInput
              label="Email"
              type="email"
              value={contract.email}
              onChange={(e) => update('email', e.target.value)}
            />
            <ContractInput
              label="Phone"
              value={contract.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
            <ContractInput
              label="Tenant Address"
              hint="optional"
              value={contract.clientAddress || ''}
              onChange={(e) => update('clientAddress', e.target.value)}
            />
          </div>
        )}

        {step === 1 && (
          <div className="mx-auto max-w-lg space-y-8">
            <ContractSelect
              label="Service Tier"
              hint="used by the weekly scheduler"
              value={contract.serviceTier ?? DEFAULT_SERVICE_TIER}
              onChange={(e) => update('serviceTier', e.target.value)}
              required
            >
              {SERVICE_TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </ContractSelect>
            <ContractInput
              label="Project Title"
              value={contract.projectTitle}
              onChange={(e) => update('projectTitle', e.target.value)}
            />
            <ContractTextarea
              label="Project Scope"
              value={contract.projectScope}
              onChange={(e) => update('projectScope', e.target.value)}
              rows={4}
            />
            <ContractTextarea
              label="Services Included"
              value={contract.servicesIncluded}
              onChange={(e) => update('servicesIncluded', e.target.value)}
              placeholder="e.g. Custom homepage, 5 inner pages, mobile responsive design..."
            />
            <ContractTextarea
              label="Services Not Included"
              value={contract.servicesNotIncluded}
              onChange={(e) => update('servicesNotIncluded', e.target.value)}
              placeholder="e.g. Copywriting, photography, ongoing hosting..."
            />
            <ContractTextarea
              label="Project Deliverables"
              value={contract.deliverables}
              onChange={(e) => update('deliverables', e.target.value)}
            />
            <div className="grid gap-8 sm:grid-cols-2">
              <ContractInput
                label="Start Date"
                type="date"
                value={contract.startDate}
                onChange={(e) => update('startDate', e.target.value)}
              />
              <ContractInput
                label="Estimated Completion"
                type="date"
                value={contract.completionDate}
                onChange={(e) => update('completionDate', e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mx-auto max-w-lg space-y-8">
            <div className="grid gap-8 sm:grid-cols-3">
              <ContractInput
                label="Total Cost"
                value={contract.totalCost}
                onChange={(e) => update('totalCost', e.target.value)}
                placeholder="$5,000"
              />
              <ContractInput
                label="Deposit"
                value={contract.depositAmount}
                onChange={(e) => update('depositAmount', e.target.value)}
                placeholder="$2,500"
              />
              <ContractInput
                label="Balance"
                value={contract.remainingBalance}
                onChange={(e) => update('remainingBalance', e.target.value)}
                placeholder="$2,500"
              />
            </div>
            <ContractTextarea
              label="Payment Schedule"
              value={contract.paymentSchedule}
              onChange={(e) => update('paymentSchedule', e.target.value)}
            />
            <ContractSelect
              label="Invoice Provider"
              hint="checkout method for this client"
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
              hint="let tenants pay consecutive months upfront from their dashboard"
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
              label="Late Payment Policy"
              value={contract.latePaymentPolicy}
              onChange={(e) => update('latePaymentPolicy', e.target.value)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="mx-auto max-w-lg space-y-8">
            <div className="grid gap-8 sm:grid-cols-2">
              <ContractInput
                label="Included Revisions"
                value={contract.revisionCount}
                onChange={(e) => update('revisionCount', e.target.value)}
              />
              <ContractInput
                label="Extra Revision Fee"
                value={contract.extraRevisionFee}
                onChange={(e) => update('extraRevisionFee', e.target.value)}
                placeholder="$150 per round"
              />
            </div>
            <ContractTextarea
              label="Revision Timeline"
              value={contract.revisionLimits}
              onChange={(e) => update('revisionLimits', e.target.value)}
            />
            <ContractTextarea
              label="Tenant Responsibilities"
              value={contract.clientResponsibilities}
              onChange={(e) => update('clientResponsibilities', e.target.value)}
              rows={5}
            />
            <ContractInput
              label="Communication"
              value={contract.communicationMethod}
              onChange={(e) => update('communicationMethod', e.target.value)}
            />
            <ContractInput
              label="Response Time"
              value={contract.responseTime}
              onChange={(e) => update('responseTime', e.target.value)}
            />
            <ContractTextarea
              label="Meeting Expectations"
              value={contract.meetingExpectations}
              onChange={(e) => update('meetingExpectations', e.target.value)}
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-10">
            <div className="mx-auto max-w-lg space-y-8">
              <ContractTextarea
                label="Ownership Terms"
                value={contract.ownershipTerms}
                onChange={(e) => update('ownershipTerms', e.target.value)}
                rows={4}
              />
              <ContractTextarea
                label="Portfolio Rights"
                value={contract.portfolioRights}
                onChange={(e) => update('portfolioRights', e.target.value)}
                rows={3}
              />
              <ContractTextarea
                label="Termination Conditions"
                value={contract.terminationTerms}
                onChange={(e) => update('terminationTerms', e.target.value)}
                rows={5}
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
                  label="Landlord Date"
                  type="date"
                  value={contract.designerSignDate || ''}
                  onChange={(e) => update('designerSignDate', e.target.value)}
                />
                <ContractInput
                  label="Tenant Date"
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
