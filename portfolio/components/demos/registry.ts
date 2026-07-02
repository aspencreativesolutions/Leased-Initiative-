import type { ComponentType } from "react";
import { TeammatesDemo } from "./TeammatesDemo";
import { EcommerceDemo } from "./EcommerceDemo";
import { SaasDemo } from "./SaasDemo";
import { RestaurantDemo } from "./RestaurantDemo";
import { FitnessDemo } from "./FitnessDemo";
import { NonprofitDemo } from "./NonprofitDemo";

export type DemoId =
  | "teammates"
  | "ecommerce-checkout"
  | "saas-dashboard"
  | "restaurant-booking"
  | "fitness-brand"
  | "nonprofit-donate";

export type DemoEntry = {
  id: DemoId;
  title: string;
  subtitle: string;
  accent: string;
  component: ComponentType<{ preview?: boolean }>;
};

export const demoRegistry: Record<DemoId, DemoEntry> = {
  teammates: {
    id: "teammates",
    title: "Teammates — Housemates App",
    subtitle: "Chore gamification for shared households — spin the wheel, track points, customize copy.",
    accent: "#001a5e",
    component: TeammatesDemo,
  },
  "ecommerce-checkout": {
    id: "ecommerce-checkout",
    title: "E-Commerce Checkout Flow",
    subtitle: "Multi-step checkout — swap products, shipping, and payment fields.",
    accent: "#1a1a1a",
    component: EcommerceDemo,
  },
  "saas-dashboard": {
    id: "saas-dashboard",
    title: "SaaS Analytics Dashboard",
    subtitle: "Metrics workspace — replace KPIs, chart labels, and nav items.",
    accent: "#6366f1",
    component: SaasDemo,
  },
  "restaurant-booking": {
    id: "restaurant-booking",
    title: "Restaurant Booking Platform",
    subtitle: "Reservation flow — edit venue name, times, and party sizes.",
    accent: "#c45c3e",
    component: RestaurantDemo,
  },
  "fitness-brand": {
    id: "fitness-brand",
    title: "Fitness Brand Landing Page",
    subtitle: "Bold landing page — update hero, plans, and FAQ content.",
    accent: "#c8ff00",
    component: FitnessDemo,
  },
  "nonprofit-donate": {
    id: "nonprofit-donate",
    title: "Nonprofit Donation Experience",
    subtitle: "Trust-first giving — change impact tiers and organization details.",
    accent: "#2563eb",
    component: NonprofitDemo,
  },
};

export const demoIds = Object.keys(demoRegistry) as DemoId[];

export function getDemo(id: string): DemoEntry | undefined {
  return demoRegistry[id as DemoId];
}
