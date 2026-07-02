import type { Metadata } from "next";
import { ArchiveList } from "@/components/ArchiveList";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Projects",
  description: "Web development, UI design, and apps.",
};

export default function ProjectsPage() {
  return (
    <div className="page-container">
      <h1 className="archive-hero-title">Projects & Apps</h1>
      <p className="archive-hero-lead">
        {site.name} — development and interface work.
      </p>

      <ArchiveList category="projects" />
    </div>
  );
}
