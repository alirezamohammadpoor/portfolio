import { Suspense } from "react";
import type { Metadata } from "next";
import { getBarData } from "@/sanity/lib/bar";
import AboutLab from "@/components/lab/about/AboutLab";

// Prototype route. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — About panel",
  robots: { index: false, follow: false },
};

export default function AboutLabPage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  return (
    <Suspense fallback={null}>
      <Lab searchParams={searchParams} />
    </Suspense>
  );
}

async function Lab({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const [{ v }, bar] = await Promise.all([searchParams, getBarData()]);
  if (!bar.about) return <p className="px-margin pt-24">No About document in Sanity.</p>;
  return <AboutLab bar={bar} initial={Number(v) || 1} />;
}
