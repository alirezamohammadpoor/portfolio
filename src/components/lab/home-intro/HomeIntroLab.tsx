"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import gsap from "gsap";
import HomeReel, { type IntroBuilder } from "@/components/home/HomeReel";
import { setReelState } from "@/lib/reel";
import { ease, prefersReducedMotion } from "@/lib/motion";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import CarouselHome from "@/components/lab/home-layouts/CarouselHome";
import { labHero, type Contact } from "@/components/lab/home-layouts/shared";
import ScatterHome from "@/components/home/ScatterHome";
import { DESKTOP_QUERY, useIsDesktop } from "@/hooks/useIsDesktop";
import FlushHome, { type Axis } from "@/components/lab/home-mobile/FlushHome";
import PhoneCarousel from "@/components/lab/home-mobile/PhoneCarousel";
import { flatRingIntro, ringIntro } from "./intros";
import "@/components/lab/home-layouts/proto-picker.css";

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
 * Entries for the carousel home behind Emil Kowalski's prototype
 * picker. An entry only plays on a full load, so picking one (1-5, arrows)
 * reloads the page with `?v=N`; R plays the current one again.
 */
export default function HomeIntroLab({
  projects,
  contact,
  initial,
  count,
  phoneHome,
  axis,
}: {
  projects: PROJECTS_QUERY_RESULT;
  contact?: Contact | null;
  initial: number;
  /** `?n=`: the projects repeated up to this many (6, 10, 15), to see how
   *  an intro copes with a longer list. The ring reads the same param. */
  count: number;
  /** `?home=`: the page the phone lands on (Ali 11-26). "live" is today's
   *  phone home; "flush" the old edge-to-edge strip, one project at a time;
   *  "carousel" the laptop's drifting row. */
  phoneHome: PhoneHome;
  /** `?axis=y`: the flush strip swipes up and down, like the old home. */
  axis: Axis;
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
  // The phone's own page (live keeps today's home).
  const phonePage = !desktop && phoneHome !== "live";
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
        ) : phonePage ? (
          <>
            {phoneHome === "flush" ? (
              <FlushHome
                projects={page}
                contact={contact}
                rootRef={rootRef}
                axis={axis}
                reserve={PICKER_SPACE}
              />
            ) : (
              <PhoneCarousel
                projects={page}
                contact={contact}
                rootRef={rootRef}
                reserve={PICKER_SPACE}
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
                landing={phoneHome === "carousel" ? "settle" : "dive"}
                {...reel}
              />
            )}
          </>
        ) : (
          <ScatterHome projects={page} contact={contact} reel={stagger ? "none" : reel} />
        ))}
      <Picker
        current={current}
        onSelect={select}
        count={count || projects.length}
        phone={mounted && !desktop}
        phoneHome={phoneHome}
        axis={axis}
      />
    </>
  );
}

/** The phone pages stop above the picker, so nothing they show sits under it. */
const PICKER_SPACE = 64;

type PhoneHome = "live" | "flush" | "carousel";
const PHONE_HOMES: { key: PhoneHome; name: string }[] = [
  { key: "flush", name: "Flush" },
  { key: "carousel", name: "Carousel" },
  { key: "live", name: "Live" },
];

/** Reloads with the next phone home (`?home=`), so the intro plays into it. */
function cycleHome(now: PhoneHome) {
  const i = PHONE_HOMES.findIndex((h) => h.key === now);
  const url = new URL(location.href);
  url.searchParams.set("home", PHONE_HOMES[(i + 1) % PHONE_HOMES.length].key);
  location.assign(url.toString());
}

function setAxis(axis: Axis) {
  const url = new URL(location.href);
  if (axis === "x") url.searchParams.delete("axis");
  else url.searchParams.set("axis", axis);
  location.assign(url.toString());
}

const COUNTS = [6, 10, 15];

/** Reloads with `?n=`; the live count drops the param. */
function setCount(n: number, live: boolean) {
  const url = new URL(location.href);
  if (live) url.searchParams.delete("n");
  else url.searchParams.set("n", String(n));
  location.assign(url.toString());
}

function Picker({
  current,
  onSelect,
  count,
  phone,
  phoneHome,
  axis,
}: {
  current: number;
  onSelect: (i: number) => void;
  count: number;
  phone: boolean;
  phoneHome: PhoneHome;
  axis: Axis;
}) {
  const navRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useLayoutEffect(() => {
    const move = () => {
      const el = itemsRef.current[current];
      const hl = highlightRef.current;
      if (!el || !hl) return;
      hl.style.width = `${el.offsetWidth}px`;
      hl.style.transform = `translateX(${el.offsetLeft}px)`;
    };
    move();
    window.addEventListener("resize", move);
    return () => window.removeEventListener("resize", move);
  }, [current]);

  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => navRef.current?.setAttribute("data-ready", "")),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <nav ref={navRef} className="proto-picker" aria-label="Prototype variants">
      <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
      {VARIANTS.map((v, i) => (
        <button
          key={v.name}
          ref={(el) => {
            itemsRef.current[i] = el;
          }}
          type="button"
          className="proto-picker-item"
          data-active={i === current ? "" : undefined}
          aria-current={i === current ? "true" : undefined}
          onClick={() => onSelect(i)}
        >
          {v.name}
        </button>
      ))}
      {phone && (
        <>
          <span className="proto-picker-divider" aria-hidden="true" />
          {/* The page the phone lands on (H). */}
          <button
            type="button"
            className="proto-picker-item"
            aria-label="Phone home (H)"
            onClick={() => cycleHome(phoneHome)}
          >
            Home: {PHONE_HOMES.find((h) => h.key === phoneHome)?.name}
          </button>
          {phoneHome === "flush" && (
            <button
              type="button"
              className="proto-picker-item"
              aria-label="Swipe direction"
              onClick={() => setAxis(axis === "x" ? "y" : "x")}
            >
              {axis === "x" ? "↔" : "↕"}
            </button>
          )}
        </>
      )}
      <span className="proto-picker-divider" aria-hidden="true" />
      {/* How many projects (N): today's list, or repeats up to 10 and 15. */}
      <button
        type="button"
        className="proto-picker-item"
        aria-label="Number of projects"
        onClick={() => {
          const next = COUNTS[(COUNTS.findIndex((c) => c >= count) + 1) % COUNTS.length];
          setCount(next, next <= 6);
        }}
      >
        {count} projects
      </button>
      <span className="proto-picker-divider" aria-hidden="true" />
      <button
        type="button"
        className="proto-picker-item proto-picker-replay"
        aria-label="Replay animation (R)"
        onClick={() => onSelect(current)}
      >
        ↻
      </button>
    </nav>
  );
}
