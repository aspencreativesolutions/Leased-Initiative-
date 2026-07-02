import Image from "next/image";
import Link from "next/link";
import type { ArchiveItem } from "@/lib/archive";
import { formatMetaLine } from "@/lib/archive";

type ArchiveEntryProps = {
  item: ArchiveItem;
};

export function ArchiveEntry({ item }: ArchiveEntryProps) {
  return (
    <article className="archive-entry group">
      <h2 className="archive-entry-title">
        <Link href={item.href} className="hover:opacity-60">
          {item.title}
        </Link>
      </h2>

      <div className="archive-entry-body">
        <Link
          href={item.href}
          className="archive-thumb shrink-0"
          aria-label={`View ${item.title}`}
        >
          {item.image ? (
            <Image
              src={item.image}
              alt={item.imageAlt ?? item.title}
              width={120}
              height={170}
              unoptimized
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <span className="archive-thumb-placeholder" aria-hidden />
          )}
        </Link>

        <div className="archive-entry-actions">
          <Link href={item.href} className="archive-look">
            LOOK LOOK
          </Link>
          <p className="archive-meta">{formatMetaLine(item)}</p>
          <Link href={item.href} className="archive-more">
            MORE
          </Link>
        </div>
      </div>
    </article>
  );
}
