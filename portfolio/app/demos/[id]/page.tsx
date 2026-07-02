import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoSandboxShell } from "@/components/demos/DemoSandboxShell";
import { getDemo } from "@/components/demos/registry";

type DemoPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  return [
    { id: "teammates" },
    { id: "ecommerce-checkout" },
    { id: "saas-dashboard" },
    { id: "restaurant-booking" },
    { id: "fitness-brand" },
    { id: "nonprofit-donate" },
  ];
}

export async function generateMetadata({ params }: DemoPageProps): Promise<Metadata> {
  const { id } = await params;
  const demo = getDemo(id);
  if (!demo) return { title: "Demo not found" };
  return {
    title: `${demo.title} — Demo`,
    description: demo.subtitle,
  };
}

export default async function DemoPage({ params }: DemoPageProps) {
  const { id } = await params;
  const demo = getDemo(id);
  if (!demo) notFound();

  const Demo = demo.component;

  return (
    <DemoSandboxShell demo={demo}>
      <Demo />
    </DemoSandboxShell>
  );
}
