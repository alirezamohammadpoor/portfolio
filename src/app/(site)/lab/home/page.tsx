import { Suspense } from "react";
import type { Metadata } from "next";
import { getBarData } from "@/sanity/lib/bar";
import HomeLab from "@/components/lab/home/HomeLab";

// Home as a full-bleed index (Ali, 11-17): the Work panel's full bleed grown
// into the home, with the bar flat on the picture (A) or the pebble (C),
// behind the prototype picker. Not linked, not indexed; delete once picked.
export const metadata: Metadata = {
  title: "Lab — Full-bleed home",
  robots: { index: false, follow: false },
};

async function Lab() {
  const bar = await getBarData();
  return <HomeLab bar={bar} />;
}

export default function HomeLabPage() {
  return (
    <>
      {/* One screen, nothing scrolls under the picture. */}
      <style>{`html, body { overflow: hidden; }`}</style>
      <Suspense fallback={null}>
        <Lab />
      </Suspense>
    </>
  );
}
