/**
 * Public account creation (register + invite claim).
 * Off until the product is ready — explore the product via demo accounts.
 * Set VITE_ACCOUNT_CREATION=true to re-enable in the client.
 */
export function isAccountCreationEnabled() {
  return import.meta.env.VITE_ACCOUNT_CREATION === 'true'
}
