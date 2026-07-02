import type { Metadata } from "next";
import Link from "next/link";
import { ContractProcessTimeline } from "@/components/ContractProcessTimeline";
import { CreativeStudiosLogo } from "@/components/CreativeStudiosLogo";
import { SiteImage } from "@/components/SiteImage";
import { clientCraft, contractSection } from "@/lib/contracts";
import { siteImages } from "@/lib/placeholders";

export const metadata: Metadata = {
  title: "Contract Info",
  description:
    "How ASPEN Creative handles client contracts with ClientCraft—a structured, professional process.",
};

export default function ContractsPage() {
  return (
    <div className="page-container">
      <p className="contracts-portal-description">
        {clientCraft.portalDescription}
      </p>

      <section className="mt-10">
        <p className="section-label">{contractSection.label}</p>
        <div className="contracts-hero-row">
          <div>
            <h1 className="archive-hero-title mt-3 max-w-3xl">
              {contractSection.headline}
            </h1>
            <p className="archive-hero-lead mt-4 max-w-2xl text-sm sm:text-base">
              {contractSection.subheadline}
            </p>
          </div>
          <SiteImage {...siteImages.contractsAccent} />
        </div>
      </section>

      <a
        href={clientCraft.loginHref}
        className="clientcraft-showcase clientcraft-showcase--link"
        aria-label="Sign in to ClientCraft"
      >
        <div className="clientcraft-logo-wrap">
          <CreativeStudiosLogo />
        </div>
        <p className="clientcraft-caption">
          {clientCraft.name} is the internal program I use to administer every
          client agreement—built for my studio, not borrowed from a generic
          template.
        </p>
        <span className="clientcraft-signin">Sign in to ClientCraft</span>
      </a>

      <ContractProcessTimeline />

      <div className="mt-8 flex justify-end">
        <Link href="/contact" className="btn-primary inline-flex">
          {contractSection.cta}
        </Link>
      </div>
    </div>
  );
}
