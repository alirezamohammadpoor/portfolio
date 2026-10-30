import { Suspense } from "react";
import type { Metadata } from "next";
import MorphLab from "@/components/lab/morph/MorphLab";

// Prototype route. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Test morphs",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ solo?: string }>;

async function Lab({ searchParams }: { searchParams: SearchParams }) {
  const { solo } = await searchParams;
  return <MorphLab solo={solo} />;
}

export default function MorphLabPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={null}>
      <Lab searchParams={searchParams} />
    </Suspense>
  );
}
