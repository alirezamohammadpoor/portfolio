import type { Metadata } from "next";

// Deliberate opt-out: Sanity Studio is an authenticated single-page app that
// renders entirely client-side. There is no static shell worth prerendering.
export const instant = false;

export const metadata: Metadata = {
  title: "Studio",
  description: "Content Management Studio",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
