import { Suspense } from "react";
import type { Metadata } from "next";
import { getAbout, getProjects } from "@/sanity/lib/data";
import HomeLayoutsLab from "@/components/lab/home-layouts/HomeLayoutsLab";

// Prototype route. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Home layouts",
  robots: { index: false, follow: false },
};

export default function HomeLayoutsLabPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; frame?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <Lab searchParams={searchParams} />
    </Suspense>
  );
}

async function Lab({ searchParams }: { searchParams: Promise<{ v?: string; frame?: string }> }) {
  const [{ v, frame }, projects, about] = await Promise.all([
    searchParams,
    getProjects(),
    getAbout().catch(() => null),
  ]);
  return (
    <HomeLayoutsLab
      projects={projects}
      contact={about}
      initial={Number(v) || 1}
      initialFrame={frame === "flush" ? "flush" : "inset"}
    />
  );
}
