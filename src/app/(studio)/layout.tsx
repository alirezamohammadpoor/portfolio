import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio",
  description: "Content Management Studio",
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
