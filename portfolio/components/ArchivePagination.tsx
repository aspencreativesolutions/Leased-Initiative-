type ArchivePaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function ArchivePagination({
  page,
  totalPages,
  onPageChange,
}: ArchivePaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    0,
    5
  );

  return (
    <nav className="archive-pagination" aria-label="Archive pages">
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {pages.map((n) => (
          <li key={n}>
            <button
              type="button"
              onClick={() => onPageChange(n)}
              className={page === n ? "is-active" : undefined}
              aria-current={page === n ? "page" : undefined}
            >
              {n}
            </button>
          </li>
        ))}
        {totalPages > 5 && <li aria-hidden>…</li>}
        {page < totalPages && (
          <li>
            <button type="button" onClick={() => onPageChange(page + 1)}>
              NEXT
            </button>
          </li>
        )}
        {page < totalPages && (
          <li>
            <button type="button" onClick={() => onPageChange(totalPages)}>
              Last »
            </button>
          </li>
        )}
      </ol>
    </nav>
  );
}
