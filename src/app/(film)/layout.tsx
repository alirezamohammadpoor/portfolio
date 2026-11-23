import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

// Bare root for reel films: no header, no Sanity, nothing on the page but the
// 1080 x 1080 stage, so a frame renderer can capture it as is.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Film",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function FilmLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#e9e9e6" }}>{children}</body>
    </html>
  );
}
