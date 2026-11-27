"use client";

import { useRef, useSyncExternalStore } from "react";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import HomeReel from "./HomeReel";
import CarouselHome from "./CarouselHome";
import PhoneCarousel from "./PhoneCarousel";
import { saturnIntro } from "./saturnIntro";
import type { Contact } from "./ClosingLine";

const noop = () => () => {};

/**
 * The home: the statement over a row of project covers that drifts on a loop
 * (laptop and phone). On the first load of a session the Saturn intro plays
 * first: the covers go round a level ring, almost edge-on, then land in
 * their slots of the row and the Pebble settles in (src/lib/reel.ts).
 *
 * Client only, so exactly one tree, and one intro, mounts for the screen.
 */
export default function Home({
  projects,
  contact,
}: {
  projects: PROJECTS_QUERY_RESULT;
  contact?: Contact | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const desktop = useIsDesktop();
  if (!mounted) return null;

  // The row first: its ref is set before the intro's layout effect looks for
  // the covers (the intro renders into a portal anyway).
  return desktop ? (
    <>
      <CarouselHome projects={projects} contact={contact} rootRef={rootRef} />
      <HomeReel
        projects={projects}
        pageRef={rootRef}
        coverSizes={projects.map(() => "96vh")}
        build={saturnIntro}
      />
    </>
  ) : (
    <>
      <PhoneCarousel projects={projects} contact={contact} rootRef={rootRef} />
      <HomeReel
        projects={projects}
        pageRef={rootRef}
        coverSizes={projects.map(() => "90vw")}
        landing="settle"
        build={saturnIntro}
      />
    </>
  );
}
