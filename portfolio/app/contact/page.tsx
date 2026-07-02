import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { SiteImage } from "@/components/SiteImage";
import { siteImages } from "@/lib/placeholders";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with ASPEN Creative.",
};

export default function ContactPage() {
  return (
    <div className="page-container">
      <h1 className="archive-hero-title">Let&apos;s create something together.</h1>
      <p className="archive-hero-lead mt-4 max-w-2xl text-sm sm:text-base">
        Whether you&apos;re ready to start or just curious about what&apos;s
        possible — we&apos;d love to hear from you. Drop us a line and
        let&apos;s make your next website the one you&apos;re excited to share.
      </p>

      <div className="contact-hero-row">
        <SiteImage {...siteImages.contactSide} />

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="section-label">Direct</p>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <a href={`mailto:${site.email}`} className="link-subtle">
                {site.email}
              </a>
              <a
                href={site.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="link-subtle"
              >
                LinkedIn
              </a>
              <a
                href={site.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="link-subtle"
              >
                Instagram
              </a>
            </div>
          </div>

          <div className="contact-panel">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
