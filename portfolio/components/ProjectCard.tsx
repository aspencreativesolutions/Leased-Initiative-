type ProjectCardProps = {
  title: string;
  description: string;
  tags?: string[];
};

export function ProjectCard({ title, description, tags = [] }: ProjectCardProps) {
  return (
    <article className="card flex h-full flex-col">
      <div className="mb-4 flex aspect-video items-center justify-center rounded-md border border-dashed border-neutral-200 bg-neutral-50">
        <span className="text-xs text-neutral-400">Project image placeholder</span>
      </div>
      <h3 className="text-lg font-medium text-neutral-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">{description}</p>
      {tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-500"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex gap-4 text-sm">
        <span className="text-neutral-400">Live demo — coming soon</span>
        <span className="text-neutral-300">·</span>
        <span className="text-neutral-400">Case study — coming soon</span>
      </div>
    </article>
  );
}
