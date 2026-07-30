/**
 * Tenant setup notify helpers for Add Tenant → Generate Agreement & Notify.
 */
import { isAccountCreationEnabled } from './accountCreation.js'

export function buildAccountSetupUrl() {
  const base = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')
  if (isAccountCreationEnabled()) {
    return `${base}/register`
  }
  return `${base}/account-setup`
}

export function buildTenantSetupSmsBody({ name, landlordCompany, propertyAddress, setupUrl }) {
  const who = name?.trim() || 'there'
  const landlord = landlordCompany?.trim() || 'your landlord'
  const address = propertyAddress?.trim()
  const addressPart = address ? ` for ${address}` : ''
  return `Hi ${who}, ${landlord} prepared a lease agreement${addressPart}. Set up your account here: ${setupUrl}`
}
