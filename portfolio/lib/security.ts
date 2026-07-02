/** Security section content — edit copy and icon paths here. */

export const securitySection = {
  label: "Long-term protection",
  heading: "Security Built for the Long Term",
  intro:
    "Website security isn't a one-time setup—it's an ongoing commitment. Every layer below plays a role in keeping your site, your data, and your visitors safe as technology evolves.",
  exploreHint: "Hover each icon to learn more",
} as const;

export type SecurityIconId = "lock" | "key" | "wifi" | "card";

export type SecurityIconItem = {
  id: SecurityIconId;
  label: string;
  tooltip: string;
};

/** Horizontal icon row — order: lock, key, Wi-Fi, credit card */
export const securityIcons: SecurityIconItem[] = [
  {
    id: "lock",
    label: "Encrypted Data Protection",
    tooltip: "Encrypted Data Protection",
  },
  {
    id: "key",
    label: "Secure User Authentication",
    tooltip: "Secure User Authentication",
  },
  {
    id: "wifi",
    label: "Secure Network Connectivity",
    tooltip: "Secure Network Connectivity",
  },
  {
    id: "card",
    label: "Protected Transactions",
    tooltip: "Protected Transactions",
  },
];
