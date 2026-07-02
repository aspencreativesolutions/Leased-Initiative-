import type { Metadata } from "next";
import { ArchiveList } from "@/components/ArchiveList";

export const metadata: Metadata = {
  title: "Painting & Sketching",
  description: "Paintings, sketches, and traditional art.",
};

export default function ArtPage() {
  return (
    <div className="page-container">
      <h1 className="archive-hero-title">Painting & Sketching</h1>
      <p className="archive-hero-lead">
        Traditional art, sketches, and painted work.
      </p>

      <ArchiveList category="art" />
    </div>
  );
}
