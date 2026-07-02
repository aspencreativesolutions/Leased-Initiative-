/** Site-wide content — update contact details when you're ready. */

export const site = {
  acronym: "AC",
  name: "ASPEN Creative",
  subtitle: "StudiOS",
  since: "2024",
  tagline:
    "Passionately driven by your personal creative and collaborative needs.",
  heroSubtitle: "Secure creative solutions designed for you.",
  email: "sophie@aspencreativesolutions.com",
  linkedin: "https://linkedin.com/company/aspencreative",
  instagram: "https://instagram.com/aspencreative",
  categoryNav: [
    { href: "/", label: "HOME" },
    { href: "/portfolio", label: "PORTFOLIO" },
    { href: "/contracts", label: "CONTRACTS" },
    { href: "/services", label: "SERVICES" },
    { href: "/contact", label: "CONTACT" },
  ],
} as const;

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/contracts", label: "Contracts" },
  { href: "/services", label: "Services" },
  { href: "/contact", label: "Contact" },
] as const;

export const homeBeyondTemplates = {
  headline: "We surpass the confines of standard templates.",
  intro:
    "Custom tools and programs that fit your business—whether it’s managing data, automating tasks, or creating solutions specific to your needs.",
} as const;

export const processPillars = [
  {
    title: "Fun",
    description:
      "We make the process collaborative, clear, and energizing from the first idea to launch.",
  },
  {
    title: "Tailored",
    description:
      "Every detail is built with intention, so your site fits your business instead of a template.",
  },
  {
    title: "Secure",
    description:
      "Security is built in from the start—protecting your site, your data, and everyone who visits it.",
  },
] as const;

export type Offering = {
  title: string;
  description: string;
  /** Full-width centered tile in the offerings grid */
  featured?: boolean;
  icon?: {
    src: string;
    alt: string;
    label: string;
  };
  /** Optional image centered below the description */
  image?: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    /** Compact logo styling for dark brand marks */
    variant?: "logo" | "illustration";
    /** Stretch image to fill the tile height */
    fillHeight?: boolean;
    tooltip?: string;
    /** Set when ClientCraft launches; omit for no navigation */
    href?: string;
  };
};

export const offerings: Offering[] = [
  {
    title: "",
    description:
      "Custom Digital Solutions designed for your priorities.",
    icon: {
      src: "/images/offerings/custom-digital-solutions-icon.png",
      alt: "Wireframe browser window with customizable layout blocks",
      label: "",
    },
  },
  {
    title: "",
    description: "Built around your brand, operations, and goals.",
    icon: {
      src: "/images/offerings/strategic-narrative-icon.png",
      alt: "Bookmark with narrative path and sparkle",
      label: "",
    },
  },
  {
    title: "",
    description:
      "A personalized, transparent project experience through ClientCraft.",
    icon: {
      src: "/images/offerings/collaborative-development-icon.png",
      alt: "Two people connected around a shared message",
      label: "",
    },
  },
  {
    title: "",
    description: "Ongoing support, optimization, and growth beyond launch.",
    icon: {
      src: "/images/offerings/launch-support-icon.png",
      alt: "Growth chart with upward trend arrow",
      label: "",
    },
  },
  {
    title: "AI-powered operations",
    description:
      "I leverage AI to optimize your business operations—handling the complexity so you can focus on growth. With AI-driven automation and insights, I streamline your success—efficiently and reliably.",
    featured: true,
  },
];
