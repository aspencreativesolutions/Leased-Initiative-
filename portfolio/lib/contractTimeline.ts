/** Contract process timeline — edit step copy here */

export const contractTimeline = {
  title: "Contract Process Timeline",
  steps: [
    {
      id: 1,
      label: "Step 1",
      title: "Discovery Call",
      description: "Discuss goals, needs, and fit.",
      position: "above" as const,
      icon: "discovery" as const,
    },
    {
      id: 2,
      label: "Step 2",
      title: "Agreement Drafted",
      description: "Draft a clear agreement.",
      position: "below" as const,
      icon: "draft" as const,
    },
    {
      id: 3,
      label: "Step 3",
      title: "Contract Status",
      description: "Status: draft, generated, sent, signed.",
      position: "above" as const,
      icon: "status" as const,
    },
    {
      id: 4,
      label: "Step 4",
      title: "Signed & Tracked",
      description: "Track payments, deadlines, and follow-ups.",
      position: "below" as const,
      icon: "tracked" as const,
    },
  ],
} as const;
