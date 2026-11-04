"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import { ease } from "@/lib/motion";
import { onFirstVideoFrame } from "@/lib/firstFrame";
import { holdIntro, releaseIntro } from "@/lib/intro";
import {
  REEL_BEAT as BEAT,
  REEL_PULL_BACK_AT,
  SCATTER_BEAT,
  getReelState,
  reelScrubMode,
  reelVariant,
  setReelState,
  skipReel,
  useReelState,
} from "@/lib/reel";

type Project = PROJECTS_QUERY_RESULT[number];

/** Longest wait for the first cover's frame before the reel gives up. */
const READY_TIMEOUT = 1200;
/** Breathing room around the home at the overview. */
const MAP_FILL = 0.86;

interface HomeReelProps {
  projects: PROJECTS_QUERY_RESULT;
  /** The home canvas: its `[data-cover]` boxes are where the heroes land. */
  pageRef: RefObject<HTMLElement | null>;
}

/**
 * Entry reel: every project's cover passes full bleed, quicker and quicker,
 * then the view pulls back until the whole home fits on screen, the covers
 * sliding from their stacked slots into their places on the page, and dives
 * into the top. The last frame is the page itself, so the stage just fades.
 *
 * The stage is a fixed layer outside <main> (which is hidden until the name
 * lands) and only moves transforms and clip paths: nothing on the page lays
 * out twice. Each hero is a box the size of its cover on the page, scaled up
 * and clipped to the viewport for the reel, so the landing is pixel exact.
 */
export default function HomeReel({ projects, pageRef }: HomeReelProps) {
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
      if (!heroes.length || heroes.length !== covers.length) {
        setReelState("off");
        return;
      }
      const scrubbing = reelScrubMode();
      const variant = reelVariant();
      let cancelled = false;
      let tl: gsap.core.Timeline | null = null;
      const offs: (() => void)[] = [];

      let finishing = false;
      function finish() {
        if (getReelState() !== "playing" || finishing) return;
        finishing = true;
        // The page is shown under the stage, then the stage fades: the
        // covers are in the same boxes, only at another moment of their
        // clips (seeking the page's videos to match stalls for up to a
        // second on sparse keyframes), so a short crossfade bridges them.
        releaseIntro();
        // Lenis wakes after the fade: the wheel that skipped the reel must
        // not also scroll the page off the top it lands on.
        const done = () => {
          lenisRef.current?.start();
          setReelState("done");
          ScrollTrigger.refresh();
        };
        if (cancelled || !stage) return done();
        gsap.to(stage, { autoAlpha: 0, duration: variant === "scatter" ? SCATTER_BEAT.handOver : BEAT.handOver, ease: ease.out, onComplete: done });
      }

      function onInput() {
        if (getReelState() === "waiting") {
          // Input before the first frame: no reel, the name plays alone.
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

      Promise.race([ready, timeout]).then((ok) => {
        if (cancelled) return;
        if (!ok) {
          setReelState("off");
          return;
        }
        window.scrollTo(0, 0);
        const rects = covers.map((cover) => {
          const r = cover.getBoundingClientRect();
          return { x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height };
        });
        tl = gsap.timeline({ paused: true, onComplete: scrubbing ? undefined : finish });
        if (variant === "scatter") scatterTimeline(tl, heroes, world, rects);
        else reelTimeline(tl, heroes, world, rects);

        lenisRef.current?.stop();
        holdIntro();
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
    { scope: stageRef, dependencies: [showStage] },
  );

  if (!showStage || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div ref={stageRef} aria-hidden="true" className="fixed inset-0 z-[55] overflow-hidden bg-bg">
        <div ref={worldRef} className="invisible absolute left-0 top-0 will-change-transform">
          {projects.map((project, i) => (
            <div key={project._id} data-hero className="absolute left-0 top-0 overflow-hidden bg-tertiary will-change-transform">
              <HeroMedia project={project} eager={i < 2} />
            </div>
          ))}
        </div>
      </div>
      {scrub && <Scrubber tl={scrub} />}
    </>,
    document.body,
  );
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The cover reel: heroes stacked full bleed in a column of screens pass
 * upward, quicker and quicker, the last one eases in and holds, then the
 * view pulls back to the whole home as the heroes slide into their slots,
 * holds, and dives into the top.
 */
function reelTimeline(tl: gsap.core.Timeline, heroes: HTMLElement[], world: HTMLElement, rects: Rect[]) {
  const VW = window.innerWidth;
  const VH = window.innerHeight;
  const n = heroes.length;
  const H = Math.max(...rects.map((r) => r.y + r.h)) + 48;
  heroes.forEach((hero, i) => {
    const { x, y, w, h } = rects[i];
    // Stacked: scaled up to cover the viewport, clipped to it, in slot i of
    // a column of screens.
    const k = Math.max(VW / w, VH / h);
    const insetX = Math.max(0, (w - VW / k) / 2);
    const insetY = Math.max(0, (h - VH / k) / 2);
    gsap.set(hero, {
      left: x,
      top: y,
      width: w,
      height: h,
      transformOrigin: "50% 50%",
      x: VW / 2 - (x + w / 2),
      y: i * VH + VH / 2 - (y + h / 2),
      scale: k,
      clipPath: `inset(${insetY}px ${insetX}px)`,
    });
  });
  const s = Math.min(1, (VH * MAP_FILL) / H);
  gsap.set(world, { transformOrigin: "0 0", x: 0, y: 0, scale: 1, autoAlpha: 1 });

  const bottom = -(n - 1) * VH;
  // Speeding up to the second-last project, then the last one decelerates
  // in and holds before the pull back.
  tl.to(world, { y: bottom + VH, duration: BEAT.reel, ease: BEAT.reelEase }, BEAT.hold);
  tl.to(world, { y: bottom, duration: BEAT.stop, ease: "power1.out" });
  const outAt = REEL_PULL_BACK_AT;
  tl.to(world, { x: (VW - VW * s) / 2, y: (VH - H * s) / 2, scale: s, duration: BEAT.out, ease: ease.inOut }, outAt);
  tl.to(
    heroes,
    { x: 0, y: 0, scale: 1, clipPath: "inset(0px 0px)", duration: BEAT.out, ease: ease.inOut, stagger: BEAT.stagger },
    outAt,
  );
  const diveAt = outAt + BEAT.out + BEAT.stagger * (n - 1) + BEAT.map;
  tl.to(world, { x: 0, y: 0, scale: 1, duration: BEAT.dive, ease: ease.inOut }, diveAt);
}

/**
 * Field spots for the scatter variant: left, top and width of each cover as
 * fractions of the field. Laptop: the six-tile composition of /lab/scatter
 * fitted to one screen (a 16:10 field inside the viewport, under the
 * header). Phone: a zigzag down the whole screen, left and right columns apart. More projects than
 * spots reuse them, nudged.
 */
const SCATTER_LAPTOP = [
  { l: 0.02, t: 0.04, w: 0.27 },
  { l: 0.6, t: 0.0, w: 0.3 },
  { l: 0.35, t: 0.36, w: 0.23 },
  { l: 0.7, t: 0.45, w: 0.27 },
  { l: 0.04, t: 0.6, w: 0.28 },
  { l: 0.42, t: 0.74, w: 0.21 },
];
const SCATTER_PHONE = [
  { l: 0.02, t: 0.02, w: 0.5 },
  { l: 0.5, t: 0.14, w: 0.48 },
  { l: 0.06, t: 0.32, w: 0.44 },
  { l: 0.52, t: 0.46, w: 0.46 },
  { l: 0.02, t: 0.63, w: 0.47 },
  { l: 0.54, t: 0.8, w: 0.42 },
];

/**
 * The scatter experiment: the name is written on an empty stage; as it
 * leaves for the header every cover flies out of the middle to its spot on
 * one field, the field holds with a slow drift, then the view dives into
 * the first project, which grows into its own slot at the top of the home
 * while the rest of the field passes out of frame. The camera is the world
 * transform, so the first cover lands pixel exact and the page takes over.
 */
function scatterTimeline(tl: gsap.core.Timeline, heroes: HTMLElement[], world: HTMLElement, rects: Rect[]) {
  const VW = window.innerWidth;
  const VH = window.innerHeight;
  const laptop = window.matchMedia("(width >= 75rem)").matches;
  const spots = laptop ? SCATTER_LAPTOP : SCATTER_PHONE;
  // The field: under the header with a margin all round; on the laptop the
  // largest 16:10 box that fits, centred.
  const top = 72;
  const margin = laptop ? 24 : 16;
  const availW = VW - margin * 2;
  const availH = VH - top - margin;
  const fw = laptop ? Math.min(availW, availH * 1.6) : availW;
  const fh = laptop ? fw / 1.6 : availH;
  const fx = (VW - fw) / 2;
  const fy = top + (availH - fh) / 2;

  const spread = heroes.map((hero, i) => {
    const { x, y, w, h } = rects[i];
    const spot = spots[i % spots.length];
    const nudge = Math.floor(i / spots.length) * 0.04;
    const scale = (spot.w * fw) / w;
    const cx = fx + (spot.l + nudge) * fw + (w * scale) / 2;
    const cy = fy + (spot.t + nudge) * fh + (h * scale) / 2;
    gsap.set(hero, {
      left: x,
      top: y,
      width: w,
      height: h,
      transformOrigin: "50% 50%",
      x: VW / 2 - (x + w / 2),
      y: VH / 2 - (y + h / 2),
      scale: scale * 0.35,
      autoAlpha: 0,
    });
    return { x: cx - (x + w / 2), y: cy - (y + h / 2), scale, cx, cy };
  });
  gsap.set(world, { transformOrigin: "0 0", x: 0, y: 0, scale: 1, autoAlpha: 1 });

  const at = SCATTER_BEAT.write;
  // Out of the middle, first project first, each to its spot.
  heroes.forEach((hero, i) => {
    const { x, y, scale } = spread[i];
    tl.to(hero, { x, y, scale, autoAlpha: 1, duration: SCATTER_BEAT.scatter, ease: ease.out }, at + i * SCATTER_BEAT.stagger);
  });

  // The camera: a world transform that maps the first cover's spot onto its
  // slot on the page (same box, so one scale and one shift).
  const first = rects[0];
  const K = 1 / spread[0].scale;
  const dx = first.x + first.w / 2 - K * spread[0].cx;
  const dy = first.y + first.h / 2 - K * spread[0].cy;
  const holdAt = at + SCATTER_BEAT.scatter + SCATTER_BEAT.stagger * (heroes.length - 1);
  // A slow lean toward the first project while the field holds.
  const lean = 0.04;
  const leanK = 1 + lean;
  tl.to(
    world,
    {
      x: -lean * spread[0].cx,
      y: -lean * spread[0].cy,
      scale: leanK,
      duration: SCATTER_BEAT.hold + SCATTER_BEAT.scatter * 0.5,
      ease: "none",
    },
    holdAt - SCATTER_BEAT.scatter * 0.5,
  );
  tl.to(world, { x: dx, y: dy, scale: K, duration: SCATTER_BEAT.dive, ease: ease.inOut }, holdAt + SCATTER_BEAT.hold);
}

function HeroMedia({ project, eager }: { project: Project; eager: boolean }) {
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
        preload={eager ? "auto" : "metadata"}
      />
    );
  }
  if (coverMedia?.type === "image" && coverMedia.image?.asset) {
    // eslint-disable-next-line @next/next/no-img-element -- a plain decode()-able image; the stage lives for five seconds
    return <img src={imageUrl(coverMedia.image, 1600)} alt="" className="absolute inset-0 h-full w-full object-cover" />;
  }
  return null;
}

/** `?reel=scrub`: drag through the reel, play it, or hand over to the page. */
function Scrubber({ tl }: { tl: gsap.core.Timeline }) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const total = tl.duration();

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
          tl.pause().seek(v);
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
          tl.progress(1);
          releaseIntro();
          setReelState("done");
        }}
      >
        Done
      </button>
    </div>
  );
}
