import type { Metadata } from "next";
import { ArchiveList } from "@/components/ArchiveList";

export const metadata: Metadata = {
  title: "Photography",
  description: "Photography portfolio.",
};

export default function PhotographyPage() {
  return (
    <div className="page-container">
      <h1 className="archive-hero-title">Photography</h1>
      <p className="archive-hero-lead">
        Visual studies and moments captured through the lens.
      </p>

      <ArchiveList category="photography" />
    </div>
  );
}
