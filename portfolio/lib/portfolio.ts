import type { DemoId } from "@/components/demos/registry";

export type PortfolioProject = {
  id: string;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  tags?: string[];
  /** Links to interactive demo sandbox at /demos/[demoId] */
  demoId?: DemoId;
};

/** To add a project: copy an object below and give it a unique id. */
export const portfolioProjects: PortfolioProject[] = [
  {
    id: "teammates",
    title: "Teammates — Housemates App",
    description:
      "A mobile-first chore gamification app with wheel spins, house scoreboards, and host-customizable game periods.",
    tags: ["UI design", "Mobile app", "Product design"],
    demoId: "teammates",
  },
  {
    id: "ecommerce-checkout",
    title: "E-Commerce Checkout Flow",
    description:
      "Streamlined checkout experience that reduced friction and improved conversion clarity.",
    tags: ["UX design", "Web app", "Prototyping"],
    demoId: "ecommerce-checkout",
  },
  {
    id: "saas-dashboard",
    title: "SaaS Analytics Dashboard",
    description:
      "Data-heavy interface made approachable through thoughtful typography, spacing, and color.",
    tags: ["UI design", "Dashboard", "Design system"],
    demoId: "saas-dashboard",
  },
  {
    id: "restaurant-booking",
    title: "Restaurant Booking Platform",
    description:
      "End-to-end reservation flow with emphasis on speed, accessibility, and brand warmth.",
    tags: ["UX design", "Web", "Accessibility"],
    demoId: "restaurant-booking",
  },
  {
    id: "fitness-brand",
    title: "Fitness Brand Landing Page",
    description:
      "Bold hero layouts and scroll-driven storytelling for a lifestyle fitness startup.",
    tags: ["UI design", "Landing page", "Brand"],
    demoId: "fitness-brand",
  },
  {
    id: "nonprofit-donate",
    title: "Nonprofit Donation Experience",
    description:
      "Trust-building donation UI with clear impact messaging and a frictionless giving path.",
    tags: ["UX design", "Web", "Content strategy"],
    demoId: "nonprofit-donate",
  },
];

export function getDemoHref(demoId: DemoId): string {
  return `/demos/${demoId}`;
}
