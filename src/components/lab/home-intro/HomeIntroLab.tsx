"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import HomeReel, { type IntroBuilder } from "@/components/home/HomeReel";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import CarouselHome from "@/components/lab/home-layouts/CarouselHome";
import { labHero, type Contact } from "@/components/lab/home-layouts/shared";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import PhoneCarousel from "@/components/lab/home-mobile/PhoneCarousel";
import { saturnIntro } from "./intros";

interface Variant {
  name: string;
  build: IntroBuilder;
  /** Px between the projects in the row. */
  gap: number;
}

const noop = () => () => {};

// Ali 11-26 18:07: Saturn only, a quarter slower. 18:13: less gap between
// the projects: none, a pixel, a little.
const VARIANTS: Variant[] = [
  { name: "No gap", build: saturnIntro, gap: 0 },
  { name: "1 px", build: saturnIntro, gap: 1 },
  { name: "8 px", build: saturnIntro, gap: 8 },
  { name: "16 px", build: saturnIntro, gap: 16 },
];

/**
 * Entries for the carousel home. No picker on screen (Ali 11-26): the URL
 * picks (`?v=1..4`, the gap, `?n=`), and on a keyboard
 * 1-4 or the arrows reload with another gap, R replays. An entry only plays on a full load.
 */
export default function HomeIntroLab({
  projects,
  contact,
  initial,
  count,
}: {
  projects: PROJECTS_QUERY_RESULT;
  contact?: Contact | null;
  initial: number;
  /** `?n=`: the projects repeated up to this many (6, 10, 15), to see how
   *  an intro copes with a longer list. The ring reads the same param. */
  count: number;
}) {
  // Repeats get their own ids, so each copy is its own cover on the page.
  const page =
    count > projects.length
      ? Array.from({ length: count }, (_, i) => {
          const p = projects[i % projects.length];
          return i < projects.length ? p : { ...p, _id: `${p._id}~${i}` };
        })
      : projects;
  const current = initial >= 1 && initial <= VARIANTS.length ? initial - 1 : 0;
  const variant = VARIANTS[current];
  const rootRef = useRef<HTMLDivElement>(null);

  const select = useCallback((i: number) => {
    if (i < 0 || i >= VARIANTS.length) return;
    const url = new URL(location.href);
    url.searchParams.set("v", String(i + 1));
    location.assign(url.toString());
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= VARIANTS.length) select(n - 1);
      else if (e.key === "ArrowRight") select((current + 1) % VARIANTS.length);
      else if (e.key === "ArrowLeft") select((current - 1 + VARIANTS.length) % VARIANTS.length);
      else if (e.key === "r" || e.key === "R") select(current);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, select]);

  // The laptop lands on the carousel, the phone on today's phone home. Client
  // only, so one tree (and one reel) mounts.
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const desktop = useIsDesktop();
  // The ring's cards match the covers they land on: the lab clips on the
  // carousel, the Sanity files on the phone home.
  const reel = { build: variant.build };

  return (
    <>
      {mounted &&
        (desktop ? (
          <>
            {/* The page first: its ref is set before the reel's layout effect
                looks for the covers (the reel renders into a portal anyway). */}
            <CarouselHome projects={page} contact={contact} rootRef={rootRef} gap={variant.gap} />
            <HomeReel
              projects={projects}
              pageRef={rootRef}
              coverSizes={page.map(() => "50vw")}
              heroOverride={labHero}
              {...reel}
            />
          </>
        ) : (
          <>
            {/* Ali 11-26 20:21: the laptop carousel on the phone too, drifting
                on by itself; Flush and Auto are gone. */}
            <PhoneCarousel projects={page} contact={contact} rootRef={rootRef} gap={variant.gap} />
            <HomeReel
              projects={projects}
              pageRef={rootRef}
              coverSizes={page.map(() => "100vw")}
              heroOverride={labHero}
              // Every project flies to its own window in the row.
              landing="settle"
              {...reel}
            />
          </>
        ))}
    </>
  );
}
