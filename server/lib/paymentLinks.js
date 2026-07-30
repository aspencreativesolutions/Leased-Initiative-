import { createPayPalOrder, isPayPalConfigured } from './paypal.js'
import { createStripeCheckoutSession, isStripeConfigured } from './stripe.js'
import { createSquarePaymentLink, isSquareConfigured } from './square.js'
import {
  buildZelleMemo,
  isZelleConfigured,
  zellePaymentLink,
} from './zelle.js'

export function getContractPaymentProvider(contract) {
  const provider = contract?.paymentProvider
  if (
    provider === 'stripe' ||
    provider === 'square' ||
    provider === 'zelle'
  ) {
    return provider
  }
  return 'paypal'
}

export function paymentProviderLabel(provider) {
  if (provider === 'stripe') return 'Stripe'
  if (provider === 'square') return 'Square'
  if (provider === 'zelle') return 'Zelle'
  return 'PayPal'
}

export function isPaymentProviderConfigured(provider, settings) {
  if (provider === 'stripe') return isStripeConfigured()
  if (provider === 'square') return isSquareConfigured()
  if (provider === 'zelle') return isZelleConfigured(settings)
  return isPayPalConfigured()
}

/**
 * Attach a hosted checkout link (or portal Zelle pay page) to an invoice draft.
 */
export async function attachPaymentLink(
  invoice,
  {
    contract,
    clientId,
    invoiceType = 'deposit',
    returnPath = '/portal/payment/success',
    cancelPath = '/portal?payment=cancelled',
    settings,
  }
) {
  const provider = getContractPaymentProvider(contract)
  const base = { ...invoice, paymentProvider: provider }

  if (provider === 'zelle') {
    if (!isZelleConfigured(settings)) {
      return base
    }
    const dueDate =
      Array.isArray(invoice.dueDates) && invoice.dueDates.length > 0
        ? invoice.dueDates[0]
        : undefined
    return {
      ...base,
      zelleMemo: buildZelleMemo({ clientId, invoiceType, dueDate }),
      paymentLink: zellePaymentLink(invoiceType),
    }
  }

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
