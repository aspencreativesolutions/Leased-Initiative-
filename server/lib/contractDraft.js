import { generateId } from './notifications.js'

const DEFAULT_CLIENT_RESPONSIBILITIES = `The client agrees to provide all necessary content, images, login credentials, approvals, and feedback in a timely manner. Delays in client responses or deliverables may extend the project timeline and completion date accordingly.`

const DEFAULT_OWNERSHIP = `Upon receipt of full payment, the client owns the final website/design deliverables. Until full payment is received, all work remains the property of the designer/developer.`

const DEFAULT_PORTFOLIO = `The designer/developer may display the completed project in their portfolio and marketing materials unless otherwise agreed in writing.`

const DEFAULT_TERMINATION = `Either party may terminate this agreement with written notice. If terminated by the client after work has begun, the deposit is non-refundable and the client is responsible for payment for all work completed to date. If the client becomes unresponsive for more than 14 business days, the designer may pause work and invoice for work completed.`

export function createDraftContract(client, settings) {
  return {
    id: generateId(),
    clientId: client.id,
    clientName: client.name,
    businessName: client.businessName,
    email: client.email,
    phone: client.phone || '',
    clientAddress: '',
    serviceTier: client.serviceTier || 'Starter',
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
    clientResponsibilities: DEFAULT_CLIENT_RESPONSIBILITIES,
    communicationMethod: 'Email',
    responseTime: '1-2 business days',
    meetingExpectations: 'Scheduled calls as needed; 24-hour notice for rescheduling.',
    ownershipTerms: DEFAULT_OWNERSHIP,
    portfolioRights: DEFAULT_PORTFOLIO,
    terminationTerms: DEFAULT_TERMINATION,
    createdAt: new Date().toISOString(),
  }
}
