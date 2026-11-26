"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { getImageProps } from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import { ease } from "@/lib/motion";
import { onFirstVideoFrame } from "@/lib/firstFrame";
import { DESKTOP_QUERY } from "@/hooks/useIsDesktop";
import { setIntroState } from "@/lib/intro";
import {
  SCATTER_BEAT,
  getReelState,
  reelCountOverride,
  reelScrubMode,
  setReelState,
  skipReel,
  useReelState,
} from "@/lib/reel";

type Project = PROJECTS_QUERY_RESULT[number];

/** Longest wait for the first cover's frame before the entry starts anyway. */
const READY_TIMEOUT = 1200;
/** Wheel silence before the page may scroll again after a wheel skipped the reel. */
const WHEEL_SILENCE_MS = 150;

interface HomeReelProps {
  projects: PROJECTS_QUERY_RESULT;
  /** The home canvas: its `[data-cover]` boxes are where the heroes land. */
  pageRef: RefObject<HTMLElement | null>;
  /** How the ring ends. "dive" (the home): the view dives into the first
   *  project while the rest drift off. "settle" (a row of covers, lab
   *  carousel): every project flies from the ring into its own slot. */
  landing?: "dive" | "settle";
  /** Each cover's `sizes` on the page, so a hero image shares its file. */
  coverSizes: string[];
  /** Lab only: builds the whole entry instead of the ring (/lab/home-intro). */
  build?: IntroBuilder;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Fills the paused timeline: every hero starts placed on its cover's box
 *  (left/top/width/height) and must end there with no transform left. */
export type IntroBuilder = (
  tl: gsap.core.Timeline,
  heroes: HTMLElement[],
  world: HTMLElement,
  rects: Rect[],
) => void;

/**
 * Home entry: every project's cover flies out of the middle onto an oval,
 * the oval turns, and the view dives into the first project (see
 * ringTimeline). The last frame is the page itself, so the stage just fades.
 *
 * The stage is a fixed layer outside <main> (which is hidden until the entry
 * lands), under the bar, and only moves transforms: nothing on the page lays out twice. Each
 * hero is a box the size of its cover on the page, so the landing is pixel
 * exact.
 */
export default function HomeReel({
  projects,
  pageRef,
  coverSizes,
  landing = "dive",
  build,
}: HomeReelProps) {
  const reel = useReelState();
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const [scrub, setScrub] = useState<gsap.core.Timeline | null>(null);
  const showStage = reel === "waiting" || reel === "playing";
  // Lenis stands still under the reel: a wheel only skips it, it doesn't
  // also scroll the page away from the top the reel lands on.
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  useGSAP(
    () => {
      const stage = stageRef.current;
      const world = worldRef.current;
      const page = pageRef.current;
      if (!stage || !world || !page || getReelState() !== "waiting") return;
      const heroes = gsap.utils.toArray<HTMLElement>("[data-hero]", stage);
      const covers = gsap.utils.toArray<HTMLElement>("[data-cover]", page);
      if (!heroes.length || (heroes.length !== covers.length && !reelCountOverride())) {
        setReelState("off");
        return;
      }
      const scrubbing = reelScrubMode();
      let cancelled = false;
      let tl: gsap.core.Timeline | null = null;
      const offs: (() => void)[] = [];

      let finishing = false;
      // The last wheel event's time: a trackpad flick keeps sending its
      // inertia tail for up to a second after the skip. The reel's end
      // re-renders the stage away (this effect's cleanup runs) while that
      // tail is still coming, so the listener outlives the effect when Lenis
      // is waiting on it and wake() removes it instead.
      let lastWheelAt = -Infinity;
      let waking = false;
      const wheelOpts = { passive: true, capture: true } as const;
      const onWheelAt = () => {
        lastWheelAt = performance.now();
      };
      window.addEventListener("wheel", onWheelAt, wheelOpts);
      offs.push(() => {
        if (!waking) window.removeEventListener("wheel", onWheelAt, wheelOpts);
      });
      function finish() {
        if (getReelState() !== "playing" || finishing) return;
        finishing = true;
        // The page is shown under the stage, then the stage fades: the
        // covers are in the same boxes, only at another moment of their
        // clips (seeking the page's videos to match stalls for up to a
        // second on sparse keyframes), so a short crossfade bridges them.
        setIntroState("done");
        // Lenis wakes after the fade, and only once the wheel that skipped
        // the reel has run dry: started under the flick's inertia tail it
        // would scroll the page off the top the reel lands on.
        const wake = () => {
          if (performance.now() - lastWheelAt < WHEEL_SILENCE_MS) {
            window.setTimeout(wake, WHEEL_SILENCE_MS);
            return;
          }
          window.removeEventListener("wheel", onWheelAt, wheelOpts);
          lenisRef.current?.start();
        };
        const done = () => {
          waking = true;
          setReelState("done");
          ScrollTrigger.refresh();
          wake();
        };
        if (cancelled || !stage) return done();
        gsap.to(stage, {
          autoAlpha: 0,
          duration: SCATTER_BEAT.handOver,
          ease: ease.out,
          onComplete: done,
        });
      }

      function onInput() {
        if (getReelState() === "waiting") {
          // Input before the first frame: no reel, the page shows at once.
          cancelled = true;
          setReelState("off");
          return;
        }
        skipReel();
        tl?.progress(1);
        finish();
      }
      if (!scrubbing) {
        const opts = { passive: true, capture: true } as const;
        for (const type of ["wheel", "touchstart", "keydown", "pointerdown"] as const) {
          window.addEventListener(type, onInput, opts);
          offs.push(() => window.removeEventListener(type, onInput, opts));
        }
        // The cover rects are measured once; a width change re-flows the rows
        // under the heroes, so it ends the reel like an input. Height-only
        // changes (a phone's URL bar) leave the covers where they are.
        const width0 = window.innerWidth;
        const onResize = () => {
          if (window.innerWidth !== width0) onInput();
        };
        window.addEventListener("resize", onResize);
        offs.push(() => window.removeEventListener("resize", onResize));
      }

      const first = heroes[0].querySelector<HTMLVideoElement | HTMLImageElement>("video, img");
      const firstFrame = new Promise<void>((resolve) => {
        if (!first) return resolve();
        if (first instanceof HTMLVideoElement) {
          offs.push(onFirstVideoFrame(first, resolve));
          return;
        }
        first.decode().then(resolve, resolve);
      });
      const ready = Promise.all([document.fonts.ready, firstFrame]).then(() => true);
      const timeout = new Promise<boolean>((resolve) => {
        const id = window.setTimeout(() => resolve(false), scrubbing ? 8000 : READY_TIMEOUT);
        offs.push(() => window.clearTimeout(id));
      });

      // A slow first cover doesn't cancel the entry (Ali 11-05: no scatter on
      // the phone, where the first frame took longer than the wait): the
      // covers keep loading behind their placeholder colour.
      Promise.race([ready, timeout]).then(() => {
        if (cancelled) return;
        window.scrollTo(0, 0);
        const coverRects = covers.map((cover) => {
          const r = cover.getBoundingClientRect();
          return { x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height };
        });
        // `&n`: the extra heroes borrow the boxes of the covers they repeat.
        const rects = heroes.map((_, i) => coverRects[i % coverRects.length]);
        tl = gsap.timeline({ paused: true, onComplete: scrubbing ? undefined : finish });
        if (build) build(tl, heroes, world, rects);
        else ringTimeline(tl, heroes, world, rects, landing);

        lenisRef.current?.stop();
        setIntroState("playing");
        setReelState("playing");
        if (!scrubbing) tl.play();
        if (scrubbing) setScrub(tl);
      });

      return () => {
        cancelled = true;
        offs.forEach((off) => off());
        tl?.kill();
        // A real unmount mid-reel (not the dev double run, which happens
        // while the reel is still waiting) hands the page over at once.
        finish();
      };
    },
    // revertOnUpdate: the cleanup also runs when the reel ends (showStage
    // flips), so the window listeners and the timeline go with the stage
    // instead of living on for the whole home visit.
    { scope: stageRef, dependencies: [showStage], revertOnUpdate: true },
  );

  if (!showStage || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div ref={stageRef} aria-hidden="true" className="fixed inset-0 z-[45] overflow-hidden bg-bg">
        <div ref={worldRef} className="invisible absolute left-0 top-0 will-change-transform">
          {stageProjects(projects).map((project, i) => (
            <div
              key={`${project._id}-${i}`}
              data-hero
              className="absolute left-0 top-0 overflow-hidden bg-tertiary will-change-transform"
            >
              <HeroMedia
                project={project}
                sizes={coverSizes[i % projects.length] ?? "(min-width: 75rem) 66vw, 100vw"}
              />
            </div>
          ))}
        </div>
      </div>
      {scrub && <Scrubber tl={scrub} />}
    </>,
    document.body,
  );
}

/** The stage's projects: the home's, repeated up to `&n` when tuning. */
function stageProjects(projects: PROJECTS_QUERY_RESULT) {
  const n = reelCountOverride();
  if (!n || !projects.length) return projects;
  return Array.from({ length: n }, (_, i) => projects[i % projects.length]);
}

/**
 * An oval through the middle of a w × h box: equal arc-length steps around
 * it, so the covers are evenly spaced on screen (equal angles bunch them at
 * the ends of the long axis). `at(u)` gives the point at fraction u of the
 * way round, clockwise from 12 o'clock.
 */
export function ovalPath(a: number, b: number) {
  const STEPS = 720;
  const ts: number[] = [];
  const lens: number[] = [0];
  for (let k = 0; k <= STEPS; k++) ts.push(-Math.PI / 2 + (k / STEPS) * Math.PI * 2);
  for (let k = 1; k <= STEPS; k++) {
    const dx = a * (Math.cos(ts[k]) - Math.cos(ts[k - 1]));
    const dy = b * (Math.sin(ts[k]) - Math.sin(ts[k - 1]));
    lens.push(lens[k - 1] + Math.hypot(dx, dy));
  }
  const total = lens[STEPS];
  return (u: number) => {
    const target = (((u % 1) + 1) % 1) * total;
    let lo = 0;
    let hi = STEPS;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lens[mid] < target) lo = mid;
      else hi = mid;
    }
    const f = (target - lens[lo]) / (lens[hi] - lens[lo] || 1);
    const t = ts[lo] + (ts[hi] - ts[lo]) * f;
    return { x: a * Math.cos(t), y: b * Math.sin(t) };
  };
}

/**
 * The ring (Ali 11-16): every cover the same size, evenly spaced on
 * an oval fitted to the field, so any number of projects fits without
 * overlap (the six hand-placed spots it replaced overlapped past six
 * projects); the cards shrink as the count grows. The middle stays open.
 * While the field holds the oval turns, cards upright, carrying
 * the first project up to 12 o'clock, and the view dives into it from there.
 */
function ringTimeline(
  tl: gsap.core.Timeline,
  heroes: HTMLElement[],
  world: HTMLElement,
  rects: Rect[],
  landing: "dive" | "settle" = "dive",
) {
  const settleAll = landing === "settle";
  // Settle (Ali 11-26: "fall into place", subtle): instead of the oval the
  // cards fly out into a loose row of small cards above the real row, in
  // project order, then each drops a short way into its slot, 1, 2, 3. Both
  // rows run in the same order, so no path crosses another.
  const VW = window.innerWidth;
  const VH = window.innerHeight;
  const laptop = window.matchMedia(DESKTOP_QUERY).matches;
  const N = heroes.length;
  const top = 72;
  const margin = laptop ? 24 : 16;
  const gap = laptop ? 20 : 12;
  const fw = VW - margin * 2;
  const fh = VH - top - margin;
  const ox = VW / 2;
  const oy = top + fh / 2;
  // Every cover is 16:10 on the page; the card keeps its own cover's shape.
  const aspect = rects[0].h / rects[0].w;
  // The middle stays open: on the laptop the card is at most a quarter of
  // the field, on the phone just under half of it.
  const maxW = laptop ? fw * 0.24 : fw * 0.46;

  // The largest card for which N of them, evenly spaced, clear each other
  // by `gap` at every turn of the oval.
  function layout(cw: number) {
    const ch = cw * aspect;
    const a = Math.max(fw / 2 - cw / 2, cw);
    const b = Math.max(fh / 2 - ch / 2, ch);
    return { cw, ch, at: ovalPath(a, b) };
  }
  function clears(cw: number) {
    const { ch, at } = layout(cw);
    for (const shift of [0, 0.25, 0.5, 0.75]) {
      const pts = Array.from({ length: N }, (_, i) => at((i + shift) / N));
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          if (Math.abs(pts[i].x - pts[j].x) < cw + gap && Math.abs(pts[i].y - pts[j].y) < ch + gap)
            return false;
        }
      }
    }
    return true;
  }
  let lo = 8;
  let hi = maxW;
  if (clears(hi)) lo = hi;
  else
    for (let k = 0; k < 24; k++) {
      const mid = (lo + hi) / 2;
      if (clears(mid)) lo = mid;
      else hi = mid;
    }
  const { cw, at } = layout(lo);

  // The turn: the oval starts a little short of home and ends with the first
  // project at 12 o'clock. About two thirds of a step, at least ~25°.
  const turn = Math.max(0.66 / N, 0.07);
  // Settle turns the other way (anticlockwise), so the cards reach the
  // release point in project order: 1, 2, 3...
  const ring = { u: settleAll ? turn : -turn };
  const fly = heroes.map(() => ({ p: 0 }));
  const dive = { p: 0 };
  const settle = heroes.map(() => ({ p: 0 }));
  // The hover row: N small cards across the field, centred in the band
  // between the Pebble and the top of the real row.
  const rowTop = Math.min(...rects.map((r) => r.y));
  const hoverGap = 16;
  const hoverW = Math.min(cw, (fw - hoverGap * (N - 1)) / N);
  const hoverY = (top + rowTop) / 2;
  const hoverX0 = VW / 2 - (N * hoverW + (N - 1) * hoverGap) / 2 + hoverW / 2;
  const hover = heroes.map((_, i) => ({ x: hoverX0 + i * (hoverW + hoverGap), y: hoverY }));
  const easeIn = gsap.parseEase("power2.in");
  const easeInOut = gsap.parseEase(ease.inOut);

  const base = heroes.map((_, i) => {
    const { x, y, w, h } = rects[i];
    return { cx0: x + w / 2, cy0: y + h / 2, scale: cw / w };
  });
  // Where the first cover sits when the dive starts: 12 o'clock.
  const home = at(0);
  const firstCx = ox + home.x;
  const firstCy = oy + home.y;
  const first = rects[0];
  const K = 1 / base[0].scale;
  const dx = first.x + first.w / 2 - K * firstCx;
  const dy = first.y + first.h / 2 - K * firstCy;
  const push = (0.5 * Math.max(VW, VH)) / K;

  heroes.forEach((hero, i) => {
    const { x, y, w, h } = rects[i];
    gsap.set(hero, { left: x, top: y, width: w, height: h, transformOrigin: "50% 50%" });
  });
  gsap.set(world, { transformOrigin: "0 0", x: 0, y: 0, scale: 1, autoAlpha: 1 });

  // One render from the shared state, so the fly-out, the turn and the dive
  // compose on the same transforms in any order the scrubber seeks.
  function render() {
    heroes.forEach((hero, i) => {
      const { cx0, cy0, scale } = base[i];
      const spot = at(i / N + ring.u);
      let cx = settleAll ? hover[i].x : ox + spot.x;
      let cy = settleAll ? hover[i].y : oy + spot.y;
      const p = fly[i].p;
      // Out of the middle of the screen.
      cx = VW / 2 + (cx - VW / 2) * p;
      cy = VH / 2 + (cy - VH / 2) * p;
      let alpha = Math.min(1, p * 1.4);
      if (settleAll) {
        const small = (hoverW / rects[i].w) * (0.35 + 0.65 * p);
        const f = settle[i].p;
        // Falls: the drop speeds up like a weight, the sideways move eases.
        const fx = easeInOut(f);
        const fy = easeIn(f);
        const fs = easeInOut(f);
        gsap.set(hero, {
          x: cx + (cx0 - cx) * fx - cx0,
          y: cy + (cy0 - cy) * fy - cy0,
          scale: small + (1 - small) * fs,
          autoAlpha: alpha + (1 - alpha) * f,
          // A card on its way down passes under the ones still waiting.
          zIndex: f > 0 ? 1 : 2,
        });
        return;
      }
      if (i > 0 && dive.p > 0) {
        // The rest drifts away from the first project and fades with the
        // camera (Ali 11-04: neighbours' edges at the hand-over, too sudden).
        const ax = cx - firstCx;
        const ay = cy - firstCy;
        const len = Math.hypot(ax, ay) || 1;
        cx += (ax / len) * push * dive.p;
        cy += (ay / len) * push * dive.p;
        alpha *= 1 - dive.p;
      }
      gsap.set(hero, {
        x: cx - cx0,
        y: cy - cy0,
        scale: scale * (0.35 + 0.65 * p),
        autoAlpha: alpha,
      });
    });
  }
  render();

  const at0 = SCATTER_BEAT.start;
  heroes.forEach((_, i) => {
    tl.to(
      fly[i],
      { p: 1, duration: SCATTER_BEAT.scatter, ease: ease.out, onUpdate: render },
      at0 + i * SCATTER_BEAT.stagger,
    );
  });
  const holdAt = at0 + SCATTER_BEAT.scatter + SCATTER_BEAT.stagger * (N - 1);
  const diveAt = holdAt + (settleAll ? SCATTER_BEAT.hold * 0.4 : SCATTER_BEAT.hold);
  // The oval turns from the moment the covers leave the middle and settles
  // just into the dive, so the hold never stands still and the first
  // project is home before the camera gets close.
  const turnStart = at0 + SCATTER_BEAT.scatter * 0.4;
  const turnEnd = settleAll ? diveAt : diveAt + SCATTER_BEAT.dive * 0.3;
  tl.to(
    ring,
    { u: 0, duration: turnEnd - turnStart, ease: "power1.inOut", onUpdate: render },
    turnStart,
  );
  if (settleAll) {
    heroes.forEach((_, i) => {
      tl.to(settle[i], { p: 1, duration: 0.9, ease: "none", onUpdate: render }, diveAt + i * 0.12);
    });
  } else {
    tl.to(world, { x: dx, y: dy, scale: K, duration: SCATTER_BEAT.dive, ease: ease.inOut }, diveAt);
    tl.to(dive, { p: 1, duration: SCATTER_BEAT.dive, ease: ease.inOut, onUpdate: render }, diveAt);
  }
  // The Pebble arrives with the first project (Ali 11-23): hidden over the
  // ring (globals.css), it settles in from just above as the dive lands.
  barEntrance(tl, diveAt + SCATTER_BEAT.dive);
}

/** The Pebble settles in from just above, landing at `end`. */
export function barEntrance(tl: gsap.core.Timeline, end: number) {
  const bar = document.querySelector<HTMLElement>("[data-site-bar]");
  if (!bar) return;
  tl.fromTo(
    bar,
    { autoAlpha: 0, y: -8, scale: 0.96 },
    {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      transformOrigin: "50% 0%",
      duration: SCATTER_BEAT.barIn,
      ease: ease.out,
      clearProps: "opacity,visibility,transform",
    },
    end - SCATTER_BEAT.barIn,
  );
}

function HeroMedia({ project, sizes }: { project: Project; sizes: string }) {
  const coverMedia = project.coverMedia;
  if (coverMedia?.type === "video" && coverMedia.video?.asset?._ref) {
    return (
      <video
        src={fileUrl(coverMedia.video.asset._ref)}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
      />
    );
  }
  if (coverMedia?.type === "image" && coverMedia.image?.asset) {
    // The same loader URL and srcset as the page's cover (ScatterHome
    // CoverMedia), so the hero and the cover share one download.
    const { props } = getImageProps({
      src: imageUrl(coverMedia.image, 1600),
      alt: "",
      fill: true,
      sizes,
      loading: "eager",
    });
    // eslint-disable-next-line @next/next/no-img-element -- a plain decode()-able image; the stage lives for five seconds
    return <img {...props} alt="" className="absolute inset-0 h-full w-full object-cover" />;
  }
  return null;
}

/** `?reel=scrub`: drag through the reel, play it, or hand over to the page. */
function Scrubber({ tl }: { tl: gsap.core.Timeline }) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const total = tl.duration();
  const lenis = useLenis();

  useEffect(() => {
    tl.eventCallback("onUpdate", () => setT(tl.time()));
    tl.eventCallback("onComplete", () => setPlaying(false));
    return () => {
      tl.eventCallback("onUpdate", null);
      tl.eventCallback("onComplete", null);
    };
  }, [tl]);

  return (
    <div className="fixed inset-x-4 top-14 z-[70] flex items-center gap-3 bg-primary px-4 py-3 text-sub text-bg">
      <button
        type="button"
        className="w-12 text-left"
        onClick={() => {
          if (playing) tl.pause();
          else tl.play(tl.progress() >= 1 ? 0 : undefined);
          setPlaying(!playing);
        }}
      >
        {playing ? "Pause" : "Play"}
      </button>
      <input
        type="range"
        min={0}
        max={total}
        step={0.01}
        value={t}
        onChange={(e) => {
          const v = Number(e.target.value);
          // Events on: the ring renders from its tweens' onUpdate.
          tl.pause().seek(v, false);
          setT(v);
          setPlaying(false);
        }}
        className="flex-1"
        aria-label="Reel time"
      />
      <span className="w-20 text-right tabular-nums">
        {t.toFixed(2)} / {total.toFixed(2)}
      </span>
      <button
        type="button"
        onClick={() => {
          // The same hand-over as finish(): Lenis was stopped for the reel.
          tl.progress(1);
          setIntroState("done");
          lenis?.start();
          setReelState("done");
          ScrollTrigger.refresh();
        }}
      >
        Done
      </button>
    </div>
  );
}
