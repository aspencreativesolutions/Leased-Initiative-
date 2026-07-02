"use client";

import { useMemo, useState } from "react";
import type { ArchiveCategory } from "@/lib/archive";
import { archiveItems } from "@/lib/archive";
import { ArchiveEntry } from "@/components/ArchiveEntry";
import { ArchivePagination } from "@/components/ArchivePagination";
import { TagPanel } from "@/components/TagPanel";

const PER_PAGE = 8;

type ArchiveListProps = {
  category?: ArchiveCategory;
  showTagPanel?: boolean;
};

export function ArchiveList({
  category,
  showTagPanel = true,
}: ArchiveListProps) {
  const [page, setPage] = useState(1);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let items = category
      ? archiveItems.filter((item) => item.category === category)
      : archiveItems;

    if (activeTag) {
      const needle = activeTag.toLowerCase();
      const categoryMap: Record<string, ArchiveCategory> = {
        projects: "projects",
        photography: "photography",
        art: "art",
      };
      const mappedCategory = categoryMap[needle];

      items = items.filter(
        (item) =>
          item.year === activeTag ||
          item.medium === activeTag ||
          item.color === activeTag ||
          item.tags.some((t) => t.toLowerCase() === needle) ||
          (mappedCategory && item.category === mappedCategory)
      );
    }

    return items;
  }, [category, activeTag]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const slice = filtered.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  return (
    <div className="archive-layout">
      <div className="archive-main">
        <ul className="archive-list">
          {slice.map((item) => (
            <li key={item.id}>
              <ArchiveEntry item={item} />
            </li>
          ))}
        </ul>

        {filtered.length === 0 && (
          <p className="archive-empty">No entries match this filter.</p>
        )}

        <ArchivePagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {showTagPanel && (
        <TagPanel
          open={tagsOpen}
          onToggle={() => setTagsOpen((v) => !v)}
          activeTag={activeTag}
          onSelectTag={(tag) => {
            setActiveTag(tag);
            setPage(1);
          }}
          onClear={() => {
            setActiveTag(null);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
