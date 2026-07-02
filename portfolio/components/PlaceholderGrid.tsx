type PlaceholderGridProps = {
  count?: number;
  aspect?: "square" | "wide" | "tall";
};

const aspectClasses = {
  square: "aspect-square",
  wide: "aspect-[4/3]",
  tall: "aspect-[3/4]",
};

export function PlaceholderGrid({
  count = 6,
  aspect = "square",
}: PlaceholderGridProps) {
  return (
    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${aspectClasses[aspect]} flex items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50`}
        >
          <span className="text-xs text-neutral-400">Placeholder {i + 1}</span>
        </div>
      ))}
    </div>
  );
}
