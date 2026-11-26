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
  searchParams: Promise<{
    v?: string;
    frame?: string;
    clips?: string;
    phone?: string;
    photo?: string;
  }>;
}) {
  return (
    <Suspense fallback={null}>
      <Lab searchParams={searchParams} />
    </Suspense>
  );
}

async function Lab({
  searchParams,
}: {
  searchParams: Promise<{
    v?: string;
    frame?: string;
    clips?: string;
    phone?: string;
    photo?: string;
  }>;
}) {
  const [{ v, frame, clips, phone, photo }, projects, about] = await Promise.all([
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
      initialNewClips={clips !== "old"}
      initialPhoto={Math.min(4, Math.max(1, Number(photo) || 3))}
      initialPhone={
        (["now", "photo", "soft", "desktop", "colour"] as const).find((m) => m === phone) ?? "photo"
      }
    />
  );
}
