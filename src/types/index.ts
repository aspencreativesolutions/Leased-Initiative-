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

export type PaymentStatus =
  | 'Unpaid'
  | 'Pay Link Clicked'
  | 'Deposit Paid'
  | 'Partial'
  | 'Paid'
  | 'Overdue'

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

export interface TimelineStepSkip {
  skippedAt: string
}

export interface Note {
  id: string
  text: string
  createdAt: string
  category?: NoteCategory
  /** Links note back to a timeline step (skip notes) */
  timelineStepId?: string
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
  /** When admin delivered the invoice link to the client portal */
  sentToPortalAt?: string
  /** When the client opened the PayPal payment link */
  paymentLinkClickedAt?: string
  invoiceType?: 'deposit' | 'final'
}

export interface PortalInvoice {
  amount: number
  currency: string
  description: string
  paymentLink?: string
  sentToPortalAt?: string
  paidAt?: string
  invoiceType?: 'deposit' | 'final'
}

export type TimelineStepStatus = 'completed' | 'pending' | 'active'

export interface TimelineSubEvent {
  id: string
  label: string
  completedAt: string
  detail?: string
}

export interface ProjectTimelineStep {
  id: string
  label: string
  status: TimelineStepStatus
  completedAt?: string
  detail?: string
  skipped?: boolean
  subEvents?: TimelineSubEvent[]
}

export type UserRole = 'admin' | 'client'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  clientId?: string | null
  /** Client portal style — persisted across sessions */
  portalThemeId?: string
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: User
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
  /** Remaining balance invoice — auto-generated when project is marked complete */
  finalInvoice?: ClientInvoice
  /** Admin manually confirmed deposit after PayPal verification */
  depositPaymentConfirmedAt?: string
  /** When all deliverables are fulfilled */
  projectCompletedAt?: string
  followUpDate?: string
  notes: Note[]
  deadlines: Deadline[]
  profileNotes?: string
  /** Demo client from initial sample data */
  isSampleClient?: boolean
  /** Linked client portal account */
  accountUserId?: string
  /** Service tier for this project — syncs to contract; changing it requires contract resend */
  serviceTier?: ServiceTier
  /** Set when admin clicks Start Project — unlocks portal uploads */
  projectStartedAt?: string
  /** Admin-skipped timeline steps (step id → skip timestamp) */
  timelineStepSkips?: Record<string, TimelineStepSkip>
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
  /** Sent to client portal */
  sentAt?: string
  viewedAt?: string
  signedAt?: string
  confirmedByClient?: boolean
}

export type PortalContractClientStatus = 'Pending Review' | 'Viewed' | 'Accepted'

export interface PortalContractSummary {
  id: string
  projectTitle: string
  totalCost: string
  sentAt?: string
  signedAt?: string
  viewedAt?: string
  confirmedByClient: boolean
  pdfGenerated: boolean
  portalStatus: PortalContractClientStatus
}

export interface PendingRegistration {
  id: string
  name: string
  email: string
  createdAt: string
}

export type AdminNotificationType =
  | 'registration'
  | 'contract_signed'
  | 'invoice_sent'
  | 'payment_link_clicked'

export interface AdminNotification {
  id: string
  type: AdminNotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
  userId?: string
  clientId?: string
  contractId?: string
}

export interface ProjectFileNote {
  id: string
  text: string
  createdAt: string
  authorName: string
  authorRole: 'admin' | 'client'
}

export interface ProjectFile {
  id: string
  clientId: string
  projectName: string
  originalName: string
  storedName: string
  mimeType: string
  size: number
  uploadedBy: 'admin' | 'client'
  uploadedByName: string
  createdAt: string
  notes?: ProjectFileNote[]
}

export interface PortalSupportContact {
  businessName: string
  ownerName: string
  email: string
  phone: string
}

export interface PortalDashboard {
  linked: boolean
  isOfficialClient: boolean
  client: {
    id: string
    name: string
    businessName: string
    projectName: string
    projectStatus: ProjectStatus
    contractStatus: ContractStatus
    paymentStatus?: PaymentStatus
    portalContractStatus: PortalContractClientStatus | null
  } | null
  contracts: PortalContractSummary[]
  invoice?: PortalInvoice | null
  finalInvoice?: PortalInvoice | null
  projectStarted: boolean
  projectStartedAt?: string
  supportContact?: PortalSupportContact
  message?: string
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
