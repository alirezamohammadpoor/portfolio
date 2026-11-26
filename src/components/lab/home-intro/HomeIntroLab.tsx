"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import gsap from "gsap";
import HomeReel, { type IntroBuilder } from "@/components/home/HomeReel";
import { setReelState } from "@/lib/reel";
import { ease, prefersReducedMotion } from "@/lib/motion";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import CarouselHome from "@/components/lab/home-layouts/CarouselHome";
import { labHero, type Contact } from "@/components/lab/home-layouts/shared";
import { DESKTOP_QUERY, useIsDesktop } from "@/hooks/useIsDesktop";
import FlushHome from "@/components/lab/home-mobile/FlushHome";
import PhoneCarousel from "@/components/lab/home-mobile/PhoneCarousel";
import { flatRingIntro, ringIntro } from "./intros";

interface Variant {
  name: string;
  /** Unset: the home's own ring and dive. */
  build?: IntroBuilder;
  /** The ring sized with ringFit (whole oval on screen at any width). */
  fit?: boolean;
  /** No ring at all: the page itself staggers in. */
  stagger?: boolean;
}

const noop = () => () => {};

// The ring two first, then the fresh start (Ali 11-26 12:14).
// Ali 11-26 13:37: Original or the oval (Ring) to work on, for laptop AND
// phone; Slideshow, Big to small and Slide in are out (builders kept in
// intros.ts). Live is today's home, kept to compare the phone.
const VARIANTS: Variant[] = [
  { name: "Live" },
  { name: "Original", fit: true },
  { name: "Ring", build: ringIntro },
  // Ali 11-26 14:29: Ring is very nice on the phone; try it laid sideways.
  { name: "Flat ring", build: flatRingIntro },
  // Ali 11-26 13:51: no ring or oval, straight to the page, staggered in.
  { name: "Stagger", stagger: true },
];

/**
 * Entries for the carousel home. No picker on screen (Ali 11-26): the URL
 * picks (`?v=1..5`, `?home=flush|carousel|auto`, `?n=`), and on a keyboard
 * 1-5 or the arrows reload with another entry, R replays, H changes the
 * phone home. An entry only plays on a full load.
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
  const reel = { build: variant.build, fit: variant.fit };
  const stagger = variant.stagger === true;

  // Stagger: no reel. Turning it off hands the page its own entrance (the
  // statement and closing line rise line by line, on the phone the covers
  // rise row by row); here the Pebble drops in with it and, on the laptop,
  // the windows on screen drop into the row one after another.
  useLayoutEffect(() => {
    if (!mounted || !stagger) return;
    setReelState("off");
    if (prefersReducedMotion()) return;
    // Choreography (Emil's choreograph skill): the statement is the lead and
    // rises line by line from 0 (the page's own entrance), the closing line
    // follows as support. The windows are support too: they overlap the
    // statement's second line and rise less, with gaps that shrink (120, 90,
    // 60 ms...) so the row reads as a wave, not a queue. The Pebble is
    // decoration: it fades in place with the statement. The row's drift
    // waits for the last window to settle. Any input jumps to the end.
    const bar = document.querySelector("[data-site-bar]");
    const tweens: gsap.core.Tween[] = [];
    if (bar)
      tweens.push(
        gsap.fromTo(bar, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: ease.out }),
      );
    if (desktop || phoneHome === "carousel") {
      const cards = gsap.utils
        .toArray<HTMLElement>("[data-card]")
        .filter((c) => c.getBoundingClientRect().left < innerWidth);
      // The row waits for the windows; with none to wait for it just drifts.
      if (cards.length) document.documentElement.dataset.entering = "";
      const starts = cards.map((_, i) =>
        Array.from({ length: i }, (_, k) => Math.max(0.03, 0.12 - k * 0.03)).reduce(
          (t, g) => t + g,
          0,
        ),
      );
      tweens.push(
        gsap.fromTo(
          cards,
          { autoAlpha: 0, y: 16 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            ease: ease.out,
            delay: (i) => 0.25 + starts[i],
            clearProps: "transform,opacity,visibility",
            onComplete: () => delete document.documentElement.dataset.entering,
          },
        ),
      );
    }
    const skip = (e: Event) => {
      if ((e.target as Element | null)?.closest?.(".proto-picker")) return;
      tweens.forEach((t) => t.progress(1));
    };
    const opts = { passive: true, capture: true } as const;
    for (const type of ["wheel", "pointerdown", "keydown"] as const)
      addEventListener(type, skip, opts);
    return () => {
      for (const type of ["wheel", "pointerdown", "keydown"] as const)
        removeEventListener(type, skip, opts);
      delete document.documentElement.dataset.entering;
      tweens.forEach((t) => t.revert());
    };
  }, [mounted, stagger, desktop, phoneHome]);

  return (
    <>
      {mounted &&
        (desktop ? (
          <>
            {/* The page first: its ref is set before the reel's layout effect
                looks for the covers (the reel renders into a portal anyway). */}
            <CarouselHome
              projects={page}
              contact={contact}
              rootRef={rootRef}
              entry={stagger ? "stagger" : "glide"}
            />
            {!stagger && (
              <HomeReel
                projects={projects}
                pageRef={rootRef}
                coverSizes={page.map(() => "50vw")}
                heroOverride={labHero}
                {...reel}
              />
            )}
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
                entry={stagger ? "stagger" : "glide"}
              />
            )}
            {!stagger && (
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
            )}
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
