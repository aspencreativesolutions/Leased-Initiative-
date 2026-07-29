/**
 * Public account creation (register + invite claim).
 * Off until the product is ready — explore via demo accounts.
 * Set ACCOUNT_CREATION_ENABLED=1 to re-enable. E2E always allowed.
 */
export function isAccountCreationEnabled() {
  if (process.env.E2E_TEST === '1') return true
  return process.env.ACCOUNT_CREATION_ENABLED === '1'
}

export const ACCOUNT_CREATION_DISABLED_MESSAGE =
  'Account creation is not available yet. Use a demo account to explore the product.'
