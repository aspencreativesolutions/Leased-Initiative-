import Image from "next/image";
import { paymentPartnerLogos } from "@/lib/paymentPartnerLogos";

export function PaymentPartnerLogos() {
  if (paymentPartnerLogos.length === 0) return null;

  return (
    <div className="footer-payments">
      <p className="footer-payments-label">Secure payments powered by</p>
      <ul className="footer-payments-logos">
        {paymentPartnerLogos.map((logo) => (
          <li key={logo.src}>
            <a
              href={logo.href}
              target="_blank"
              rel="noopener noreferrer"
              title={`Visit ${logo.alt}`}
              aria-label={`Visit ${logo.alt} (opens in a new tab)`}
            >
              <Image
                src={logo.src}
                alt={logo.alt}
                width={160}
                height={64}
                className={`footer-payments-logo ${logo.className ?? ""}`}
                unoptimized
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
