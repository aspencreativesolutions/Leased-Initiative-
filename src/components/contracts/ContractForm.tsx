import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Mail, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Select, Textarea } from '@/components/ui/FormField'
import { useApp } from '@/context/AppContext'
import { downloadContractPdf } from '@/lib/pdf'
import { generateId } from '@/lib/storage'
import { EmailContractModal } from './EmailContractModal'
import type { BusinessSettings, Client, ContractData, ServiceTier } from '@/types'
import { SERVICE_TIERS } from '@/lib/scheduler'

const STEPS = [
  'Client Details',
  'Project Scope',
  'Payment Terms',
  'Revisions & Responsibilities',
  'Termination & Signatures',
  'Review & Generate PDF',
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
  return {
    id: generateId(),
    clientId: client.id,
    clientName: client.name,
    businessName: client.businessName,
    email: client.email,
    phone: client.phone,
    clientAddress: '',
    serviceTier: 'Business' as ServiceTier,
    projectTitle: client.projectName,
    projectScope: client.projectDescription || '',
    servicesIncluded: '',
    servicesNotIncluded: '',
    deliverables: '',
    startDate: '',
    completionDate: '',
    totalCost: '',
    depositAmount: '',
    remainingBalance: '',
    paymentSchedule: settings.defaultPaymentTerms,
    paymentMethods: 'Bank transfer, credit card, PayPal',
    latePaymentPolicy: 'Late payments may incur a 1.5% monthly fee on outstanding balances.',
    revisionCount: settings.defaultRevisionLimit,
    extraRevisionFee: '',
    revisionLimits: 'Revisions must be requested within 14 days of delivery.',
    clientResponsibilities: defaultClientResponsibilities,
    communicationMethod: 'Email',
    responseTime: '1-2 business days',
    meetingExpectations: 'Scheduled calls as needed; 24-hour notice for rescheduling.',
    ownershipTerms: defaultOwnership,
    portfolioRights: defaultPortfolio,
    terminationTerms: defaultTermination,
    createdAt: new Date().toISOString(),
  }
}

export function ContractForm({ client, existingContract }: ContractFormProps) {
  const { settings, saveContract, updateClient } = useApp()
  const [step, setStep] = useState(0)
  const [contract, setContract] = useState<ContractData>(
    existingContract || emptyContract(client, settings)
  )
  const [emailOpen, setEmailOpen] = useState(false)
  const [pdfGenerated, setPdfGenerated] = useState(existingContract?.pdfGenerated ?? false)

  const update = (field: keyof ContractData, value: string) =>
    setContract((c) => ({ ...c, [field]: value }))

  const handleSaveDraft = () => {
    saveContract(contract)
    updateClient(client.id, { contractStatus: 'Draft in Progress' })
  }

  const handleGeneratePdf = () => {
    const updated = { ...contract, pdfGenerated: true }
    setContract(updated)
    saveContract(updated)
    downloadContractPdf(updated, settings)
    setPdfGenerated(true)
    updateClient(client.id, { contractStatus: 'Generated' })
  }

  const canProceed = step < STEPS.length - 1

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={`rounded-sm border-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-caps transition-colors ${
              i === step
                ? 'border-ink bg-ink text-surface-paper'
                : i < step
                  ? 'border-ink-muted bg-surface text-ink'
                  : 'border-line bg-transparent text-ink-faint'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <Card padding="lg">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Client Name" value={contract.clientName} onChange={(e) => update('clientName', e.target.value)} />
            <Input label="Business Name" value={contract.businessName} onChange={(e) => update('businessName', e.target.value)} />
            <Input label="Email" type="email" value={contract.email} onChange={(e) => update('email', e.target.value)} />
            <Input label="Phone" value={contract.phone} onChange={(e) => update('phone', e.target.value)} />
            <Input className="sm:col-span-2" label="Client Address (optional)" value={contract.clientAddress || ''} onChange={(e) => update('clientAddress', e.target.value)} />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Select
              label="Service Tier"
              hint="Used by the weekly scheduler to prioritize client work"
              value={contract.serviceTier ?? 'Starter'}
              onChange={(e) => update('serviceTier', e.target.value)}
              required
            >
              {SERVICE_TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Input label="Project Title" value={contract.projectTitle} onChange={(e) => update('projectTitle', e.target.value)} />
            <Textarea label="Project Scope" value={contract.projectScope} onChange={(e) => update('projectScope', e.target.value)} rows={4} />
            <Textarea label="Services Included" value={contract.servicesIncluded} onChange={(e) => update('servicesIncluded', e.target.value)} placeholder="e.g. Custom homepage, 5 inner pages, mobile responsive design..." />
            <Textarea label="Services Not Included" value={contract.servicesNotIncluded} onChange={(e) => update('servicesNotIncluded', e.target.value)} placeholder="e.g. Copywriting, photography, ongoing hosting..." />
            <Textarea label="Project Deliverables" value={contract.deliverables} onChange={(e) => update('deliverables', e.target.value)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Start Date" type="date" value={contract.startDate} onChange={(e) => update('startDate', e.target.value)} />
              <Input label="Estimated Completion" type="date" value={contract.completionDate} onChange={(e) => update('completionDate', e.target.value)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Total Project Cost" value={contract.totalCost} onChange={(e) => update('totalCost', e.target.value)} placeholder="$5,000" />
              <Input label="Deposit Amount" value={contract.depositAmount} onChange={(e) => update('depositAmount', e.target.value)} placeholder="$2,500" />
              <Input label="Remaining Balance" value={contract.remainingBalance} onChange={(e) => update('remainingBalance', e.target.value)} placeholder="$2,500" />
            </div>
            <Textarea label="Payment Schedule" value={contract.paymentSchedule} onChange={(e) => update('paymentSchedule', e.target.value)} />
            <Input label="Accepted Payment Methods" value={contract.paymentMethods} onChange={(e) => update('paymentMethods', e.target.value)} />
            <Textarea label="Late Payment Policy" value={contract.latePaymentPolicy} onChange={(e) => update('latePaymentPolicy', e.target.value)} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Included Revisions" value={contract.revisionCount} onChange={(e) => update('revisionCount', e.target.value)} />
              <Input label="Extra Revision Fee" value={contract.extraRevisionFee} onChange={(e) => update('extraRevisionFee', e.target.value)} placeholder="$150 per round" />
            </div>
            <Textarea label="Revision Timeline / Limits" value={contract.revisionLimits} onChange={(e) => update('revisionLimits', e.target.value)} />
            <Textarea label="Client Responsibilities" value={contract.clientResponsibilities} onChange={(e) => update('clientResponsibilities', e.target.value)} rows={5} />
            <Input label="Preferred Communication" value={contract.communicationMethod} onChange={(e) => update('communicationMethod', e.target.value)} />
            <Input label="Expected Response Time" value={contract.responseTime} onChange={(e) => update('responseTime', e.target.value)} />
            <Textarea label="Meeting / Call Expectations" value={contract.meetingExpectations} onChange={(e) => update('meetingExpectations', e.target.value)} />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Textarea label="Ownership Terms" value={contract.ownershipTerms} onChange={(e) => update('ownershipTerms', e.target.value)} rows={4} />
            <Textarea label="Portfolio Rights" value={contract.portfolioRights} onChange={(e) => update('portfolioRights', e.target.value)} rows={3} />
            <Textarea label="Termination Conditions" value={contract.terminationTerms} onChange={(e) => update('terminationTerms', e.target.value)} rows={5} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Client Signature (typed)" value={contract.clientSignature || ''} onChange={(e) => update('clientSignature', e.target.value)} placeholder="Client name" />
              <Input label="Designer Signature (typed)" value={contract.designerSignature || settings.ownerName} onChange={(e) => update('designerSignature', e.target.value)} />
              <Input label="Client Sign Date" type="date" value={contract.clientSignDate || ''} onChange={(e) => update('clientSignDate', e.target.value)} />
              <Input label="Designer Sign Date" type="date" value={contract.designerSignDate || ''} onChange={(e) => update('designerSignDate', e.target.value)} />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div className="rounded-sm border-2 border-ink bg-surface p-4 text-sm text-ink">
              <p className="label-caps text-accent">Review</p>
              <p className="mt-1">
                Contract for <strong>{contract.businessName}</strong> — {contract.projectTitle}
              </p>
              <p className="mt-2 text-ink-muted">
                Total: {contract.totalCost || '—'} · Deposit: {contract.depositAmount || '—'} · Tier:{' '}
                {contract.serviceTier || 'Starter'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleGeneratePdf}>
                <Download className="h-4 w-4" />
                Generate Contract PDF
              </Button>
              {pdfGenerated && (
                <>
                  <Button variant="outline" onClick={() => downloadContractPdf(contract, settings)}>
                    <Download className="h-4 w-4" />
                    Download Again
                  </Button>
                  <Button variant="secondary" onClick={() => setEmailOpen(true)}>
                    <Mail className="h-4 w-4" />
                    Email Contract to Client
                  </Button>
                </>
              )}
            </div>
            {pdfGenerated && (
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-caps text-ink">
                <FileCheck className="h-4 w-4" />
                PDF generated. Contract status updated to Generated.
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={handleSaveDraft}>
          Save Draft
        </Button>
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          {canProceed && (
            <Button
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

      <EmailContractModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        client={client}
        contract={contract}
        onSent={() => {}}
      />
    </div>
  )
}
