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
import { client } from "@/sanity/lib/client";
import { ABOUT_QUERY } from "@/sanity/lib/queries";
import JsonLd from "@/components/seo/JsonLd";
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
  const [{ isEnabled: isDraftMode }, about] = await Promise.all([
    draftMode(),
    client.fetch(ABOUT_QUERY).catch(() => null),
  ]);

  const sameAs = [about?.linkedinUrl, about?.githubUrl].filter(
    (u): u is string => typeof u === "string" && u.length > 0,
  );

  const personLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Ali Reza Mohammad Poor",
    url: siteUrl,
    jobTitle: "Full-stack developer and creative technologist",
    ...(sameAs.length > 0 && { sameAs }),
  };

  const websiteLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Ali Reza Mohammad Poor",
    url: siteUrl,
    inLanguage: "en",
    author: { "@type": "Person", name: "Ali Reza Mohammad Poor", url: siteUrl },
  };

  return (
    <ViewTransitions>
      <html lang="en" className={`${parastoo.variable}`}>
        <head>
          <link rel="preconnect" href="https://cdn.sanity.io" />
          <link rel="dns-prefetch" href="https://i.scdn.co" />
          <JsonLd data={[personLd, websiteLd]} />
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
