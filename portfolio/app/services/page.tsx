import type { Metadata } from "next";
import Link from "next/link";
import { SiteImage } from "@/components/SiteImage";
import { serviceTierImages } from "@/lib/placeholders";
import { serviceTiers } from "@/lib/services";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Three tailored website packages from ASPEN Creative — Launch, Studio, and Summit.",
};

export default function ServicesPage() {
  return (
    <div className="page-container">
      <section>
        <p className="section-label">Packages</p>
        <h1 className="archive-hero-title mt-3 max-w-3xl">
          Choose the experience that fits your vision.
        </h1>
        <p className="archive-hero-lead mt-4 max-w-2xl text-sm sm:text-base">
          Every tier at {site.name} is built on the same foundation: creative
          collaboration, personal attention, and a site that feels authentically
          yours. Pick your starting point — we&apos;ll grow with you.
        </p>
      </section>

      <div className="mt-14 space-y-12 sm:mt-16">
        {serviceTiers.map((tier, index) => (
          <article
            key={tier.id}
            className={`tier-card ${index === 2 ? "tier-card-featured" : ""}`}
          >
            <div
              className={`tier-card-layout ${index % 2 === 1 ? "tier-card-layout--reverse" : ""}`}
            >
              <SiteImage
                {...serviceTierImages[index]}
                className="tier-card-image"
              />
              <div className="tier-card-content">
                <div className="tier-header">
                  <span className="tier-number">0{index + 1}</span>
                  <div>
                    <h2 className="tier-name">{tier.name}</h2>
                    <p className="tier-tagline">{tier.tagline}</p>
                  </div>
                </div>

                <p className="tier-description">{tier.description}</p>

                <div className="tier-collaboration">
                  <p className="section-label">How we work together</p>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                    {tier.collaboration}
                  </p>
                </div>

                <ul className="tier-features">
                  {tier.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <p className="tier-ideal">
                  <span className="font-semibold text-neutral-900">Ideal for:</span>{" "}
                  {tier.idealFor}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-16 border-t border-neutral-900 pt-12 sm:mt-20 sm:pt-14">
        <h2 className="archive-hero-title text-lg sm:text-xl">
          Not sure which tier is right for you?
        </h2>
        <p className="archive-hero-lead mt-3 max-w-xl text-sm sm:text-base">
          That&apos;s what the discovery call is for. Tell us about your goals
          and we&apos;ll recommend the perfect fit — no pressure, just good
          conversation.
        </p>
        <Link href="/contact" className="btn-primary mt-8 inline-flex">
          Book a free chat
        </Link>
      </section>
    </div>
  );
}
