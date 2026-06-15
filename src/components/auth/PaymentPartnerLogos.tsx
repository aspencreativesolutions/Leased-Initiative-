import { paymentPartnerLogos } from '@/lib/paymentPartnerLogos'

export function PaymentPartnerLogos() {
  if (paymentPartnerLogos.length === 0) return null

  return (
    <div className="mt-6 w-full border-t border-ink/10 bg-surface px-4 py-4">
      <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
        Secure payments powered by
      </p>
      <ul className="flex flex-wrap items-center justify-center gap-8 sm:gap-10">
        {paymentPartnerLogos.map((logo) => (
          <li key={logo.src}>
            <img
              src={logo.src}
              alt={logo.alt}
              className={`bg-transparent object-contain ${logo.className ?? 'h-8 w-auto'}`}
              loading="lazy"
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
