"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import HomeReel, { type IntroBuilder } from "@/components/home/HomeReel";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import CarouselHome from "@/components/lab/home-layouts/CarouselHome";
import { labHero, type Contact } from "@/components/lab/home-layouts/shared";
import { DESKTOP_QUERY, useIsDesktop } from "@/hooks/useIsDesktop";
import FlushHome from "@/components/lab/home-mobile/FlushHome";
import PhoneCarousel from "@/components/lab/home-mobile/PhoneCarousel";
import { saturnIntro } from "./intros";

interface Variant {
  name: string;
  build: IntroBuilder;
}

const noop = () => () => {};

// Ali 11-26 18:07: "lets just run saturn cleanly, slow it down a bit and
// remove all other prototypes".
const VARIANTS: Variant[] = [{ name: "Saturn", build: saturnIntro }];

/**
 * The Saturn entry into the carousel home. No picker on screen (Ali 11-26):
 * the URL picks the phone page (`?home=flush|carousel|auto`) and the count
 * (`?n=`); on a keyboard R replays and H changes the phone home. The entry
 * only plays on a full load.
 */
export default function HomeIntroLab({
  projects,
  contact,
  initial,
  count,
  phoneHome,
}: {
  projects: PROJECTS_QUERY_RESULT;
  contact?: Contact | null;
  initial: number;
  /** `?n=`: the projects repeated up to this many (6, 10, 15), to see how
   *  an intro copes with a longer list. The ring reads the same param. */
  count: number;
  /** `?home=`: the page the phone lands on (Ali 11-26). "flush" the old
   *  edge-to-edge strip, one project at a time; "carousel" the laptop's
   *  drifting row; "auto" the same row moving on one window at a time. */
  phoneHome: PhoneHome;
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
      else if ((e.key === "h" || e.key === "H") && !matchMedia(DESKTOP_QUERY).matches)
        cycleHome(phoneHome);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, select, phoneHome]);

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
            <CarouselHome projects={page} contact={contact} rootRef={rootRef} entry="glide" />
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
            {phoneHome === "flush" ? (
              <FlushHome projects={page} contact={contact} rootRef={rootRef} />
            ) : (
              <PhoneCarousel
                projects={page}
                contact={contact}
                rootRef={rootRef}
                motion={phoneHome === "auto" ? "step" : "drift"}
                entry="glide"
              />
            )}
            <HomeReel
              projects={projects}
              pageRef={rootRef}
              coverSizes={page.map(() => "100vw")}
              heroOverride={labHero}
              // The strip is the first project, full width: the ring dives
              // into it. The row: every project flies to its own window.
              landing={phoneHome === "flush" ? "dive" : "settle"}
              {...reel}
            />
          </>
        ))}
    </>
  );
}

type PhoneHome = "flush" | "carousel" | "auto";
const PHONE_HOMES: { key: PhoneHome; name: string }[] = [
  { key: "flush", name: "Flush" },
  { key: "carousel", name: "Carousel" },
  { key: "auto", name: "Auto carousel" },
];

/** Reloads with the next phone home (`?home=`), so the intro plays into it. */
function cycleHome(now: PhoneHome) {
  const i = PHONE_HOMES.findIndex((h) => h.key === now);
  const url = new URL(location.href);
  url.searchParams.set("home", PHONE_HOMES[(i + 1) % PHONE_HOMES.length].key);
  location.assign(url.toString());
}
