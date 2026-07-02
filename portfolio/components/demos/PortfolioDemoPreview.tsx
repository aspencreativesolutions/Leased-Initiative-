"use client";

import type { DemoId } from "./registry";
import { getDemo } from "./registry";

type PortfolioDemoPreviewProps = {
  demoId: DemoId;
  title: string;
};

export function PortfolioDemoPreview({ demoId, title }: PortfolioDemoPreviewProps) {
  const demo = getDemo(demoId);
  if (!demo) return null;

  const DemoComponent = demo.component;

  return (
    <div
      className="portfolio-demo-preview"
      style={{ ["--demo-accent" as string]: demo.accent }}
      aria-hidden
    >
      <div className="portfolio-demo-preview-scale">
        <DemoComponent preview />
      </div>
      <span className="portfolio-demo-preview-label">{title}</span>
    </div>
  );
}
