import { Suspense } from "react";
import type { Metadata } from "next";
import { ViewTransitions } from "@/lib/viewTransitions";
import { Analytics } from "@vercel/analytics/next";
import { parastoo } from "@/lib/fonts";
import Header from "@/components/layout/Header";
import GsapProvider from "@/components/layout/GsapProvider";
import { TransitionProvider } from "@/context/TransitionContext";
import TransitionOverlay from "@/components/layout/TransitionOverlay";
import DraftModeTools from "@/components/layout/DraftModeTools";
import { getAbout } from "@/sanity/lib/data";
import JsonLd from "@/components/seo/JsonLd";
import "@/styles/globals.css";

import { SITE_URL as siteUrl, OPEN_GRAPH_BASE, SITE_OG_IMAGE } from "@/lib/site";

// Only what every page shares. The home's canonical, URL and titles live on
// its own page (src/app/(site)/page.tsx): set here they were inherited by
// every page that does not override them, so the lab pages pointed their
// canonical at the home. Twitter is the card type alone, so each page's
// card fills from its own openGraph instead of the home's titles.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ali Reza Mohammad Poor | Developer",
    template: "%s | Ali Reza Mohammad Poor",
  },
  description:
    "Portfolio of Ali Reza Mohammad Poor — Full-stack developer and creative technologist.",
  openGraph: {
    ...OPEN_GRAPH_BASE,
    type: "website",
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const about = await getAbout().catch(() => null);

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
      <html lang="en" className={`${parastoo.variable}`} suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://cdn.sanity.io" />
          <link rel="dns-prefetch" href="https://i.scdn.co" />
          <JsonLd data={[personLd, websiteLd]} />
          {/* Home intro gate, before hydration: a fresh load of the home
              keeps the page content hidden until the name has landed in the
              header (src/lib/intro.ts); the first such load in a browser session
              also plays the entry reel (src/lib/reel.ts). Reduced motion
              skips both. */}
          <script
            dangerouslySetInnerHTML={{
              __html:
                '(function(){try{if(location.pathname==="/"&&!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.intro="pending";if(/[?&]reel/.test(location.search)||!sessionStorage.getItem("home-reel")){document.documentElement.dataset.reel="pending"}}}catch(e){}})()',
            }}
          />
        </head>
        <body className="font-sans">
          <GsapProvider>
            <TransitionProvider>
              <Header />
              <main className="pt-[var(--header-height)] min-h-[calc(100dvh-var(--header-height))]">{children}</main>
              <TransitionOverlay />
            </TransitionProvider>
          </GsapProvider>
          <Suspense fallback={null}>
            <DraftModeTools />
          </Suspense>
          <Analytics />
        </body>
      </html>
    </ViewTransitions>
  );
}
