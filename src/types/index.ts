export type ProjectStatus =
  | 'Inquiry'
  | 'In Progress'
  | 'Contract Sent'
  | 'Contract Signed'
  | 'Completed'
  | 'Follow-Up Needed'

export type ContractStatus =
  | 'Not Started'
  | 'Draft in Progress'
  | 'Generated'
  | 'Sent'
  | 'Signed'
  | 'Completed'
  | 'Cancelled'

export type PaymentStatus = 'Unpaid' | 'Deposit Paid' | 'Partial' | 'Paid' | 'Overdue'

export type ProjectType =
  | 'Website Design'
  | 'Website Redesign'
  | 'Branding'
  | 'SEO'
  | 'Maintenance'
  | 'Other'

export type NoteCategory = 'General' | 'Payment' | 'Contract' | 'Project' | 'Follow-Up'

export type ServiceTier = 'Starter' | 'Business' | 'Premium Custom'

export interface SchedulerNote {
  id: string
  text: string
  createdAt: string
  weekStart?: string
}

export interface Note {
  id: string
  text: string
  createdAt: string
  category?: NoteCategory
}

export interface Deadline {
  id: string
  type: 'follow-up' | 'project' | 'contract' | 'payment'
  date: string
  label: string
  notes?: string
  completed?: boolean
}

/** Invoice tied to a client for PayPal checkout */
export interface ClientInvoice {
  description: string
  amount: number
  currency: string
  paypalOrderId?: string
  paypalCaptureId?: string
  /** Hosted checkout URL (approve link) when available */
  paymentLink?: string
  createdAt: string
  paidAt?: string
}

export interface Client {
  id: string
  name: string
  businessName: string
  email: string
  phone: string
  website?: string
  socialLinks?: string
  projectType: ProjectType
  projectName: string
  projectDescription?: string
  projectStatus: ProjectStatus
  contractStatus: ContractStatus
  paymentStatus: PaymentStatus
  /** True after you confirm them post–signed contract */
  isOfficialClient: boolean
  officialClientSince?: string
  invoice?: ClientInvoice
  followUpDate?: string
  notes: Note[]
  deadlines: Deadline[]
  profileNotes?: string
  /** Demo client from initial sample data */
  isSampleClient?: boolean
  createdAt: string
}

export interface ContractData {
  id: string
  clientId: string
  clientName: string
  businessName: string
  email: string
  phone: string
  clientAddress?: string
  /** Service tier — drives weekly scheduler priority */
  serviceTier: ServiceTier
  projectTitle: string
  projectScope: string
  servicesIncluded: string
  servicesNotIncluded: string
  deliverables: string
  startDate: string
  completionDate: string
  totalCost: string
  depositAmount: string
  remainingBalance: string
  paymentSchedule: string
  paymentMethods: string
  latePaymentPolicy: string
  revisionCount: string
  extraRevisionFee: string
  revisionLimits: string
  clientResponsibilities: string
  communicationMethod: string
  responseTime: string
  meetingExpectations: string
  ownershipTerms: string
  portfolioRights: string
  terminationTerms: string
  clientSignature?: string
  designerSignature?: string
  clientSignDate?: string
  designerSignDate?: string
  createdAt: string
  pdfGenerated?: boolean
}

export interface BusinessSettings {
  businessName: string
  ownerName: string
  email: string
  phone: string
  address: string
  logoUrl?: string
  defaultPaymentTerms: string
  defaultRevisionLimit: string
  defaultContractFooter: string
}

export interface EmailDraft {
  to: string
  subject: string
  body: string
}

export interface PayPalCreateOrderResponse {
  orderId: string
  approvalUrl?: string
}

export interface PayPalCaptureResponse {
  orderId: string
  captureId: string
  clientId: string
  amount: string
  currency: string
  status: string
}

export type ScheduleBlockType = 'work' | 'lunch' | 'buffer'

export interface ScheduleBlock {
  id: string
  blockType: ScheduleBlockType
  dayIndex: number
  startTime: string
  endTime: string
  clientId?: string
  clientName?: string
  businessName?: string
  serviceTier?: ServiceTier
  label?: string
  deadlineDate?: string
}

export interface WeekSchedule {
  weekStart: string
  blocks: ScheduleBlock[]
  generatedAt: string
}
