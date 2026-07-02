import Link from "next/link";
import { OfferingCard } from "@/components/OfferingCard";
import { SecureIcon } from "@/components/SecureIcon";
import { SunnyMascot } from "@/components/SunnyMascot";
import { TailoredIcon } from "@/components/TailoredIcon";
import { MorphingHeroImage } from "@/components/MorphingHeroImage";
import { SecurityInteractiveSection } from "@/components/SecurityInteractiveSection";
import { SiteImage } from "@/components/SiteImage";
import {
  homeProcessImages,
  siteImages,
} from "@/lib/placeholders";
import { site, homeBeyondTemplates, processPillars, offerings } from "@/lib/site";

export default function HomePage() {
  return (
    <div className="page-container">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="section-label">Welcome to {site.name}</p>
          <p className="hero-subtitle mt-4">{site.heroSubtitle}</p>
          <p className="hero-lead mt-6 max-w-3xl">
            {site.tagline}
          </p>
        </div>
        <MorphingHeroImage />
      </section>

      <section className="mt-16 border-t border-neutral-900 pt-12 sm:mt-20 sm:pt-14">
        <h2 className="archive-hero-title max-w-3xl">
          {homeBeyondTemplates.headline}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-700 sm:text-base">
          {homeBeyondTemplates.intro}
        </p>
      </section>

      <section className="mt-16 border-t border-neutral-200 pt-12 sm:mt-20 sm:pt-14">
        <h2 className="section-label">What we offer</h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-700 sm:text-base">
          From your first landing page to a full-scale digital presence, we
          handle the design, development, and collaboration so you can focus on
          what you do best.
        </p>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {offerings
            .filter((item) => !item.featured)
            .map((item) => (
              <OfferingCard key={item.title || item.description} offering={item} />
            ))}
        </ul>

        {offerings
          .filter((item) => item.featured)
          .map((item) => (
            <ul key={item.title} className="mt-6">
              <OfferingCard offering={item} />
            </ul>
          ))}
      </section>

      <section className="mt-16 border-t border-neutral-900 pt-12 sm:mt-20 sm:pt-14">
        <h2 className="section-label text-center">Our creative process</h2>

        <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {processPillars.map((pillar) => (
            <li key={pillar.title} className="process-card">
              {pillar.title === "Fun" ? (
                <div className="process-card-image flex justify-center">
                  <SunnyMascot />
                </div>
              ) : pillar.title === "Tailored" ? (
                <TailoredIcon />
              ) : (
                <SecureIcon />
              )}
              <h3 className="process-card-title">{pillar.title}</h3>
              <p className="process-card-body">{pillar.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <SecurityInteractiveSection />

      <section className="mt-16 border-t border-neutral-900 pt-12 sm:mt-20 sm:pt-14">
        <div className="home-cta-row">
          <div>
            <h2 className="archive-hero-title text-lg sm:text-xl">
              Ready to bring your vision to life?
            </h2>
            <p className="archive-hero-lead mt-3 max-w-xl text-sm sm:text-base">
              Explore our three service tiers — from a sleek single-page launch to
              a fully customized site with e-commerce and ongoing support.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/services" className="btn-primary">
                View our packages
              </Link>
              <Link href="/contact" className="btn-secondary">
                Let&apos;s talk
              </Link>
            </div>
          </div>
          <SiteImage
            {...siteImages.homeCta}
            className="home-cta-image"
            showSlotLabel={false}
          />
        </div>
      </section>
    </div>
  );
}
