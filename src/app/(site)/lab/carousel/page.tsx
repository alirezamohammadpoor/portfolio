import { Suspense } from "react";
import type { Metadata } from "next";
import { getBarData } from "@/sanity/lib/bar";
import CarouselLab from "@/components/lab/carousel/CarouselLab";

// Home as a drifting row of laptop videos (Ali, 11-17 grill), with the three
// places for the held project's description behind the prototype picker.
// Not linked, not indexed; delete once picked.
export const metadata: Metadata = {
  title: "Lab — Carousel home",
  robots: { index: false, follow: false },
};

async function Lab() {
  const bar = await getBarData();
  return <CarouselLab bar={bar} />;
}

export default function CarouselLabPage() {
  return (
    <>
      {/* One screen: nothing scrolls. */}
      <style>{`html, body { overflow: hidden; }`}</style>
      <Suspense fallback={null}>
        <Lab />
      </Suspense>
    </>
  );
}
