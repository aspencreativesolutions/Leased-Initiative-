import Link from "next/link";
import { PaymentPartnerLogos } from "@/components/PaymentPartnerLogos";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-900">
      <div className="site-shell py-8 sm:py-10">
        <p className="text-sm font-bold text-neutral-900">{site.name}</p>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-neutral-500">
          {site.tagline}
        </p>

        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] tracking-wider">
          <Link href="/" className="hover:opacity-60">
            HOME
          </Link>
          <Link href="/portfolio" className="hover:opacity-60">
            PORTFOLIO
          </Link>
          <Link href="/contracts" className="hover:opacity-60">
            CONTRACTS
          </Link>
          <Link href="/services" className="hover:opacity-60">
            SERVICES
          </Link>
          <Link href="/contact" className="hover:opacity-60">
            CONTACT
          </Link>
          <a href="/studio/login" className="hover:opacity-60">
            STUDIO
          </a>
          <a href="/login" className="hover:opacity-60">
            CLIENT PORTAL
          </a>
          <a href={`mailto:${site.email}`} className="hover:opacity-60">
            EMAIL
          </a>
        </div>

        <PaymentPartnerLogos />

        <p className="mt-8 text-[10px] font-medium tracking-[0.15em] text-neutral-500">
          Copyright © {site.name} {new Date().getFullYear()} All Rights
          Reserved.
        </p>
      </div>
    </footer>
  );
}
