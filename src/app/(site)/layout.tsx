import { Suspense } from "react";
import type { Metadata } from "next";
import { ViewTransitions } from "next-view-transitions";
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

import { SITE_URL as siteUrl } from "@/lib/site";

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
              header (src/lib/intro.ts). Reduced motion skips the intro. */}
          <script
            dangerouslySetInnerHTML={{
              __html:
                '(function(){try{if(location.pathname==="/"&&!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.intro="pending"}}catch(e){}})()',
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
