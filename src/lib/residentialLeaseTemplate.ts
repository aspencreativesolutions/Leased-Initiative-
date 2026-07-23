/**
 * Residential lease agreement template.
 * Field values map onto existing ContractData keys for compatibility.
 * Jurisdiction-dependent language is framed as configurable defaults, not universal law.
 */

export const PLACEHOLDER_MARKER = '[To be customized]'

/** Blank editable field — never invent rent or deposit amounts. */
export function blankField(label: string): string {
  return `${PLACEHOLDER_MARKER} ${label}`
}

export function isBlankLeaseField(value: unknown): boolean {
  const trimmed = String(value ?? '').trim()
  return !trimmed || trimmed.includes(PLACEHOLDER_MARKER)
}

/**
 * Default residential clauses. Local statutes (habitability, deposit caps, notice
 * periods, pet rules, etc.) should later be selected by property state/locality.
 */
export const RESIDENTIAL_LEASE_DEFAULTS = {
  utilitiesIncluded: blankField(
    'List utilities and services included in rent (e.g. water, trash). Leave blank if none.'
  ),
  utilitiesTenantPays: blankField(
    'List utilities the tenant pays directly (e.g. electricity, gas, internet).'
  ),
  occupancyAndUse: `Occupancy is limited to the tenants named in this agreement and any additional occupants approved in writing by the landlord. The premises may be used only as a private residential dwelling. Commercial use, short-term subletting, and unlawful activity are prohibited. Local occupancy and zoning rules apply where required.`,
  maintenanceResponsibilities: `The tenant shall keep the premises reasonably clean and sanitary, promptly report damage or needed repairs, and not alter the premises without written landlord consent. The landlord is responsible for maintaining habitability and making necessary repairs within a reasonable time after notice, subject to applicable local housing standards.`,
  propertyUseRules: `Quiet enjoyment for all residents is required. Excessive noise, hazards, and unapproved alterations are prohibited. Smoking rules, parking, common-area use, and building policies (if any) are set by the landlord in writing and may be updated with reasonable notice. Property-specific house rules may be attached as an addendum.`,
  petsPolicy: blankField(
    'State pet policy (no pets / pets allowed with written approval / breed or size limits / pet deposit). Subject to local fair-housing and assistance-animal rules.'
  ),
  entryAndInspection: `The landlord may enter the premises for inspections, repairs, showings, or emergencies as permitted by applicable law. Except in emergencies, the landlord will provide reasonable advance notice (commonly 24 hours where required by local statute) and enter at reasonable times.`,
  renewalAndTermination: `Unless renewed in writing, this lease ends on the stated end date. Early termination, holdover, and notice requirements follow the lease terms and applicable local/state law. Either party should provide written notice of non-renewal according to the notice period required where the property is located.`,
  notices: `Notices under this agreement may be delivered by email to the addresses listed herein, by personal delivery, or by certified mail to the business mailing address (landlord) or premises / mailing address (tenant), unless local law requires a specific method.`,
  latePaymentPolicy: `Rent is due on the due date stated in this agreement. Late payments may incur a late fee only as permitted by applicable state and local law. Returned-payment fees may apply where allowed. This clause does not waive any statutory tenant protections.`,
  paymentSchedule: 'Monthly rent due on the 1st of each month for the lease term.',
  paymentMethods: 'Portal checkout (PayPal, Stripe, or Square as configured by the landlord).',
}

type LeaseClient = {
  name?: string
  projectName?: string
  projectType?: string
  leaseLengthMonths?: number
}

type LeaseSettings = {
  businessName?: string
  ownerName?: string
  email?: string
  phone?: string
  address?: string
  defaultPaymentTerms?: string
}

type LeaseProperty = {
  address?: string
  propertyType?: string
  bedrooms?: number
  maxTenants?: number
  unitCount?: number
} | null

type LeaseOptions = {
  clientAddress?: string
  startDate?: string
  completionDate?: string
  paymentSchedule?: string
  leaseLengthMonths?: number
}

/**
 * Build residential lease field values from applicant, landlord settings, and rental.
 * Missing amounts stay blank markers — do not fabricate rent or deposits.
 */
export function buildResidentialLeaseFields({
  client,
  settings = {},
  property = null,
  leaseOptions = {},
}: {
  client?: LeaseClient | null
  settings?: LeaseSettings
  property?: LeaseProperty
  leaseOptions?: LeaseOptions
}) {
  const propertyAddress =
    (leaseOptions.clientAddress && String(leaseOptions.clientAddress).trim()) ||
    (client?.projectName && String(client.projectName).trim()) ||
    (property?.address && String(property.address).trim()) ||
    ''

  const leaseMonths =
    client?.leaseLengthMonths || leaseOptions.leaseLengthMonths || null

  const unitHint =
    property && property.unitCount != null && property.unitCount > 1
      ? blankField('Specify unit number if applicable')
      : ''

  const rentalType = property?.propertyType || client?.projectType || ''
  const bedrooms = property?.bedrooms != null ? String(property.bedrooms) : ''
  const maxTenants = property?.maxTenants != null ? String(property.maxTenants) : ''

  const premisesLines = [
    propertyAddress && `Property address: ${propertyAddress}`,
    unitHint || null,
    rentalType && `Rental type: ${rentalType}`,
    bedrooms && `Bedrooms: ${bedrooms}`,
    maxTenants && `Maximum tenants: ${maxTenants}`,
    leaseMonths && `Lease duration: ${leaseMonths}-month term`,
  ].filter(Boolean)

  const landlordBlock = [
    settings.businessName && `Company: ${settings.businessName}`,
    settings.ownerName && `Authorized representative: ${settings.ownerName}`,
    settings.email && `Email: ${settings.email}`,
    settings.phone && `Phone: ${settings.phone}`,
    settings.address && `Mailing address: ${settings.address}`,
  ]
    .filter(Boolean)
    .join('\n')

  const startDate = leaseOptions.startDate || ''
  const completionDate = leaseOptions.completionDate || ''

  return {
    projectTitle: propertyAddress || `${client?.name || 'Tenant'} Residential Lease`,
    projectScope: premisesLines.length
      ? premisesLines.join('\n')
      : blankField('Describe the rental premises and unit'),
    servicesIncluded: RESIDENTIAL_LEASE_DEFAULTS.utilitiesIncluded,
    servicesNotIncluded: RESIDENTIAL_LEASE_DEFAULTS.utilitiesTenantPays,
    deliverables: RESIDENTIAL_LEASE_DEFAULTS.occupancyAndUse,
    startDate: startDate || blankField('Enter lease start date'),
    completionDate: completionDate || blankField('Enter lease end date'),
    totalCost: blankField('Enter monthly rent amount'),
    depositAmount: blankField('Enter security deposit amount'),
    remainingBalance: blankField('Enter first payment / move-in total if applicable'),
    paymentSchedule:
      leaseOptions.paymentSchedule ||
      settings.defaultPaymentTerms ||
      RESIDENTIAL_LEASE_DEFAULTS.paymentSchedule,
    paymentMethods: RESIDENTIAL_LEASE_DEFAULTS.paymentMethods,
    latePaymentPolicy: RESIDENTIAL_LEASE_DEFAULTS.latePaymentPolicy,
    revisionCount: maxTenants || blankField('Maximum occupants allowed'),
    extraRevisionFee: blankField('Pet deposit or fee (if applicable)'),
    revisionLimits: RESIDENTIAL_LEASE_DEFAULTS.petsPolicy,
    clientResponsibilities: RESIDENTIAL_LEASE_DEFAULTS.maintenanceResponsibilities,
    communicationMethod: 'Email and written notice',
    responseTime: blankField(
      'Notice period for entry / non-renewal (follow local law)'
    ),
    meetingExpectations: RESIDENTIAL_LEASE_DEFAULTS.entryAndInspection,
    ownershipTerms: RESIDENTIAL_LEASE_DEFAULTS.propertyUseRules,
    portfolioRights: landlordBlock
      ? `Landlord / company information:\n${landlordBlock}`
      : blankField('Confirm landlord company and contact details'),
    terminationTerms: RESIDENTIAL_LEASE_DEFAULTS.renewalAndTermination,
    noticesTerms: RESIDENTIAL_LEASE_DEFAULTS.notices,
  }
}
