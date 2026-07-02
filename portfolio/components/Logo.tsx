import Link from "next/link";
import { site } from "@/lib/site";

export function Logo() {
  return (
    <Link href="/" className="logo-lockup" aria-label={`${site.name} — ${site.subtitle}`}>
      <span className="logo-mark" aria-hidden>
        {site.acronym.toLowerCase()}
      </span>
      <span className="logo-text">
        <span className="logo-name">{site.name}</span>
        <span className="logo-subtitle">{site.subtitle}</span>
      </span>
    </Link>
  );
}
