import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { VisualEditing } from "next-sanity/visual-editing";
import { nhaas, nastaliq } from "@/lib/fonts";
import Header from "@/components/layout/Header";
import GsapProvider from "@/components/layout/GsapProvider";
import { TransitionProvider } from "@/context/TransitionContext";
import TransitionOverlay from "@/components/layout/TransitionOverlay";
import { SanityLive } from "@/sanity/lib/live";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ali Reza Mohammad Poor | Developer",
    template: "%s | Ali Reza Mohammad Poor",
  },
  description:
    "Portfolio of Ali Reza Mohammad Poor — Full-stack developer and creative technologist.",
};

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isEnabled: isDraftMode } = await draftMode();

  return (
    <html lang="en" className={`${nhaas.variable} ${nastaliq.variable}`}>
      <body className="font-sans">
        <GsapProvider>
          <TransitionProvider>
            <Header />
            <main className="pt-[var(--header-height)] min-h-[calc(100dvh-var(--header-height))]">{children}</main>
            <TransitionOverlay />
          </TransitionProvider>
        </GsapProvider>
        <SanityLive />
        {isDraftMode && <VisualEditing />}
        <Analytics />
      </body>
    </html>
  );
}
