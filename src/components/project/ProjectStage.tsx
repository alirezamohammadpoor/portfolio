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
import GalleryPhones from "@/components/project/GalleryPhones";
import { PHONE_ASPECT } from "@/components/PhonesRow";
import MediaFrame from "@/components/MediaFrame";
import { resolveFrame, resolveLandingFrame } from "@/lib/mediaFrame";
import { LANDING_ASPECT, imageAspect, landingKind, videoAspect } from "@/lib/landing";
import ProjectDetailsOverlay from "@/components/project/ProjectDetailsOverlay";
import GalleryProgress from "@/components/project/GalleryProgress";

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
}

// Motion spec (phase 2). Reference: Swiper coverflow demo at 390 px —
// 300 px snap settles in ~290 ms, next card peeks 22 px. Ours: card is the
// full 4-column width, neighbours overlap 44 px behind it at 0.92 scale.
const OVERLAP = 44;
const NEIGHBOUR_SCALE = 0.92;
const NEIGHBOUR_OPACITY = 0.6;
const SETTLE_MS = 200;
const ITEM_W = "calc(100vw - 2 * var(--grid-margin))";
// Laptop: one height for every card (Figma "Gallery · laptop alternatives",
// 11-04: 640 at 1440×900), the width follows each card's ratio.
const DESK_H = "min(760px, calc(100svh - var(--header-height) - 200px))";
const DESK_GAP = 48;
// Card height cap on laptop (Ali 11-04: raised from 640 so big screens keep 8 columns).
const DESK_MAX_H = 760;
// Vertical wheel → one card. Trackpad flings keep firing for a second, so
// after a step the wheel stays locked until it has been quiet for a moment.
const WHEEL_STEP = 40;
const WHEEL_LOCK_MS = 450;
const WHEEL_QUIET_MS = 140;
// Hold on the next project's cover before it opens.
const AUTO_NEXT_MS = 1500;

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

export default function ProjectStage({
  project,
  hidden = false,
  firstCardRef,
  onFirstReady,
  previewRef,
  onNavigateNext,
  isDesktop = false,
}: ProjectStageProps) {
  const gallery = project.gallery ?? [];
  const nextProject = project.nextProject;
  const hasPreview = Boolean(nextProject?.firstMedia && nextProject?.slug?.current && onNavigateNext);
  const stripRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const firstVideoRef = useRef<HTMLVideoElement | null>(null);
  // Project → project: card 1 takes the live <video> the clone carries when
  // it is the same file (see ProjectGallery / adoptVideo.ts).
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
  // The next project's cover is the centred card.
  const [onPreview, setOnPreview] = useState(false);
  // One hand-off per page: the wheel and the hold must not both start it.
  const leavingRef = useRef(false);
  // The hold only counts once the visitor has moved the strip themselves:
  // browser back keeps this page mounted (Activity, effects re-run) still
  // sitting on the cover, and must not bounce straight forward again.
  const armedRef = useRef(false);
  useEffect(() => {
    leavingRef.current = false;
    armedRef.current = false;
    const arm = () => {
      armedRef.current = true;
    };
    const root = rootRef.current;
    window.addEventListener("wheel", arm, { passive: true });
    window.addEventListener("keydown", arm);
    root?.addEventListener("pointerdown", arm);
    root?.addEventListener("touchstart", arm, { passive: true });
    return () => {
      window.removeEventListener("wheel", arm);
      window.removeEventListener("keydown", arm);
      root?.removeEventListener("pointerdown", arm);
      root?.removeEventListener("touchstart", arm);
    };
  }, []);
  // Video ratios as they report metadata (by item key); images carry theirs.
  // An adopted element already knows its size, and so does the home cover the
  // clone came from when it is the same file: card 1 takes its real ratio on
  // the first render, so the clone is aimed at the box it will keep (otherwise
  // a clip that is not 16:10 resized under the landed clone on metadata).
  const [videoAspects, setVideoAspects] = useState<Record<string, number>>(() => {
    const first = gallery[0];
    const src = first?._type === "galleryVideo" && first.video?.asset?._ref ? fileUrl(first.video.asset._ref) : undefined;
    const sized = adopted ?? (isTransitioning ? adoptableVideo(sourceVideoElement, true, src) : null);
    const known = sized && first?._type === "galleryVideo" ? videoAspect(sized) : null;
    return known && first?._key ? { [first._key]: known } : {};
  });
  const setVideoAspect = (key: string | undefined, aspect: number | null) => {
    if (!key || !aspect) return;
    setVideoAspects((prev) => (prev[key] === aspect ? prev : { ...prev, [key]: aspect }));
  };
  const [reduceMotion, setReduceMotion] = useState(false);
  // Laptop grid, re-measured on resize.
  // Measured in the initialiser too: the home → project clone measures card 1
  // in the page's own layout effect, which runs before a re-render from this
  // component's effects would land, so the first render must already be snapped.
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
  useGSAP(
    () => {
      const root = rootRef.current;
      if (hidden || !root) return;
      const pill = root.querySelectorAll("[data-stage-chrome='pill']");
      const film = root.querySelectorAll("[data-stage-chrome='film']");
      const cards = itemRefs.current.slice(1).filter((el): el is HTMLDivElement => Boolean(el));
      const rise = reduceMotion ? 0 : 40;
      const tl = gsap.timeline({ defaults: { duration: dur.text, ease: ease.out }, onComplete: () => setEntering(false) });
      if (pill.length) tl.fromTo(pill, { yPercent: rise, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1 }, 0);
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
      if (film.length) tl.fromTo(film, { yPercent: rise, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1 }, 2 * stagger);
    },
    { scope: rootRef, dependencies: [hidden] },
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsOpenRef = useRef(false);
  useLayoutEffect(() => {
    detailsOpenRef.current = detailsOpen;
  }, [detailsOpen]);
  const closeDetails = useCallback(() => setDetailsOpen(false), []);
  // While the finger is down the cards track scroll 1:1 (no CSS transition
  // fighting the per-frame transform); the 200 ms settle applies once idle.
  const [scrolling, setScrolling] = useState(false);
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
      setOnPreview(bestAll.i > last);
      setIndex((prev) => (prev === best.i ? prev : best.i));
    };
    let idle = 0;
    const settle = () => {
      measure();
      setScrolling(false);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
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
    };
  }, [gallery.length, reduceMotion, last, isDesktop]);

  // Laptop: the strip's side padding centres the first and the last card
  // (their widths follow their media, which may report its size late).
  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!isDesktop || !strip) return;
    const apply = () => {
      const kids = itemRefs.current.filter((el): el is HTMLDivElement => Boolean(el));
      const first = kids[0];
      const lastEl = kids[kids.length - 1];
      if (!first || !lastEl) return;
      strip.style.paddingLeft = `${Math.max(0, (strip.clientWidth - first.offsetWidth) / 2)}px`;
      strip.style.paddingRight = `${Math.max(0, (strip.clientWidth - lastEl.offsetWidth) / 2)}px`;
      const current = itemRefs.current[posRef.current];
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
  const goTo = (i: number, instant = false) => {
    const strip = stripRef.current;
    const el = itemRefs.current[i];
    if (!strip || !el) return;
    const left = el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2;
    if (reduceMotion || instant) {
      gsap.killTweensOf(strip);
      strip.scrollTo({ left, behavior: "auto" });
      return;
    }
    // The glide on the site's out curve (the browser's own smooth scroll has
    // its own timing and stutters against snap). Snap is off while it runs,
    // and a new step retargets from wherever the strip is.
    strip.style.scrollSnapType = "none";
    gsap.to(strip, {
      scrollLeft: left,
      duration: 0.6,
      ease: ease.out,
      overwrite: true,
      onComplete: () => {
        strip.style.scrollSnapType = "";
      },
    });
  };
  // One card forward or back; past the end (the preview, or the last card
  // when there is none) the next project takes over.
  const stepRef = useRef<(dir: 1 | -1, instant?: boolean) => void>(() => {});
  const step = (dir: 1 | -1, instant = false) => {
    const maxPos = hasPreview ? gallery.length : last;
    const target = posRef.current + dir;
    if (target > maxPos) {
      if (dir > 0 && onNavigateNext && nextSlug && !leavingRef.current) {
        leavingRef.current = true;
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

  // Laptop: vertical wheel and arrow keys step the strip (a horizontal
  // trackpad swipe scrolls it natively, snapping on its own).
  useEffect(() => {
    if (!isDesktop) return;
    let acc = 0;
    let lockedUntil = 0;
    // A sideways trackpad swipe scrolls the strip natively, which simply
    // stops at the end. A fresh swipe that starts with the strip already at
    // its end (not the tail of the one that got it there) hands off instead.
    let lastWheel = 0;
    let sideAtEnd = false;
    let sideAcc = 0;
    const onWheel = (e: WheelEvent) => {
      if (detailsOpenRef.current) return;
      const now = performance.now();
      const fresh = now - lastWheel > WHEEL_QUIET_MS;
      lastWheel = now;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const strip = stripRef.current;
        if (fresh) {
          sideAcc = 0;
          sideAtEnd = Boolean(strip && strip.scrollLeft >= strip.scrollWidth - strip.clientWidth - 2);
        }
        if (!sideAtEnd || now < lockedUntil) return;
        sideAcc += e.deltaX;
        if (sideAcc < WHEEL_STEP) return;
        sideAcc = 0;
        sideAtEnd = false;
        lockedUntil = now + WHEEL_LOCK_MS;
        stepRef.current(1);
        return;
      }
      if (now < lockedUntil) {
        lockedUntil = Math.max(lockedUntil, now + WHEEL_QUIET_MS);
        return;
      }
      acc += e.deltaY;
      if (Math.abs(acc) < WHEEL_STEP) return;
      const dir = acc > 0 ? 1 : -1;
      acc = 0;
      lockedUntil = now + WHEEL_LOCK_MS;
      stepRef.current(dir);
    };
    const onKey = (e: KeyboardEvent) => {
      if (detailsOpenRef.current || e.defaultPrevented) return;
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
  // movement, waits for the strip to settle, and stops while the text is open.
  useEffect(() => {
    if (!onPreview || scrolling || detailsOpen || hidden || !onNavigateNext || !armedRef.current) return;
    const t = window.setTimeout(() => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      onNavigateNext();
    }, AUTO_NEXT_MS);
    return () => window.clearTimeout(t);
  }, [onPreview, scrolling, detailsOpen, hidden, onNavigateNext]);

  // A video first card reports ready on its first presented frame (see
  // ProjectGallery): the clone covering it must not leave on a black frame.
  useEffect(() => {
    if (!onFirstReady) return;
    if (adopted) {
      onFirstReady();
      return;
    }
    const first = firstVideoRef.current;
    if (!first) return;
    return onFirstVideoFrame(first, onFirstReady);
  }, [onFirstReady, adopted]);

  // The details overlay covers the strip with a 40 px backdrop blur: a clip
  // playing under it repaints that blur every frame, so it pauses while the
  // text is open and picks up again on close.
  useEffect(() => {
    const v = itemRefs.current[index]?.querySelector("video");
    if (!v) return;
    if (detailsOpen) v.pause();
    else {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  }, [detailsOpen, index]);

  // Video budget: only the centred card plays; neighbours sit paused on their
  // first frame; everything else is unmounted (see `near` below).
  useEffect(() => {
    itemRefs.current.forEach((el, i) => {
      const v = el?.querySelector("video");
      if (!v) return;
      if (i === index) {
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } else {
        v.pause();
      }
    });
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
    const width = snapWidth(grid.h * screens * PHONE_ASPECT + gaps);
    return { width, height: (width - gaps) / (screens * PHONE_ASPECT), marginLeft: i === 0 ? 0 : DESK_GAP };
  };

  return (
    <div
      ref={rootRef}
      className={`fixed inset-x-0 bottom-0 top-[var(--header-height)] flex flex-col overflow-hidden bg-bg${hidden ? " opacity-0 pointer-events-none" : ""}`}
    >
      {/* The name pill: the page's title and the one way into the text.
          Fixed height, so card 1 sits on the same y on every project (the
          project → project clone lands on the previous page's y). */}
      <h1 className="sr-only">{project.title}</h1>
      <div className="relative z-50 flex h-14 shrink-0 items-start justify-center pt-2">
        <button
          type="button"
          data-stage-chrome="pill"
          aria-expanded={detailsOpen}
          aria-controls="project-details"
          onClick={() => setDetailsOpen((o) => !o)}
          className="frost-soft invisible inline-flex h-9 max-w-[calc(100vw-2*var(--grid-margin))] items-center gap-2 rounded-full px-4 text-body text-primary transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] select-none active:scale-[0.97]"
        >
          <span className="truncate">{project.title}</span>
          <span
            aria-hidden="true"
            className="shrink-0 text-[0.5rem]"
            style={{ transform: detailsOpen ? "rotate(180deg)" : "none", transition: reduceMotion ? "none" : `transform 200ms ${EASE_OUT_CSS}` }}
          >
            ▼
          </span>
        </button>
      </div>

      {/* Strip, vertically centred in the remaining space */}
      <div className="flex flex-1 items-center pb-[52px] desktop:pb-[72px]">
        <div
          ref={stripRef}
          className={`flex w-full ${isDesktop ? "items-center" : "items-start"} overflow-x-auto py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${single ? "justify-center" : "snap-x snap-mandatory"}`}
          style={isDesktop ? undefined : { scrollPaddingInline: "var(--grid-margin)", paddingInline: "var(--grid-margin)" }}
          data-lenis-prevent
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
                  }}
                  className="relative shrink-0 snap-center will-change-transform"
                  style={
                    isDesktop
                      ? phonesBox
                      : {
                          width: ITEM_W,
                          marginLeft: i === 0 ? 0 : -OVERLAP,
                          transition:
                            reduceMotion || scrolling || entering ? "none" : `transform ${SETTLE_MS}ms ${EASE_OUT_CSS}, opacity ${SETTLE_MS}ms ${EASE_OUT_CSS}`,
                        }
                  }
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${gallery.length}`}
                >
                  <GalleryPhones
                    item={item}
                    frame={phonesFrame}
                    title={project.title ?? "Project"}
                    active={Math.abs(i - index) <= 1}
                    sizes="50vw"
                  />
                </div>
              );
            }
            const isImage = item._type === "galleryImage";
            const near = Math.abs(i - index) <= 1;
            const aspect =
              (isImage ? imageAspect(item.image) : videoAspects[item._key]) ?? LANDING_ASPECT.stage;
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
                    sizes={isDesktop ? "70vw" : "100vw"}
                    priority={i === 0}
                    onLoad={i === 0 ? onFirstReady : undefined}
                  />
                )}
                {!isImage && i === 0 && adopted && <div ref={adoptHostRef} className="absolute inset-0" />}
                {!isImage && item.video?.asset?._ref && near && !(i === 0 && adopted) && (
                  <video
                    ref={i === 0 ? firstVideoRef : undefined}
                    src={fileUrl(item.video.asset._ref)}
                    className="h-full w-full object-cover"
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
                className={`relative shrink-0 snap-center overflow-hidden will-change-transform ${framed ? "" : "bg-black"}`}
                style={{
                  ...(isDesktop
                    ? deskBox(boxAspect, i)
                    : {
                        width: ITEM_W,
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
                    sizes={isDesktop ? "70vw" : "100vw"}
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
              style={isDesktop ? deskBox(LANDING_ASPECT[landingKind(nextProject.hasChapters, true)], gallery.length) : { width: ITEM_W, marginLeft: -OVERLAP }}
              role="group"
              aria-roledescription="slide"
              aria-label="Next project"
            >
              <NextProjectPreview
                nextProject={nextProject}
                previewRef={previewRef}
                onNavigate={onNavigateNext!}
                imageWidth={isDesktop ? 1600 : 900}
                sizes={isDesktop ? "70vw" : "100vw"}
                aspect={LANDING_ASPECT[landingKind(nextProject.hasChapters, isDesktop)]}
                labelHidden={isDesktop}
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
        nextProject={nextProject}
        title={project.title ?? "Project"}
        isDesktop={isDesktop}
        reduceMotion={reduceMotion}
        onSelect={(i) => {
          posRef.current = i;
          goTo(i);
        }}
        onNavigateNext={nextSlug ? onNavigateNext : undefined}
      />

      <ProjectDetailsOverlay project={project} open={detailsOpen} onClose={closeDetails} reduceMotion={reduceMotion} />
    </div>
  );
}
