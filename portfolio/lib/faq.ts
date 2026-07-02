/** FAQ content for the site assistant — edit questions and answers here. */

export type FaqPair = {
  id: string;
  question: string;
  answer: string;
  /** Optional extra phrases that should match this answer */
  keywords?: string[];
};

export const assistantConfig = {
  title: "ASPEN Assistant",
  buttonLabel: "Ask Assistant",
  greeting:
    "Hi! I can answer common questions about ASPEN Creative. Pick a topic below or type your question.",
  fallback:
    "I'm not sure about that one yet. Reach out on our Contact page or email sophie@aspencreativesolutions.com — we'd love to help.",
} as const;

export const faqPairs: FaqPair[] = [
  {
    id: "services",
    question: "What services do you offer?",
    answer:
      "We design and build custom websites — from polished single-page Launch sites to multi-page Studio packages and full Summit builds with e-commerce and advanced features. Visit the Services page for tier details.",
    keywords: ["packages", "pricing", "plans", "what do you do"],
  },
  {
    id: "process",
    question: "What is your design process?",
    answer:
      "Every project starts with a discovery call to learn your goals and brand. We co-create layouts, share drafts early, and iterate together until the site feels unmistakably yours — fun, personal, and tailored.",
    keywords: ["how it works", "timeline", "collaboration", "workflow"],
  },
  {
    id: "contracts",
    question: "How do contracts work?",
    answer:
      "We use clear, documented agreements so scope, deliverables, and timelines are always visible. You'll know what was agreed, where your project stands, and what comes next — no surprises buried in email threads.",
    keywords: ["terms", "agreement", "scope", "legal"],
  },
  {
    id: "contact",
    question: "How can I get in touch?",
    answer:
      "Head to the Contact page to send a message, or email sophie@aspencreativesolutions.com directly. Whether you're ready to start or just exploring, we'd love to hear from you.",
    keywords: ["email", "reach", "talk", "hire"],
  },
  {
    id: "portfolio",
    question: "Can I see examples of your work?",
    answer:
      "Yes — browse the Portfolio page for selected projects across web design, photography, and art. More case studies are added as new work launches.",
    keywords: ["examples", "work", "projects", "case studies"],
  },
];

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/[^\w\s]/g, " ");
}

export function findFaqMatch(input: string): FaqPair | null {
  const query = normalize(input);
  if (!query) return null;

  for (const faq of faqPairs) {
    const candidates = [faq.question, ...(faq.keywords ?? [])].map(normalize);
    if (candidates.some((phrase) => query.includes(phrase) || phrase.includes(query))) {
      return faq;
    }
  }

  return null;
}
