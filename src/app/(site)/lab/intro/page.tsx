import { Suspense } from "react";
import type { Metadata } from "next";
import IntroLab from "@/components/lab/intro/IntroLab";

// Prototype route. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Intro",
  robots: { index: false, follow: false },
};

export default function IntroLabPage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  return (
    <Suspense fallback={null}>
      <Lab searchParams={searchParams} />
    </Suspense>
  );
}

async function Lab({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  return <IntroLab initial={Number(v) || 1} />;
}
