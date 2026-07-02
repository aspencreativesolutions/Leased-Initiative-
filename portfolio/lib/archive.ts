export type ArchiveCategory = "projects" | "photography" | "art";

export type ArchiveItem = {
  id: string;
  title: string;
  href: string;
  year: string;
  medium: string;
  color: string;
  tags: string[];
  category: ArchiveCategory;
  image?: string;
  imageAlt?: string;
};

export const archiveCategories: { id: ArchiveCategory; label: string }[] = [
  { id: "projects", label: "Projects" },
  { id: "photography", label: "Photography" },
  { id: "art", label: "Art" },
];

export const filterGroups = {
  year: ["2024", "2023", "2022"],
  category: ["Projects", "Photography", "Art"],
  medium: ["WEB", "APP", "PHOTO", "PRINT", "SKETCH"],
  taste: [
    "Minimal",
    "UI design",
    "Experimental",
    "Portrait",
    "Landscape",
    "Traditional",
  ],
  color: [
    "BLACK",
    "WHITE",
    "COLORFUL",
    "RED",
    "BLUE",
    "GREEN",
    "GRAY",
  ],
} as const;

export const archiveItems: ArchiveItem[] = [
  {
    id: "projects-1",
    title: "Project title placeholder",
    href: "/projects",
    year: "2024",
    medium: "WEB",
    color: "WHITE",
    tags: ["UI design", "Minimal"],
    category: "projects",
  },
  {
    id: "projects-2",
    title: "Another project placeholder",
    href: "/projects",
    year: "2024",
    medium: "APP",
    color: "BLACK",
    tags: ["React", "Experimental"],
    category: "projects",
  },
  {
    id: "projects-3",
    title: "UI design placeholder",
    href: "/projects",
    year: "2023",
    medium: "WEB",
    color: "GRAY",
    tags: ["Figma", "UI design"],
    category: "projects",
  },
  {
    id: "projects-tile",
    title: "Projects & Apps",
    href: "/projects",
    year: "2024",
    medium: "WEB",
    color: "WHITE",
    tags: ["UI design", "Development"],
    category: "projects",
    image: "/images/projects-tile.png",
    imageAlt: "Connection failed browser error screen UI",
  },
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `photo-${i + 1}`,
    title: `Photography study ${i + 1}`,
    href: "/photography",
    year: "2024",
    medium: "PHOTO",
    color: (["BLACK", "WHITE", "GRAY", "COLORFUL"] as const)[i % 4],
    tags: ["Portrait", "Landscape"][i % 2] === "Portrait" ? ["Portrait"] : ["Landscape"],
    category: "photography" as const,
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `art-${i + 1}`,
    title: `Painting & sketch ${i + 1}`,
    href: "/art",
    year: "2023",
    medium: "SKETCH",
    color: (["WHITE", "RED", "BLUE", "GREEN"] as const)[i % 4],
    tags: ["Traditional", "Minimal"][i % 2] === "Traditional" ? ["Traditional"] : ["Minimal"],
    category: "art" as const,
  })),
];

export function getArchiveItems(category?: ArchiveCategory) {
  if (!category) return archiveItems;
  return archiveItems.filter((item) => item.category === category);
}

export function formatMetaLine(item: ArchiveItem) {
  const parts = [
    item.year,
    item.medium,
    item.color,
    ...item.tags.map((t) => t.toUpperCase()),
  ];
  return parts.join("");
}
