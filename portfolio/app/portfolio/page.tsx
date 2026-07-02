import type { Metadata } from "next";
import Link from "next/link";
import { SiteImage } from "@/components/SiteImage";
import { siteImages } from "@/lib/placeholders";
import { PortfolioCard } from "@/components/PortfolioCard";
import { portfolioProjects } from "@/lib/portfolio";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "UI/UX design work from ASPEN Creative.",
};

export default function PortfolioPage() {
  return (
    <div className="page-container">
      <section>
        <p className="section-label">Selected work</p>
        <h1 className="archive-hero-title mt-3 max-w-3xl">UI/UX Portfolio</h1>
        <p className="archive-hero-lead mt-4 max-w-2xl text-sm sm:text-base">
          A collection of interface and experience design projects from{" "}
          {site.name}. Each card embeds a live preview — click any project to
          open the full interactive demo in a sandboxed environment.
        </p>
        <SiteImage {...siteImages.portfolioHero} className="page-hero-banner" />
      </section>

      <ul className="portfolio-grid">
        {portfolioProjects.map((project) => (
          <li key={project.id}>
            <PortfolioCard project={project} />
          </li>
        ))}
      </ul>

      <section className="mt-16 border-t border-neutral-200 pt-10 sm:mt-20">
        <p className="text-sm text-neutral-600">
          Curious how I handle agreements and project delivery?{" "}
          <Link href="/contracts" className="link-subtle font-medium text-neutral-900">
            Read about my contracting process
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
