import { createPayPalOrder, isPayPalConfigured } from './paypal.js'
import { createStripeCheckoutSession, isStripeConfigured } from './stripe.js'
import { createSquarePaymentLink, isSquareConfigured } from './square.js'

export function getContractPaymentProvider(contract) {
  const provider = contract?.paymentProvider
  if (provider === 'stripe' || provider === 'square') return provider
  return 'paypal'
}

export function paymentProviderLabel(provider) {
  if (provider === 'stripe') return 'Stripe'
  if (provider === 'square') return 'Square'
  return 'PayPal'
}

export function isPaymentProviderConfigured(provider) {
  if (provider === 'stripe') return isStripeConfigured()
  if (provider === 'square') return isSquareConfigured()
  return isPayPalConfigured()
}

/**
 * Attach a hosted checkout link to an invoice draft using the contract's payment provider.
 */
export async function attachPaymentLink(
  invoice,
  {
    contract,
    clientId,
    invoiceType = 'deposit',
    returnPath = '/portal/payment/success',
    cancelPath = '/portal?payment=cancelled',
  }
) {
  const provider = getContractPaymentProvider(contract)
  const base = { ...invoice, paymentProvider: provider }

  if (provider === 'stripe' && isStripeConfigured()) {
    const session = await createStripeCheckoutSession({
      clientId,
      amount: invoice.amount,
      currency: invoice.currency,
      description: invoice.description,
      invoiceType,
      returnPath,
      cancelPath,
    })
    return {
      ...base,
      stripeSessionId: session.sessionId,
      paymentLink: session.paymentLink,
    }
  }

  if (provider === 'square' && isSquareConfigured()) {
    const link = await createSquarePaymentLink({
      clientId,
      amount: invoice.amount,
      currency: invoice.currency,
      description: invoice.description,
      invoiceType,
      returnPath,
    })
    return {
      ...base,
      squarePaymentLinkId: link.paymentLinkId,
      squareOrderId: link.orderId,
      paymentLink: link.paymentLink,
    }
  }

  if (provider === 'paypal' && isPayPalConfigured()) {
    const order = await createPayPalOrder({
      clientId,
      amount: invoice.amount,
      currency: invoice.currency,
      description: invoice.description,
      returnPath,
      cancelPath,
    })
    return {
      ...base,
      paypalOrderId: order.orderId,
      paymentLink: order.approvalUrl,
    }
  }

  return base
}
