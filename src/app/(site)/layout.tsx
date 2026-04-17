import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { ViewTransitions } from "next-view-transitions";
import { Analytics } from "@vercel/analytics/next";
import { VisualEditing } from "next-sanity/visual-editing";
import { parastoo } from "@/lib/fonts";
import Header from "@/components/layout/Header";
import GsapProvider from "@/components/layout/GsapProvider";
import { TransitionProvider } from "@/context/TransitionContext";
import TransitionOverlay from "@/components/layout/TransitionOverlay";
import { SanityLive } from "@/sanity/lib/live";
import "@/styles/globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://alirezamp.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ali Reza Mohammad Poor | Developer",
    template: "%s | Ali Reza Mohammad Poor",
  },
  description:
    "Portfolio of Ali Reza Mohammad Poor — Full-stack developer and creative technologist.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Ali Reza Mohammad Poor",
    locale: "en_US",
    url: "/",
    title: "Ali Reza Mohammad Poor | Developer",
    description:
      "Portfolio of Ali Reza Mohammad Poor — Full-stack developer and creative technologist.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ali Reza Mohammad Poor | Developer",
    description:
      "Portfolio of Ali Reza Mohammad Poor — Full-stack developer and creative technologist.",
  },
};

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isEnabled: isDraftMode } = await draftMode();

  return (
    <ViewTransitions>
      <html lang="en" className={`${parastoo.variable}`}>
        <head>
          <link rel="preconnect" href="https://cdn.sanity.io" />
          <link rel="dns-prefetch" href="https://i.scdn.co" />
        </head>
        <body className="font-sans">
          <GsapProvider>
            <TransitionProvider>
              <Header />
              <main className="pt-[var(--header-height)] min-h-[calc(100dvh-var(--header-height))]">{children}</main>
              <TransitionOverlay />
            </TransitionProvider>
          </GsapProvider>
          {isDraftMode && (
            <>
              <SanityLive />
              <VisualEditing />
            </>
          )}
          <Analytics />
        </body>
      </html>
    </ViewTransitions>
  );
}
