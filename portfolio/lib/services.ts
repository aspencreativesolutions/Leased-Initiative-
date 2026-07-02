export type ServiceTier = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  collaboration: string;
  features: string[];
  idealFor: string;
};

export const serviceTiers: ServiceTier[] = [
  {
    id: "launch",
    name: "Launch",
    tagline: "Your essentials, beautifully presented.",
    description:
      "A polished single-page site that puts your best foot forward — perfect when you need a strong online presence fast, without the overwhelm.",
    collaboration:
      "We kick off with a fun discovery call to nail your message, then co-create the layout together. You’ll see drafts early and often — your feedback shapes every section.",
    features: [
      "Custom-designed single-page website",
      "Mobile-responsive layout",
      "Essential info: about, services, contact",
      "Contact form integration",
      "Basic SEO setup",
      "One round of revisions included",
    ],
    idealFor: "New businesses, freelancers, and creators ready to go live.",
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "Room to grow, designed with intention.",
    description:
      "A multi-page site with custom design and a built-in blog — ideal when you’re ready to share more of your story and keep your audience coming back.",
    collaboration:
      "This is where the creative partnership really shines. We map your site structure together, explore design directions side by side, and refine each page until it feels unmistakably yours.",
    features: [
      "Everything in Launch, plus:",
      "Up to 6 custom-designed pages",
      "Blog setup with easy publishing",
      "Custom typography & color palette",
      "Social media integration",
      "Two rounds of revisions included",
      "Launch-day walkthrough",
    ],
    idealFor: "Growing brands, consultants, and small teams building authority.",
  },
  {
    id: "summit",
    name: "Summit",
    tagline: "The full creative experience — no limits.",
    description:
      "A fully customized website with e-commerce, ongoing maintenance, and advanced features — built for brands that want a standout digital home and a team in their corner long-term.",
    collaboration:
      "Summit clients get our most hands-on experience. From strategy workshops to design sprints, you’re a true creative partner — not just a client watching from the sidelines. We build, launch, and evolve your site together.",
    features: [
      "Everything in Studio, plus:",
      "Fully custom design & development",
      "E-commerce / online store setup",
      "Advanced integrations (booking, CRM, etc.)",
      "Performance & accessibility optimization",
      "Ongoing maintenance & updates",
      "Priority support",
      "Quarterly strategy check-ins",
    ],
    idealFor: "Established businesses and ambitious brands ready to scale.",
  },
];
