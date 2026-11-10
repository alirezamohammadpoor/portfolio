"use client";

/**
 * The gallery project page ("stage"), every breakpoint since 11-04 (Ali, after
 * elodiefabbri.com): a pill with the project's name at the top opens the text
 * over the whole page (ProjectDetailsOverlay); the page itself is one clip at
 * a time in a horizontal strip with a filmstrip of thumbnails at the bottom
 * (GalleryProgress); the next project's cover closes the filmstrip.
 *
 * Phone: cards are the full 4-column width with the neighbours stacked behind
 * (coverflow). Laptop: every card is the same height, centred, neighbours
 * flat at the edges with a 48 px gap; the vertical wheel and the arrow keys
 * move one card, and past the next project's preview the page hands off.
 *
 * Rules (see the action plan, phase 2): 1 item → no strip chrome; only the
 * current card and its two neighbours mount <video>; media fills a 4:3 frame
 * (object-cover, like the desktop gallery and the home → project clone);
 * reduced motion drops the depth transforms.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { EASE_OUT_CSS, dur, ease, stagger } from "@/lib/motion";
import NextProjectPreview from "@/components/project/NextProjectPreview";
import { onFirstVideoFrame } from "@/lib/firstFrame";
import { adoptableVideo, mountAdoptedVideo } from "@/lib/adoptVideo";
import { usePageTransition } from "@/context/TransitionContext";
import PhonesRow, { PHONE_ASPECT } from "@/components/PhonesRow";
import MediaFrame from "@/components/MediaFrame";
import { resolveFrame, resolveLandingFrame } from "@/lib/mediaFrame";
import { LANDING_ASPECT, LANDING_SIZES, imageAspect, landingKind, storedVideoAspect, videoAspect } from "@/lib/landing";
import ProjectDetailsOverlay from "@/components/project/ProjectDetailsOverlay";
import GalleryProgress from "@/components/project/GalleryProgress";
import TestReplay from "@/components/project/TestReplay";
import ProjectSwitcher from "@/components/project/ProjectSwitcher";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;

interface ProjectStageProps {
  project: Project;
  /** Hidden while the home → project clone is in flight. */
  hidden?: boolean;
  /** The first card: the clone's landing rect. */
  firstCardRef?: RefObject<HTMLDivElement | null>;
  /** First card's media is decoded; the clone may morph. */
  onFirstReady?: () => void;
  /** The next project's preview card at the end of the strip: its media rect. */
  previewRef?: RefObject<HTMLDivElement | null>;
  /** Run the in-place next-project transition (preview tap or pill). */
  onNavigateNext?: () => void;
  /** Laptop layout: equal-height cards, flat neighbours, wheel steps. */
  isDesktop?: boolean;
  /** Open any project from the switcher, morphing from `media` when it can. */
  onNavigateTo?: (slug: string, media: HTMLElement | null) => void;
}

// Motion spec (phase 2). Reference: Swiper coverflow demo at 390 px —
// 300 px snap settles in ~290 ms, next card peeks 22 px. Ours: card is the
// full 4-column width, neighbours overlap 44 px behind it at 0.92 scale.
const OVERLAP = 44;
const NEIGHBOUR_SCALE = 0.92;
const NEIGHBOUR_OPACITY = 0.6;
const SETTLE_MS = 200;
const ITEM_W = "calc(100vw - 2 * var(--grid-margin))";
// Phone: the band a card may fill, the viewport less the header, the pill
// row (h-14), the room kept under the strip for the filmstrip (pb-[52px])
// and the strip's own padding (py-6). A tall clip, a 4:5 phone frame or a
// lone phone screen gets narrower instead of running under the filmstrip.
// snap-center centres a narrower card between its neighbours; the first and
// the last card get there through the strip's side padding (the layout
// effect below), and the depth loop reads each card's own offsetWidth.
const PHONE_BAND = "calc(100svh - var(--header-height) - 56px - 52px - 48px)";
/** A phone card's width: the full column width unless the band bounds it. */
const phoneCardWidth = (boxAspect: number, gapsPx = 0, band = PHONE_BAND) =>
  `min(${ITEM_W}, calc(${band} * ${boxAspect.toFixed(4)} + ${gapsPx}px))`;
// Laptop: one height for every card (Figma "Gallery · laptop alternatives",
// 11-04: 640 at 1440×900), the width follows each card's ratio.
const DESK_H = "min(760px, calc(100svh - var(--header-height) - 200px))";
const DESK_GAP = 48;
// Card height cap on laptop (Ali 11-04: raised from 640 so big screens keep 8 columns).
const DESK_MAX_H = 760;
// Hold on the next project's cover before it opens.
const AUTO_NEXT_MS = 1500;
// Phone: how far a fresh swipe on the next project's card travels before it opens it.
const SWIPE_NEXT_PX = 40;

type DeskGrid = { col: number; gutter: number; h: number };
/** Laptop grid in px (globals.css: 12 columns, --grid-margin, --grid-gutter) and the card height budget. */
function measureDeskGrid(): DeskGrid {
  const cs = getComputedStyle(document.documentElement);
  const margin = parseFloat(cs.getPropertyValue("--grid-margin")) || 24;
  const gutter = parseFloat(cs.getPropertyValue("--grid-gutter")) || 16;
  const header = parseFloat(cs.getPropertyValue("--header-height")) || 40;
  const vw = document.documentElement.clientWidth;
  return { col: (vw - 2 * margin - 11 * gutter) / 12, gutter, h: Math.min(DESK_MAX_H, window.innerHeight - header - 200) };
}
// Vertical wheel → one card per gesture (see the wheel effect).
const WHEEL_STEP = 40;
const GESTURE_SILENCE_MS = 150;
const REFLICK_MIN = 40;
const REFLICK_MS = 350;

/**
 * A card's clip sits on its poster still, not on the <video>'s own `poster`:
 * the moment a clip starts playing the browser drops that poster, and until
 * the first frame has decoded the card showed its black box for a frame or
 * two (Ali, 11-05: the flicker on every swipe to the next clip). Here the
 * still is an image under the clip and the clip stays invisible until it has
 * presented a frame, so a swipe goes still → moving picture with nothing between.
 */
function revealOnFirstFrame(video: HTMLVideoElement | null): (() => void) | undefined {
  if (!video) return;
  if (video.readyState >= 2) return;
  video.style.opacity = "0";
  return onFirstVideoFrame(video, () => {
    video.style.opacity = "";
  });
}

export default function ProjectStage({
  project,
  hidden = false,
  firstCardRef,
  onFirstReady,
  previewRef,
  onNavigateNext,
  isDesktop = false,
  onNavigateTo,
}: ProjectStageProps) {
  const gallery = project.gallery ?? [];
  const nextProject = project.nextProject;
  const allProjects = project.allProjects ?? [];
  const hasPreview = Boolean(nextProject?.firstMedia && nextProject?.slug?.current && onNavigateNext);
  const stripRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const firstVideoRef = useRef<HTMLVideoElement | null>(null);
  // Project → project: card 1 takes the live <video> the clone carries when
  // it is the same file (see adoptVideo.ts).
  const { isTransitioning, inPlace, sourceVideoElement } = usePageTransition();
  const [adopted] = useState(() => {
    const first = gallery[0];
    const src = first?._type === "galleryVideo" && first.video?.asset?._ref ? fileUrl(first.video.asset._ref) : undefined;
    return adoptableVideo(sourceVideoElement, inPlace, src);
  });
  const adoptHostRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = adoptHostRef.current;
    if (!adopted || !host || isTransitioning || adopted.parentElement === host) return;
    mountAdoptedVideo(host, adopted, `${project.title} — 1`);
    firstVideoRef.current = adopted;
  }, [adopted, isTransitioning, project.title]);
  const [index, setIndex] = useState(0);
  // A/B test clips (Sanity testName on a phones row): the name pill names
  // the centred one and carries its replay slot (TestReplay).
  const hasTests = gallery.some((g) => g._type === "galleryPhones" && Boolean(g.testName));
  const [replay, setReplay] = useState(0);
  // Key of the test clip holding its last frame (the pill's icon brightens).
  const [endedKey, setEndedKey] = useState<string | null>(null);
  // The next project's preview card is centred (it is not in `index`, which
  // counts gallery clips only): the filmstrip hands over to the next pill.
  const [atPreview, setAtPreview] = useState(false);
  const current = gallery[index];
  // Video ratios as they report metadata (by item key); images carry theirs.
  // An adopted element already knows its size.
  const [videoAspects, setVideoAspects] = useState<Record<string, number>>(() => {
    const first = gallery[0];
    const known = adopted && first?._type === "galleryVideo" ? videoAspect(adopted) : null;
    return known && first?._key ? { [first._key]: known } : {};
  });
  const setVideoAspect = (key: string | undefined, aspect: number | null) => {
    if (!key || !aspect) return;
    setVideoAspects((prev) => (prev[key] === aspect ? prev : { ...prev, [key]: aspect }));
  };
  const [reduceMotion, setReduceMotion] = useState(false);
  // Laptop grid, re-measured on resize. Measured in the initialiser too: the
  // home → project clone measures card 1 in the page's own layout effect,
  // which runs before a re-render from this component's effects would land,
  // so the first render must already be snapped.
  const [grid, setGrid] = useState<DeskGrid | null>(() => (isDesktop ? measureDeskGrid() : null));
  useLayoutEffect(() => {
    if (!isDesktop) return;
    const measure = () => {
      const g = measureDeskGrid();
      setGrid((prev) => (prev && prev.col === g.col && prev.gutter === g.gutter && prev.h === g.h ? prev : g));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isDesktop]);

  // Entrance (Ali, 11-04: nothing moves until the morph is done). The stage
  // stays hidden while the home → project clone is in flight and `hidden`
  // flips on the clone's own completion (TransitionOverlay: the morph tween's
  // onComplete, then the landing media's first frame → pageRevealed), never
  // on a timer. Then the name pill, the cards beside card 1 (slide 2 and on,
  // the next project's preview) and the filmstrip come in one beat apart. A
  // direct load runs the same entrance at once. Card 1 does not animate: it
  // is the shared element the clone lands on.
  const rootRef = useRef<HTMLDivElement>(null);
  // The cards' CSS settle transition would smooth (and delay) every frame
  // of the entrance, so it is off until the entrance is done.
  const [entering, setEntering] = useState(true);
  // Mounted as the landing page of a project → project hand-off.
  const [arrivedInPlace] = useState(() => isTransitioning && inPlace);
  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const pill = root.querySelectorAll("[data-stage-chrome='pill']");
      const film = root.querySelectorAll("[data-stage-chrome='film']");
      // Project → project: the pill and the filmstrip were on screen a frame
      // ago (the last page's). They stay up through the hand-off and only
      // swap their contents, instead of vanishing with the old page and
      // fading back in once the clone settles (Ali, 11-05: the blink when
      // the next project takes over).
      if (arrivedInPlace) gsap.set([...pill, ...film], { autoAlpha: 1, yPercent: 0 });
      if (hidden) return;
      const cards = itemRefs.current.slice(1).filter((el): el is HTMLDivElement => Boolean(el));
      const rise = reduceMotion ? 0 : 40;
      const tl = gsap.timeline({ defaults: { duration: dur.text, ease: ease.out }, onComplete: () => setEntering(false) });
      if (pill.length && !arrivedInPlace) tl.fromTo(pill, { yPercent: rise, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1 }, 0);
      if (cards.length) {
        // Phone: the neighbours rest at NEIGHBOUR_OPACITY behind card 1 and
        // the scroll loop owns their transform, so they only fade, to the
        // opacity they rest at. Laptop: flat cards slide in from the right.
        const rest = isDesktop || reduceMotion ? 1 : NEIGHBOUR_OPACITY;
        tl.fromTo(
          cards,
          { opacity: 0, x: isDesktop && !reduceMotion ? 48 : 0 },
          {
            opacity: rest,
            x: 0,
            stagger: reduceMotion ? 0 : stagger,
            clearProps: isDesktop || reduceMotion ? "opacity,transform" : "transform",
          },
          stagger,
        );
      }
      if (film.length && !arrivedInPlace) tl.fromTo(film, { yPercent: rise, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1 }, 2 * stagger);
    },
    { scope: rootRef, dependencies: [hidden] },
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  // Every project (ProjectSwitcher, the index button on the filmstrip).
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const closeSwitcher = useCallback(() => setSwitcherOpen(false), []);
  // The centred clip's A/B test, named in the name pill; the pill reads as
  // the project again over the details or the switcher and on the next
  // project's card.
  const pillFree = !atPreview && !detailsOpen && !switcherOpen;
  const testName = pillFree && current?._type === "galleryPhones" ? (current.testName ?? null) : null;
  // Any other clip can name itself in the pill too (Sanity `label`, e.g.
  // "Prototype – Shop the Look"); it loops as usual, so no replay slot.
  const clipLabel =
    pillFree && !testName && (current?._type === "galleryPhones" || current?._type === "galleryVideo")
      ? current.label?.trim() || null
      : null;
  const pillLabel = testName ? `A/B test – ${testName}` : clipLabel;
  // Either overlay covers the strip: no wheel, keys, swipes or auto-advance
  // under it, and the centred clip pauses.
  const covered = detailsOpen || switcherOpen;
  const detailsOpenRef = useRef(false);
  useLayoutEffect(() => {
    detailsOpenRef.current = covered;
  }, [covered]);
  const hiddenRef = useRef(hidden);
  useLayoutEffect(() => {
    hiddenRef.current = hidden;
  }, [hidden]);
  const closeDetails = useCallback(() => setDetailsOpen(false), []);
  // While the finger is down the cards track scroll 1:1 (no CSS transition
  // fighting the per-frame transform); the 200 ms settle applies once idle.
  const [scrolling, setScrolling] = useState(false);
  // The same, readable from the layout effects without a re-render.
  const scrollingRef = useRef(false);
  const last = gallery.length - 1;
  const single = gallery.length <= 1;
  // Centred card including the next project's preview (index stops at the
  // last gallery card): the wheel steps from here.
  const posRef = useRef(0);
  const flat = reduceMotion || isDesktop;
  const nextSlug = nextProject?.slug?.current;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Which card is centred: `scrollend` where supported (Chrome, Firefox),
  // rAF-throttled scroll elsewhere (Safari has no scrollend). Depth transforms are applied per frame only while
  // scrolling, so an idle page costs nothing.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    let raf = 0;
    const measure = () => {
      const mid = strip.scrollLeft + strip.clientWidth / 2;
      let best = { d: Infinity, i: 0 };
      let bestAll = { d: Infinity, i: 0 };
      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        const dAll = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
        if (dAll < bestAll.d) bestAll = { d: dAll, i };
        if (isDesktop) {
          // Laptop: flat strip, no depth.
          el.style.transform = "";
          el.style.opacity = "";
          el.style.zIndex = "";
          if (i <= last && dAll < best.d) best = { d: dAll, i };
          return;
        }
        // The preview card is not part of the gallery's progress; it only
        // gets the depth treatment.
        if (i > last) {
          const c = el.offsetLeft + el.offsetWidth / 2;
          const t = Math.min(1, Math.abs(c - mid) / el.offsetWidth);
          el.style.transform = reduceMotion ? "" : `scale(${1 - (1 - NEIGHBOUR_SCALE) * t})`;
          el.style.opacity = reduceMotion ? "" : String(1 - (1 - NEIGHBOUR_OPACITY) * t);
          // Same stacking rule as the gallery cards. Without it the preview
          // stayed at z-index auto, and the last gallery card (overlapping it
          // by 44 px, z-index 5 when one card away) painted over its left edge.
          el.style.zIndex = reduceMotion ? String(t < 0.5 ? 10 : 5) : String(10 - Math.round(t * 5));
          return;
        }
        const c = el.offsetLeft + el.offsetWidth / 2;
        const d = Math.abs(c - mid);
        if (d < best.d) best = { d, i };
        if (reduceMotion) {
          el.style.transform = "";
          el.style.opacity = "";
          el.style.zIndex = String(d < el.offsetWidth / 2 ? 10 : 5);
          return;
        }
        const t = Math.min(1, d / el.offsetWidth); // 0 centred → 1 one card away
        el.style.transform = `scale(${1 - (1 - NEIGHBOUR_SCALE) * t})`;
        el.style.opacity = String(1 - (1 - NEIGHBOUR_OPACITY) * t);
        el.style.zIndex = String(10 - Math.round(t * 5));
      });
      posRef.current = bestAll.i;
      setIndex((prev) => (prev === best.i ? prev : best.i));
      setAtPreview(bestAll.i > last);
    };
    let idle = 0;
    const settle = () => {
      measure();
      scrollingRef.current = false;
      setScrolling(false);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
      scrollingRef.current = true;
      setScrolling(true);
      // Safari has no scrollend: treat 120 ms of silence as idle.
      clearTimeout(idle);
      idle = window.setTimeout(settle, 120);
    };
    measure();
    strip.addEventListener("scroll", onScroll, { passive: true });
    strip.addEventListener("scrollend", settle);
    window.addEventListener("resize", measure);
    return () => {
      strip.removeEventListener("scroll", onScroll);
      strip.removeEventListener("scrollend", settle);
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
      clearTimeout(idle);
      // A settle the cleared timer owed: otherwise the flag would stay up
      // until the next gesture, with the re-centring below skipped meanwhile.
      scrollingRef.current = false;
      setScrolling(false);
    };
  }, [gallery.length, reduceMotion, last, isDesktop]);

  // The strip's side padding centres the first and the last card (their
  // widths follow their media, which may report its size late). On the phone
  // the server-rendered padding is the grid margin: right for a full-width
  // card, only the first paint for a narrower one.
  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const apply = () => {
      const kids = itemRefs.current.filter((el): el is HTMLDivElement => Boolean(el));
      const first = kids[0];
      const lastEl = kids[kids.length - 1];
      if (!first || !lastEl) return;
      strip.style.paddingLeft = `${Math.max(0, (strip.clientWidth - first.offsetWidth) / 2)}px`;
      strip.style.paddingRight = `${Math.max(0, (strip.clientWidth - lastEl.offsetWidth) / 2)}px`;
      // Re-centring is for a layout change at rest (a resize, a clip
      // reporting its ratio). Mid-motion it would yank a glide or a native
      // swipe onto the card that was nearest a frame ago; with mandatory
      // snap the browser settles the strip itself when the gesture ends.
      if (gsap.isTweening(strip) || scrollingRef.current) return;
      const current = itemRefs.current[posRef.current];
      // This write scrolls too (the flag goes up until the strip settles), so
      // a second change in the same breath is left to the snap.
      if (current) strip.scrollLeft = current.offsetLeft - (strip.clientWidth - current.offsetWidth) / 2;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(strip);
    itemRefs.current.forEach((el) => el && ro.observe(el));
    return () => {
      ro.disconnect();
      strip.style.paddingLeft = "";
      strip.style.paddingRight = "";
    };
  }, [isDesktop, gallery.length, hasPreview]);

  // Keyboard steps jump (Emil: never animate a keyboard action, it is
  // repeated too often); the wheel glides.
  // Where a running glide is heading. The scroll handler moves posRef to the
  // card nearest the centre on every frame, so mid-glide only this knows the
  // target (a quick second swipe must go one past it, not repeat it).
  const glideTargetRef = useRef<number | null>(null);
  const goTo = (i: number, instant = false) => {
    const strip = stripRef.current;
    const el = itemRefs.current[i];
    if (!strip || !el) return;
    const left = el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2;
    if (reduceMotion || instant) {
      // A glide cut short never runs its onComplete: snap is given back here.
      gsap.killTweensOf(strip);
      strip.style.scrollSnapType = "";
      glideTargetRef.current = null;
      strip.scrollTo({ left, behavior: "auto" });
      return;
    }
    // The glide on the site's out curve (the browser's own smooth scroll has
    // its own timing and stutters against snap). Snap is off while it runs,
    // and a new step retargets from wherever the strip is.
    strip.style.scrollSnapType = "none";
    glideTargetRef.current = i;
    gsap.to(strip, {
      scrollLeft: left,
      duration: 0.6,
      ease: ease.out,
      overwrite: true,
      onComplete: () => {
        strip.style.scrollSnapType = "";
        glideTargetRef.current = null;
      },
    });
  };
  // One card forward or back; past the end (the preview, or the last card
  // when there is none) the next project takes over.
  const stepRef = useRef<(dir: 1 | -1, instant?: boolean) => void>(() => {});
  const handedOffRef = useRef(false);
  // The card nearest the strip's centre, read from the strip itself.
  const nearest = () => {
    const strip = stripRef.current;
    if (!strip) return posRef.current;
    const mid = strip.scrollLeft + strip.clientWidth / 2;
    let best = { d: Infinity, i: posRef.current };
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      if (d < best.d) best = { d, i };
    });
    return best.i;
  };
  const step = (dir: 1 | -1, instant = false) => {
    const maxPos = hasPreview ? gallery.length : last;
    // Mid-glide the target is the truth; at rest the strip is (a page shown
    // again after browser back may sit somewhere else than posRef says).
    const strip = stripRef.current;
    const from =
      strip && gsap.isTweening(strip) && glideTargetRef.current !== null ? glideTargetRef.current : nearest();
    const target = from + dir;
    if (target > maxPos) {
      // Once: a second flick on the way out must not start a second hand-off.
      if (dir > 0 && onNavigateNext && nextSlug && !handedOffRef.current) {
        handedOffRef.current = true;
        onNavigateNext();
      }
      return;
    }
    if (target < 0) return;
    posRef.current = target;
    goTo(target, instant);
  };
  useLayoutEffect(() => {
    stepRef.current = step;
  });

  // Shown again (browser back from the next project: this page stayed
  // mounted hidden, parked on the next project's card). Come back on the last
  // clip of this project, so the next swipe shows its own content again
  // instead of leaving at once.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || !hasPreview) return;
    const raf = requestAnimationFrame(() => {
      if (nearest() <= last) return;
      posRef.current = last;
      goTo(last, true);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Laptop: vertical wheel and arrow keys step the strip (a horizontal
  // trackpad swipe scrolls it natively, snapping on its own).
  useEffect(() => {
    if (!isDesktop) return;
    // One gesture = one card, the rule the home gallery settled on after
    // magnitude heuristics kept failing on real trackpads. A gesture is a
    // stream of deltas (a drag, or a flick: a short ramp, then a decaying
    // inertia tail of a second or more); it ends after GESTURE_SILENCE_MS of
    // silence or on a direction change. The exception is a decisive second
    // flick inside the tail: the stream has been falling and a real push
    // (≥ REFLICK_MIN, at least 4x the tail's low point) arrives more than
    // REFLICK_MS after the last step. Without it a quick double swipe lost
    // its second half, which on the next project's card meant no hand-off.
    // Times are the events' own (`timeStamp`): while a hand-off mounts the
    // next page the tail queues and arrives in a burst, and handling time
    // would read the wait as silence.
    // It starts mid-gesture and consumed: the page may have just taken over
    // from the previous project, and the rest of that swipe must not step it.
    // Shown again (browser back keeps this page mounted hidden): it may hand off again.
    handedOffRef.current = false;
    let lastWheelAt = performance.now();
    let lastDelta = 0;
    let lastSign = 0;
    let lastStepAt = -Infinity;
    let consumed = true;
    let decaying = false;
    let trough = Infinity;
    let acc = 0;
    // A sideways swipe scrolls the strip natively (with snap). At its end
    // there is nothing left to scroll, so a NEW sideways swipe there (not
    // the one that brought the next project's card in) hands off, like a
    // downward one.
    let lastAxis: "x" | "y" | null = null;
    let startedAtEnd = false;
    const stripAtEnd = () => {
      const strip = stripRef.current;
      return !!strip && strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2;
    };
    const onWheel = (e: WheelEvent) => {
      // ctrl+wheel is the browser's zoom.
      if (detailsOpenRef.current || e.ctrlKey) return;
      const axis = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? "x" : "y";
      const delta = axis === "x" ? e.deltaX : e.deltaY;
      const now = e.timeStamp;
      const magnitude = Math.abs(delta);
      const reflick =
        decaying && magnitude >= REFLICK_MIN && magnitude > trough * 4 && now - lastStepAt > REFLICK_MS;
      const newGesture =
        now - lastWheelAt > GESTURE_SILENCE_MS ||
        (lastAxis !== null && axis !== lastAxis) ||
        (lastSign !== 0 && Math.sign(delta) !== lastSign) ||
        reflick;
      if (newGesture) {
        consumed = false;
        decaying = false;
        trough = Infinity;
        acc = 0;
        startedAtEnd = axis === "x" && stripAtEnd();
      } else if (magnitude < lastDelta) {
        decaying = true;
        trough = Math.min(trough, magnitude);
      }
      lastWheelAt = now;
      lastDelta = magnitude;
      lastAxis = axis;
      if (delta !== 0) lastSign = Math.sign(delta);
      // Under the arriving clone the stage must not move: the clone's
      // landing rect was measured on card 1. The whole gesture is spent.
      if (hiddenRef.current) {
        consumed = true;
        return;
      }
      if (consumed) return;
      if (axis === "x" && (!startedAtEnd || delta <= 0)) return;
      acc += delta;
      if (Math.abs(acc) < WHEEL_STEP) return;
      consumed = true;
      lastStepAt = now;
      stepRef.current(acc > 0 ? 1 : -1);
    };
    const onKey = (e: KeyboardEvent) => {
      if (detailsOpenRef.current || hiddenRef.current || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const fwd = e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown";
      const back = e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp";
      if (!fwd && !back) return;
      e.preventDefault();
      stepRef.current(fwd ? 1 : -1, true);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [isDesktop]);

  // Landing on the next project's cover opens it after a short hold (Ali,
  // 11-04: a scroll past the last clip felt stuck). The hold restarts on any
  // movement, waits for the strip to settle, and stops while the text is
  // open. It shares the wheel's once-only hand-off guard.
  // Shown again after browser back (every breakpoint; the laptop wheel effect
  // resets it as well): it may hand off again.
  useEffect(() => {
    handedOffRef.current = false;
  }, []);
  useEffect(() => {
    if (!atPreview || scrolling || covered || hidden || !onNavigateNext) return;
    const t = window.setTimeout(() => {
      if (handedOffRef.current) return;
      handedOffRef.current = true;
      onNavigateNext();
    }, AUTO_NEXT_MS);
    return () => window.clearTimeout(t);
  }, [atPreview, scrolling, covered, hidden, onNavigateNext]);

  // Phone: a swipe on the next project's card opens it (Ali, 11-05: at the
  // end of the strip a swipe did nothing, only a tap or the hold moved on).
  // Only a NEW swipe that starts with the strip already at its end and goes
  // on leftwards counts: the swipe that brings the card in, and one back to
  // this project's clips, scroll the strip as before. Mirrors the laptop's
  // sideways-swipe rule in the wheel effect above.
  useEffect(() => {
    const strip = stripRef.current;
    if (isDesktop || !strip || !hasPreview) return;
    let start: { x: number; y: number } | null = null;
    const atEnd = () => strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      // posRef: the next project's card is the centred one, even while the
      // strip is still settling from the swipe that brought it in.
      start = e.touches.length === 1 && t && (atEnd() || posRef.current > last) && !gsap.isTweening(strip) ? { x: t.clientX, y: t.clientY } : null;
    };
    const onEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const s = start;
      start = null;
      if (!s || !t || detailsOpenRef.current || hiddenRef.current) return;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (dx > -SWIPE_NEXT_PX || Math.abs(dx) < Math.abs(dy)) return;
      if (handedOffRef.current) return;
      handedOffRef.current = true;
      onNavigateNext?.();
    };
    const onCancel = () => {
      start = null;
    };
    strip.addEventListener("touchstart", onStart, { passive: true });
    strip.addEventListener("touchend", onEnd, { passive: true });
    strip.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      strip.removeEventListener("touchstart", onStart);
      strip.removeEventListener("touchend", onEnd);
      strip.removeEventListener("touchcancel", onCancel);
    };
  }, [isDesktop, hasPreview, onNavigateNext, last]);

  // A video first card reports ready on its first presented frame (see
  // firstFrame.ts): the clone covering it must not leave on a black frame.
  // A phones row as card 1 (the schema warns against it) has no single frame
  // to wait for: its height comes from the screens' ratio, so the clone may
  // land on it at once instead of leaving the page hidden.
  const firstIsPhones = gallery[0]?._type === "galleryPhones";
  useEffect(() => {
    if (!onFirstReady) return;
    if (adopted || firstIsPhones) {
      onFirstReady();
      return;
    }
    const first = firstVideoRef.current;
    if (!first) return;
    return onFirstVideoFrame(first, onFirstReady);
  }, [onFirstReady, adopted, firstIsPhones]);

  // The details overlay covers the strip with a 40 px backdrop blur: a clip
  // playing under it repaints that blur every frame, so it pauses while the
  // text is open and picks up again on close.
  useEffect(() => {
    const videos = itemRefs.current[index]?.querySelectorAll("video");
    if (!videos?.length) return;
    videos.forEach((v) => {
      if (covered) v.pause();
      else {
        // An A/B test clip (InlineClip `once`) holding its last frame (or
        // resting there under reduced motion) stays; one paused mid-film by
        // the overlay (a replay) carries on.
        if (v.dataset.once && (v.ended || v.currentTime >= v.duration - 0.1)) return;
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    });
  }, [covered, index]);

  // Video budget: only the centred card plays; neighbours sit paused on their
  // first frame; everything else is unmounted (see `near` below). A phones
  // row holds up to three clips, so every <video> of a card counts.
  useEffect(() => {
    itemRefs.current.forEach((el, i) => {
      el?.querySelectorAll("video").forEach((v) => {
        // A/B test clips run themselves (play once from the start when centred).
        if (v.dataset.once) return;
        if (i === index) {
          const p = v.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } else {
          v.pause();
        }
      });
    });
    // Left hidden (Next keeps the page mounted; display: none does not pause
    // media) the centred clip stops looping. Captured here: the item refs are
    // nulled before this cleanup runs on a hide. Querying at cleanup time
    // also catches an element adopted into card 1 after this ran.
    const current = itemRefs.current[index];
    return () => current?.querySelectorAll("video").forEach((v) => v.pause());
  }, [index]);

  const onEnd = index >= last && Boolean(nextSlug && onNavigateNext);
  // Desktop card box (Ali, 11-04: "use the columns"): the widest even
  // column span that fits the card height at the box's ratio, so the
  // centred card starts and ends on the 12-column grid (an even span
  // centred in 12 columns lands on column edges). The height follows the
  // width. Before the grid is measured: one height, the width from the ratio.
  const span = (n: number) => (grid ? n * grid.col + (n - 1) * grid.gutter : 0);
  const snapWidth = (natural: number) => {
    if (!grid) return 0;
    let n = 12;
    while (n > 2 && span(n) > natural) n -= 2;
    return span(n);
  };
  const deskBox = (boxAspect: number, i: number) => {
    if (!grid) return { height: DESK_H, aspectRatio: boxAspect, marginLeft: i === 0 ? 0 : DESK_GAP };
    const width = snapWidth(grid.h * boxAspect);
    return { width, height: width / boxAspect, marginLeft: i === 0 ? 0 : DESK_GAP };
  };
  // Phones on the page: the screens fill the snapped width, the height follows.
  const phonesDeskBox = (screens: number, i: number) => {
    const gaps = (screens - 1) * 16;
    if (!grid)
      return {
        height: DESK_H,
        width: `calc(${DESK_H} * ${(screens * PHONE_ASPECT).toFixed(4)} + ${gaps}px)`,
        marginLeft: i === 0 ? 0 : DESK_GAP,
      };
    const natural = grid.h * screens * PHONE_ASPECT + gaps;
    // The snap never goes under two columns; a lone phone on a short laptop
    // (1280×720) would then outgrow the height budget and run into the test
    // pill, so with tests on the page it keeps its natural width instead.
    const width = hasTests ? Math.min(snapWidth(natural), natural) : snapWidth(natural);
    return { width, height: (width - gaps) / (screens * PHONE_ASPECT), marginLeft: i === 0 ? 0 : DESK_GAP };
  };

  return (
    <div
      ref={rootRef}
      className={`fixed inset-x-0 bottom-0 top-[var(--header-height)] flex flex-col overflow-hidden bg-bg${hidden && !arrivedInPlace ? " opacity-0" : ""}${hidden ? " pointer-events-none" : ""}`}
    >
      {/* The name pill: the page's title and the one way into the text.
          Fixed height, so card 1 sits on the same y on every project (the
          project → project clone lands on the previous page's y). */}
      <h1 className="sr-only">{project.title}</h1>
      <div className="relative z-50 flex h-14 shrink-0 items-start justify-center pt-2">
        {/* With an A/B test centred (Figma "Test pill · placement · 11-09",
            Ali picked C + R3) the pill carries it: the replay slot on the
            left, the test's name after the title. A phone has room for one,
            so there the test's name stands in for the title. */}
        <div
          data-stage-chrome="pill"
          className={`frost-soft invisible inline-flex h-9 max-w-[calc(100vw-2*var(--grid-margin))] items-center rounded-full text-body text-primary ${testName ? "pl-1" : ""}`}
        >
          {testName && (
            <TestReplay
              key={current?._key}
              name={testName}
              ended={Boolean(current && endedKey === current._key)}
              reduceMotion={reduceMotion}
              getVideo={() => itemRefs.current[index]?.querySelector<HTMLVideoElement>("video[data-once]") ?? null}
              onReplay={() => setReplay((r) => r + 1)}
            />
          )}
          <button
            type="button"
            aria-expanded={detailsOpen}
            aria-controls="project-details"
            onClick={() => {
              setSwitcherOpen(false);
              setDetailsOpen((o) => !o);
            }}
            className={`inline-flex h-full min-w-0 cursor-pointer items-center gap-2 rounded-full pr-4 transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] select-none active:scale-[0.97] ${testName ? "pl-2" : "pl-4"}`}
          >
            <span className="truncate">
              {pillLabel ? (
                <>
                  {isDesktop && (
                    <>
                      {project.title} <span className="text-secondary">·</span>{" "}
                    </>
                  )}
                  {pillLabel}
                </>
              ) : (
                project.title
              )}
            </span>
            <span
              aria-hidden="true"
              className="shrink-0 text-[0.5rem]"
              style={{ transform: detailsOpen ? "rotate(180deg)" : "none", transition: reduceMotion ? "none" : `transform 200ms ${EASE_OUT_CSS}` }}
            >
              ▼
            </span>
          </button>
        </div>
      </div>

      {/* Strip, vertically centred in the remaining space */}
      <div className={`flex flex-1 items-center pb-[52px] desktop:pb-[72px] ${hidden && arrivedInPlace ? "opacity-0" : ""}`}>
        <div
          ref={stripRef}
          // A lone card is centred by the strip itself; with the next project's
          // preview beside it the two overflow, so they snap like any strip.
          className={`flex w-full ${isDesktop ? "items-center" : "items-start"} overflow-x-auto py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${single && !hasPreview ? "justify-center" : "snap-x snap-mandatory"}`}
          style={isDesktop ? undefined : { scrollPaddingInline: "var(--grid-margin)", paddingInline: "var(--grid-margin)" }}
          data-lenis-prevent
          data-stage-strip
          role="region"
          aria-roledescription="carousel"
          aria-label={`${project.title} gallery, ${gallery.length} items`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (isDesktop) return; // the window listener steps on laptop
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault();
            const next = Math.min(last, Math.max(0, index + (e.key === "ArrowRight" ? 1 : -1)));
            const el = itemRefs.current[next];
            const strip = stripRef.current;
            if (!el || !strip) return;
            strip.scrollTo({ left: el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2, behavior: "auto" });
          }}
        >
          {gallery.map((item, i) => {
            if (item._type === "galleryPhones") {
              const phonesFrame = resolveFrame(item.frame, project, "phones");
              // Laptop: screens on the page (no background) make the card
              // exactly as wide as the screens at the card height, so whole
              // phones show instead of a 16:10 crop of their tops. With a
              // background the row is its own 16:10 panel.
              const screens = Math.min(3, Math.max(1, item.phones?.length ?? 1));
              const phonesBox = phonesFrame.background
                ? deskBox(LANDING_ASPECT.stage, i)
                : phonesDeskBox(screens, i);
              return (
                <div
                  key={item._key}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                    if (i === 0 && firstCardRef) firstCardRef.current = el;
                  }}
                  className={`relative shrink-0 snap-center ${isDesktop ? "" : "will-change-transform"}`}
                  style={
                    isDesktop
                      ? phonesBox
                      : {
                          // Screens on the page: the row's ratio at the phone's
                          // 8 px gaps (PhonesRow); a background makes it a 16:10 panel.
                          width: phonesFrame.background
                            ? phoneCardWidth(16 / 10)
                            : phoneCardWidth(screens * PHONE_ASPECT, (screens - 1) * 8),
                          marginLeft: i === 0 ? 0 : -OVERLAP,
                          transition:
                            reduceMotion || scrolling || entering ? "none" : `transform ${SETTLE_MS}ms ${EASE_OUT_CSS}, opacity ${SETTLE_MS}ms ${EASE_OUT_CSS}`,
                        }
                  }
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${gallery.length}`}
                >
                  <PhonesRow
                    slots={item.phones ?? []}
                    frame={phonesFrame}
                    title={project.title ?? "Project"}
                    // A test plays only while centred, from its first frame.
                    active={item.testName ? i === index : Math.abs(i - index) <= 1}
                    sizes="50vw"
                    once={Boolean(item.testName)}
                    replay={replay}
                    onEndedChange={(ended) => setEndedKey((k) => (ended ? item._key : k === item._key ? null : k))}
                  />
                </div>
              );
            }
            const isImage = item._type === "galleryImage";
            // Video budget: the centred card and two either side mount their
            // <video> (paused on the first frame, only the centred one plays),
            // so a quick swipe meets clips that are already loading.
            const near = Math.abs(i - index) <= 2;
            // The card's shape from Sanity (exact before anything loads),
            // else from the clip once it reports, else the stage default.
            const aspect =
              (isImage ? imageAspect(item.image) : (storedVideoAspect(item) ?? videoAspects[item._key])) ??
              LANDING_ASPECT.stage;
            // The clip's first frame as a still: what the card shows before
            // its video mounts or has a frame, so no swipe meets a black card.
            const poster =
              !isImage && item.poster?.asset ? imageUrl(item.poster, isDesktop ? 1600 : 900) : undefined;
            // Card 1 is the landing media (the clone lands on it): a laptop-shaped
            // box, the clone landing on the media inside its background.
            const frame =
              i === 0
                ? resolveLandingFrame(item.frame, project)
                : resolveFrame(item.frame, project, aspect < 1 ? "portrait" : "landscape");
            const framed = frame && frame.fit !== "flush" ? frame : null;
            // The card's own ratio: a phone frame is a 4:5 box (MediaFrame).
            const boxAspect = framed?.fit === "phone" ? 4 / 5 : aspect;
            const media = (
              <>
                {isImage && item.image?.asset && (
                  <Image
                    src={imageUrl(item.image, isDesktop ? 1600 : 900)}
                    alt={`${project.title} — ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes={LANDING_SIZES.stage}
                    priority={i === 0}
                    onLoad={i === 0 ? onFirstReady : undefined}
                  />
                )}
                {!isImage && i === 0 && adopted && <div ref={adoptHostRef} className="absolute inset-0" />}
                {poster && !(i === 0 && adopted) && (
                  <Image src={poster} unoptimized alt="" fill className="object-cover" sizes={LANDING_SIZES.stage} />
                )}
                {!isImage && item.video?.asset?._ref && near && !(i === 0 && adopted) && (
                  <video
                    ref={(el) => {
                      if (i === 0) firstVideoRef.current = el;
                      // The still under the clip stays until the clip has
                      // presented a frame of its own (see revealOnFirstFrame).
                      const stop = poster ? revealOnFirstFrame(el) : undefined;
                      return () => {
                        stop?.();
                        if (i === 0 && firstVideoRef.current === el) firstVideoRef.current = null;
                      };
                    }}
                    src={fileUrl(item.video.asset._ref)}
                    className="relative h-full w-full object-cover"
                    aria-label={`${project.title} — ${i + 1}`}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    autoPlay={i === 0}
                    onLoadedMetadata={(e) => setVideoAspect(item._key, videoAspect(e.currentTarget))}
                  />
                )}
              </>
            );
            return (
              <div
                key={item._key}
                ref={(el) => {
                  itemRefs.current[i] = el;
                  if (i === 0 && firstCardRef && !framed) firstCardRef.current = el;
                }}
                // The depth transforms run per frame on the phone only; the
                // laptop strip is flat, so no card needs its own layer there.
                className={`relative shrink-0 snap-center overflow-hidden ${isDesktop ? "" : "will-change-transform"} ${framed ? "" : "bg-black"}`}
                style={{
                  ...(isDesktop
                    ? deskBox(boxAspect, i)
                    : {
                        width: phoneCardWidth(boxAspect),
                        aspectRatio: framed ? undefined : aspect,
                        marginLeft: i === 0 ? 0 : -OVERLAP,
                      }),
                  ...(frame && !framed && frame.background?.colour ? { backgroundColor: frame.background.colour } : null),
                  boxShadow: i === index && !flat ? "0 8px 24px rgba(0,0,0,0.18)" : "none",
                  transition:
                    reduceMotion || scrolling || entering
                      ? "none"
                      : `transform ${SETTLE_MS}ms ${EASE_OUT_CSS}, opacity ${SETTLE_MS}ms ${EASE_OUT_CSS}, box-shadow ${SETTLE_MS}ms`,
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${gallery.length}`}
              >
                {framed ? (
                  <MediaFrame
                    frame={framed}
                    mediaAspect={aspect}
                    boxClassName="bg-black"
                    sizes={LANDING_SIZES.stage}
                    mediaRef={
                      i === 0 && firstCardRef
                        ? (el: HTMLDivElement | null) => {
                            firstCardRef.current = el;
                          }
                        : undefined
                    }
                  >
                    {media}
                  </MediaFrame>
                ) : (
                  media
                )}
              </div>
            );
          })}
          {hasPreview && nextProject && (
            <div
              ref={(el) => {
                itemRefs.current[gallery.length] = el;
              }}
              className="relative shrink-0 snap-center will-change-transform"
              style={isDesktop ? deskBox(LANDING_ASPECT[landingKind(nextProject.hasChapters)], gallery.length) : { width: ITEM_W, marginLeft: -OVERLAP }}
              role="group"
              aria-roledescription="slide"
              aria-label="Next project"
            >
              <NextProjectPreview
                nextProject={nextProject}
                previewRef={previewRef}
                onNavigate={onNavigateNext!}
                imageWidth={isDesktop ? 1600 : 900}
                sizes={LANDING_SIZES[landingKind(nextProject.hasChapters)]}
                aspect={LANDING_ASPECT[landingKind(nextProject.hasChapters)]}
              />
            </div>
          )}
        </div>
      </div>

      {/* Position for screen readers; the progress line is decorative */}
      <p className="sr-only" aria-live="polite">
        {single ? "" : `${index + 1} of ${gallery.length}`}
      </p>

      {/* Progress: a filmstrip at the bottom centre (Ali, 11-04). */}
      <GalleryProgress
        gallery={gallery}
        index={index}
        onEnd={onEnd}
        atPreview={atPreview && hasPreview}
        nextProject={nextProject}
        title={project.title ?? "Project"}
        isDesktop={isDesktop}
        reduceMotion={reduceMotion}
        onSelect={(i) => {
          posRef.current = i;
          goTo(i);
        }}
        onNavigateNext={nextSlug ? onNavigateNext : undefined}
        onOpenIndex={allProjects.length > 1 ? () => {
          setDetailsOpen(false);
          setSwitcherOpen(true);
        } : undefined}
        indexOpen={switcherOpen}
      />

      <ProjectDetailsOverlay project={project} open={detailsOpen} onClose={closeDetails} reduceMotion={reduceMotion} />
      {allProjects.length > 1 && (
        <ProjectSwitcher
          projects={allProjects}
          currentSlug={project.slug?.current}
          open={switcherOpen}
          onClose={closeSwitcher}
          onPick={(slug, media) => {
            if (onNavigateTo) onNavigateTo(slug, media);
          }}
          isDesktop={isDesktop}
          reduceMotion={reduceMotion}
        />
      )}
    </div>
  );
}
