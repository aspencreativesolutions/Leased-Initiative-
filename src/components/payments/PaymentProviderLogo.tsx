import { paymentPartnerLogoByProvider } from '@/lib/paymentPartnerLogos'
import { paymentProviderLabel, resolvePaymentProvider } from '@/lib/paymentProvider'
import { cn } from '@/lib/utils'
import type { PaymentProvider } from '@/types'

const SIZE_CLASS: Record<'xs' | 'sm' | 'md', string> = {
  xs: 'h-3.5 max-h-3.5 max-w-[2.75rem]',
  sm: 'h-5 max-h-5 max-w-[3.5rem]',
  md: 'h-6 max-h-6 max-w-[4.25rem]',
}

const SQUARE_SIZE_CLASS: Record<'xs' | 'sm' | 'md', string> = {
  xs: 'h-3.5 w-3.5 max-w-none',
  sm: 'h-5 w-5 max-w-none',
  md: 'h-6 w-6 max-w-none',
}

interface PaymentProviderLogoProps {
  provider?: PaymentProvider | null
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

/** Scaled PayPal / Stripe / Square / Zelle mark for payment method & processor fields. */
export function PaymentProviderLogo({
  provider,
  size = 'sm',
  className,
}: PaymentProviderLogoProps) {
  const resolved = resolvePaymentProvider(provider ?? undefined)
  const logo = paymentPartnerLogoByProvider[resolved]
  const label = paymentProviderLabel(resolved)
  const isSquare = resolved === 'square'

  return (
    <img
      src={logo.src}
      alt={label}
      title={label}
      loading="lazy"
      decoding="async"
      className={cn(
        'inline-block w-auto object-contain object-left align-middle',
        isSquare ? SQUARE_SIZE_CLASS[size] : SIZE_CLASS[size],
        className
      )}
    />
  )
}
