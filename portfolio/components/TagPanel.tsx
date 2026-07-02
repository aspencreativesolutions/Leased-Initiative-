import { filterGroups } from "@/lib/archive";

type TagPanelProps = {
  open: boolean;
  onToggle: () => void;
  activeTag: string | null;
  onSelectTag: (tag: string) => void;
  onClear: () => void;
};

const sections = [
  { key: "year" as const, label: "YEAR" },
  { key: "category" as const, label: "GENRE" },
  { key: "medium" as const, label: "MEDIUM" },
  { key: "taste" as const, label: "TASTE" },
  { key: "color" as const, label: "COLOR" },
];

export function TagPanel({
  open,
  onToggle,
  activeTag,
  onSelectTag,
  onClear,
}: TagPanelProps) {
  return (
    <aside className={`tag-panel ${open ? "is-open" : ""}`}>
      <button type="button" className="tag-panel-toggle" onClick={onToggle}>
        {open ? "TAGS CLOSE" : "TAGS"}
      </button>

      <div className="tag-panel-content">
        {activeTag && (
          <button type="button" className="tag-clear" onClick={onClear}>
            Clear filter: {activeTag}
          </button>
        )}

        {sections.map(({ key, label }) => (
          <div key={key} className="tag-section">
            <h3 className="tag-section-label">{label}</h3>
            <ul className="tag-list">
              {filterGroups[key].map((tag) => (
                <li key={tag}>
                  <button
                    type="button"
                    className={activeTag === tag ? "is-active" : undefined}
                    onClick={() => onSelectTag(tag)}
                  >
                    {tag}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
