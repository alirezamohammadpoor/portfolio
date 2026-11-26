import { Suspense } from "react";
import type { Metadata } from "next";
import { getAbout, getProjects } from "@/sanity/lib/data";
import HomeIntroLab from "@/components/lab/home-intro/HomeIntroLab";

// Prototype route. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Home intro",
  robots: { index: false, follow: false },
};

export default function HomeIntroLabPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; n?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <Lab searchParams={searchParams} />
    </Suspense>
  );
}

async function Lab({ searchParams }: { searchParams: Promise<{ v?: string; n?: string }> }) {
  const [{ v, n }, projects, about] = await Promise.all([
    searchParams,
    getProjects(),
    getAbout().catch(() => null),
  ]);
  return (
    <HomeIntroLab
      projects={projects}
      contact={about}
      initial={Number(v) || 1}
      count={Math.min(40, Math.max(0, Math.floor(Number(n) || 0)))}
    />
  );
}
