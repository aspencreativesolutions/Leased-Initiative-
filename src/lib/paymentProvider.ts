import type { Client, ClientInvoice, ContractData, PaymentProvider } from '@/types'

export const PAYMENT_PROVIDERS: PaymentProvider[] = [
  'paypal',
  'stripe',
  'square',
  'zelle',
]

const PROVIDERS: PaymentProvider[] = PAYMENT_PROVIDERS

export function resolvePaymentProvider(provider?: PaymentProvider): PaymentProvider {
  if (provider && PROVIDERS.includes(provider)) return provider
  return 'paypal'
}

function providerFromPaidInvoice(invoice?: ClientInvoice): PaymentProvider | undefined {
  if (!invoice?.paidAt) return undefined
  return invoice.paymentProvider
}

/**
 * Prefer the processor recorded on the most recent paid invoice; fall back to
 * the lease contract’s configured checkout provider.
 */
export function resolveLastTransactionPaymentProvider(
  client?: Pick<Client, 'rentInvoice' | 'finalInvoice' | 'invoice'>,
  contract?: Pick<ContractData, 'paymentProvider'>
): PaymentProvider {
  return resolvePaymentProvider(
    providerFromPaidInvoice(client?.rentInvoice) ??
      providerFromPaidInvoice(client?.finalInvoice) ??
      providerFromPaidInvoice(client?.invoice) ??
      contract?.paymentProvider
  )
}

export function paymentProviderLabel(provider?: PaymentProvider): string {
  switch (resolvePaymentProvider(provider)) {
    case 'stripe':
      return 'Stripe'
    case 'square':
      return 'Square'
    case 'zelle':
      return 'Zelle'
    default:
      return 'PayPal'
  }
}

export function portalPayButtonLabel(provider?: PaymentProvider): string {
  switch (resolvePaymentProvider(provider)) {
    case 'stripe':
      return 'Pay with card (Stripe)'
    case 'square':
      return 'Pay with Square'
    case 'zelle':
      return 'Pay with Zelle'
    default:
      return 'Pay with PayPal'
  }
}

export function invoiceButtonLabel(
  provider: PaymentProvider | undefined,
  invoiceType: 'deposit' | 'final'
): string {
  const name = paymentProviderLabel(provider)
  return invoiceType === 'deposit' ? `${name} deposit invoice` : `${name} balance invoice`
}

export function paymentMethodsTextForProvider(provider: PaymentProvider): string {
  switch (provider) {
    case 'stripe':
      return 'Credit card via Stripe (secure checkout link)'
    case 'square':
      return 'Credit card via Square (secure checkout link)'
    case 'zelle':
      return 'Zelle bank transfer (portal pay instructions + landlord confirm)'
    default:
      return 'PayPal (secure checkout link)'
  }
}

export function isZelleProvider(provider?: PaymentProvider | null): boolean {
  return resolvePaymentProvider(provider ?? undefined) === 'zelle'
}
