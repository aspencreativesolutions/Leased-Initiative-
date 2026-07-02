import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { AssistantChat } from "@/components/AssistantChat";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description: site.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
        <AssistantChat />
      </body>
    </html>
  );
}
