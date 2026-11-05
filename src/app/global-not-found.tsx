import type { Metadata } from "next";
import { parastoo } from "@/lib/fonts";
import { SITE_URL } from "@/lib/site";
import "@/styles/globals.css";

/**
 * The 404 for a URL that matches no route (a typo, an old link, /projects).
 * Next renders it outside every layout, so the document, the stylesheet and
 * the font are set up here; nothing from the site's providers (GSAP, Lenis,
 * the transition) is available, so the page is static markup. notFound()
 * inside the site keeps using (site)/not-found.tsx.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "404 | Ali Reza Mohammad Poor",
  description: "Page not found.",
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={parastoo.variable}>
      <body className="font-sans">
        <main className="flex min-h-dvh flex-col items-center justify-center px-4 desktop:px-6">
          <h1 className="text-primary">404</h1>
          <p className="mt-4 text-body text-secondary">Page not found.</p>
          {/* A plain anchor: this document renders outside the app router, so next/link has no router to mount into. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="link-underline mt-8 text-sub text-primary uppercase">
            Back to home
          </a>
        </main>
      </body>
    </html>
  );
}
