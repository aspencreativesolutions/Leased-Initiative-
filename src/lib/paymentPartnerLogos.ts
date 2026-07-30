import type { PaymentProvider } from '@/types'

export type PaymentPartnerLogo = {
  src: string
  alt: string
  /** Official company site — footer logos link here */
  href: string
  /** Optional per-logo height class override */
  className?: string
}

/** Payment partner marks keyed by provider — used on auth pages and payment tiles */
export const paymentPartnerLogoByProvider: Record<PaymentProvider, PaymentPartnerLogo> = {
  stripe: {
    src: '/images/payment-logos/stripe.png',
    alt: 'Stripe',
    href: 'https://stripe.com',
    className: 'h-7 sm:h-8',
  },
  paypal: {
    src: '/images/payment-logos/paypal.png',
    alt: 'PayPal',
    href: 'https://www.paypal.com',
    className: 'h-9 sm:h-10',
  },
  square: {
    src: '/images/payment-logos/square.png',
    alt: 'Square',
    href: 'https://squareup.com',
    className: 'h-8 w-8 sm:h-9 sm:w-9',
  },
  zelle: {
    src: '/images/payment-logos/zelle.png',
    alt: 'Zelle',
    href: 'https://www.zellepay.com',
    className: 'h-7 sm:h-8',
  },
}

/** Payment partner marks shown on client auth pages — add more logos here as needed */
export const paymentPartnerLogos: PaymentPartnerLogo[] = [
  paymentPartnerLogoByProvider.stripe,
  paymentPartnerLogoByProvider.paypal,
  paymentPartnerLogoByProvider.square,
  paymentPartnerLogoByProvider.zelle,
]
