/** Replace image paths here — each slot maps to one location on the site. */

export type SiteImageSlot = {
  id: string;
  src: string;
  alt: string;
  /** Shown on the image so you know which slot to swap */
  slotLabel: string;
  width: number;
  height: number;
};

export const siteImages = {
  homeHero: {
    id: "home-hero",
    src: "/images/home-hero.png",
    alt: "Smartphone displaying a custom skincare website on a styled creative desk",
    slotLabel: "Home · Hero",
    width: 1024,
    height: 1024,
  },
  homeProcess1: {
    id: "home-process-1",
    src: "/images/placeholders/home-process-1.png",
    alt: "Placeholder — process pillar image",
    slotLabel: "Home · Process · Fun",
    width: 400,
    height: 260,
  },
  homeProcess2: {
    id: "home-process-2",
    src: "/images/placeholders/home-process-2.png",
    alt: "Placeholder — process pillar image",
    slotLabel: "Home · Process · Personal",
    width: 400,
    height: 260,
  },
  homeProcess3: {
    id: "home-process-3",
    src: "/images/placeholders/home-process-3.png",
    alt: "Placeholder — process pillar image",
    slotLabel: "Home · Process · Tailored",
    width: 400,
    height: 260,
  },
  homeCta: {
    id: "home-cta",
    src: "/images/home-cta.png",
    alt: "Laptop displaying an analytics dashboard on a modern creative desk",
    slotLabel: "Home · CTA",
    width: 1024,
    height: 768,
  },
  portfolioHero: {
    id: "portfolio-hero",
    src: "/images/placeholders/portfolio-hero.svg",
    alt: "Placeholder — portfolio page header",
    slotLabel: "Portfolio · Hero",
    width: 1200,
    height: 400,
  },
  portfolioCard: {
    id: "portfolio-card",
    src: "/images/placeholders/portfolio-card.svg",
    alt: "Placeholder — portfolio project thumbnail",
    slotLabel: "Portfolio · Card",
    width: 640,
    height: 400,
  },
  servicesLaunch: {
    id: "services-launch",
    src: "/images/placeholders/services-launch.svg",
    alt: "Placeholder — Launch tier image",
    slotLabel: "Services · Launch",
    width: 560,
    height: 340,
  },
  servicesStudio: {
    id: "services-studio",
    src: "/images/placeholders/services-studio.svg",
    alt: "Placeholder — Studio tier image",
    slotLabel: "Services · Studio",
    width: 560,
    height: 340,
  },
  servicesSummit: {
    id: "services-summit",
    src: "/images/placeholders/services-summit.svg",
    alt: "Placeholder — Summit tier image",
    slotLabel: "Services · Summit",
    width: 560,
    height: 340,
  },
  contractsAccent: {
    id: "contracts-accent",
    src: "/images/placeholders/contracts-accent.svg",
    alt: "Placeholder — contracts page accent",
    slotLabel: "Contracts · Accent",
    width: 400,
    height: 520,
  },
  contactSide: {
    id: "contact-side",
    src: "/images/placeholders/contact-side.svg",
    alt: "Placeholder — contact page image",
    slotLabel: "Contact · Side",
    width: 480,
    height: 560,
  },
} as const satisfies Record<string, SiteImageSlot>;

export const homeHeroMorph = {
  width: 1024,
  height: 1024,
  images: [
    {
      src: "/images/home-hero-clientcraft-1.png",
      alt: "ClientCraft dashboard on a smartphone in dark blue theme",
    },
    {
      src: "/images/home-hero-clientcraft-2.png",
      alt: "ClientCraft dashboard on a smartphone in light theme",
    },
    {
      src: "/images/home-hero-clientcraft-3.png",
      alt: "ClientCraft dashboard on a smartphone in cream theme",
    },
    {
      src: "/images/home-hero-clientcraft-4.png",
      alt: "ClientCraft dashboard on a smartphone in orange theme",
    },
    {
      src: "/images/home-hero-clientcraft-5.png",
      alt: "ClientCraft dashboard on a smartphone in green theme",
    },
  ],
} as const;

export const homeProcessImages = [
  siteImages.homeProcess1,
  siteImages.homeProcess2,
  siteImages.homeProcess3,
] as const;

export const serviceTierImages = [
  siteImages.servicesLaunch,
  siteImages.servicesStudio,
  siteImages.servicesSummit,
] as const;
