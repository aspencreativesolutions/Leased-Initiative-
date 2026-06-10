import type { PaymentProvider } from '@/types'

const PROVIDERS: PaymentProvider[] = ['paypal', 'stripe', 'square']

export function resolvePaymentProvider(provider?: PaymentProvider): PaymentProvider {
  if (provider && PROVIDERS.includes(provider)) return provider
  return 'paypal'
}

export function paymentProviderLabel(provider?: PaymentProvider): string {
  switch (resolvePaymentProvider(provider)) {
    case 'stripe':
      return 'Stripe'
    case 'square':
      return 'Square'
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
    default:
      return 'Pay with PayPal'
  }
}

export function paymentMethodsTextForProvider(provider: PaymentProvider): string {
  switch (provider) {
    case 'stripe':
      return 'Credit card via Stripe (secure checkout link)'
    case 'square':
      return 'Credit card via Square (secure checkout link)'
    default:
      return 'PayPal (secure checkout link)'
  }
}
