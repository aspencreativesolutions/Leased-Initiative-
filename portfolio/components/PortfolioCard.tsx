import Link from "next/link";
import type { PortfolioProject } from "@/lib/portfolio";
import { getDemoHref } from "@/lib/portfolio";
import { PortfolioDemoPreview } from "@/components/demos/PortfolioDemoPreview";

type PortfolioCardProps = {
  project: PortfolioProject;
};

export function PortfolioCard({ project }: PortfolioCardProps) {
  const { title, description, tags = [], demoId } = project;
  const href = demoId ? getDemoHref(demoId) : undefined;

  const content = (
    <>
      <div className="portfolio-card-thumb">
        {demoId ? (
          <PortfolioDemoPreview demoId={demoId} title={title} />
        ) : (
          <span className="portfolio-card-thumb-placeholder" aria-hidden>
            <span className="portfolio-card-thumb-label">UI/UX</span>
          </span>
        )}
      </div>

      <div className="portfolio-card-body">
        <h2 className="portfolio-card-title">{title}</h2>
        <p className="portfolio-card-description">{description}</p>

        {tags.length > 0 && (
          <ul className="portfolio-card-tags" aria-label="Project tags">
            {tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}

        {href && (
          <span className="portfolio-card-link">Try interactive demo →</span>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <article className="portfolio-card group">
        <Link href={href} className="portfolio-card-inner">
          {content}
        </Link>
      </article>
    );
  }

  return (
    <article className="portfolio-card">
      <div className="portfolio-card-inner">{content}</div>
    </article>
  );
}
