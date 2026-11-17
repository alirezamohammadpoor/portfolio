import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBarData } from "@/sanity/lib/bar";
import PanelsLab from "@/components/lab/panels/PanelsLab";

// Work and About layouts in the capsule's window (Ali, 11-17): the Figma
// directions he picked (Work refined + full bleed, About spread + column)
// against what shipped, in the real header, behind the prototype picker.
// Not linked, not indexed; delete once a layout is promoted.
export const metadata: Metadata = {
  title: "Lab — Panel layouts",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return [{ panel: "work" }, { panel: "about" }];
}

type Params = Promise<{ panel: string }>;

async function Lab({ params }: { params: Params }) {
  const { panel } = await params;
  if (panel !== "work" && panel !== "about") notFound();
  const bar = await getBarData();
  return <PanelsLab panel={panel} backdrop={bar.projects[0]?.still ?? null} />;
}

export default function PanelsLabPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <Lab params={params} />
    </Suspense>
  );
}
