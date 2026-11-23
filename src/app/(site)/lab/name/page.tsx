import { Suspense } from "react";
import type { Metadata } from "next";
import { fileUrl } from "@/sanity/lib/image";
import NameLab from "@/components/lab/name/NameLab";

// Name mark options (Ali, 11-23): the bar's name without the scramble, with
// or without the Persian. Flip with 1–5 or the arrows, R replays the intro.
export const metadata: Metadata = {
  title: "Lab — Name",
  robots: { index: false, follow: false },
};

const LAPTOP = "file-94cdbae7c91ff12805a6399d0fa1135b30e65f60-mp4"; // stronger-landing-flush, 1920×1200

async function Lab({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const v = Number.parseInt((await searchParams).v ?? "", 10);
  return <NameLab clip={fileUrl(LAPTOP)} initial={v >= 1 && v <= 5 ? v - 1 : 0} />;
}

export default function NameLabPage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  return (
    <Suspense fallback={null}>
      <Lab searchParams={searchParams} />
    </Suspense>
  );
}
