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
import { dur, ease } from "@/lib/motion";
import { onFirstVideoFrame } from "@/lib/firstFrame";
import { DESKTOP_QUERY } from "@/hooks/useIsDesktop";
import { holdIntro, releaseIntro } from "@/lib/intro";
import {
  SCATTER_BEAT,
  getReelState,
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
  /** Each cover's `sizes` on the page, so a hero image shares its file. */
  coverSizes: string[];
}

/**
 * Home entry: while the name is written every project's cover flies out of
 * the middle onto one field, the field holds, and the view dives into the
 * first project (see scatterTimeline). The last frame is the page itself, so
 * the stage just fades.
 *
 * The stage is a fixed layer outside <main> (which is hidden until the name
 * lands) and only moves transforms: nothing on the page lays out twice. Each
 * hero is a box the size of its cover on the page, so the landing is pixel
 * exact.
 */
export default function HomeReel({ projects, pageRef, coverSizes }: HomeReelProps) {
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
      let cancelled = false;
      let tl: gsap.core.Timeline | null = null;
      const offs: (() => void)[] = [];

      let finishing = false;
      // The last wheel event's time: a trackpad flick keeps sending its
      // inertia tail for up to a second after the skip.
      let lastWheelAt = -Infinity;
      let wakeTimer = 0;
      offs.push(() => window.clearTimeout(wakeTimer));
      function finish() {
        if (getReelState() !== "playing" || finishing) return;
        finishing = true;
        // The page is shown under the stage, then the stage fades: the
        // covers are in the same boxes, only at another moment of their
        // clips (seeking the page's videos to match stalls for up to a
        // second on sparse keyframes), so a short crossfade bridges them.
        // The landed name sits in the header, which the stage covers until
        // it has faded: drop the stage under the header first. Its header
        // band is plain background by now (the first cover sits in its
        // page slot, the others have faded).
        if (stage) stage.style.zIndex = "45";
        releaseIntro();
        // Lenis wakes after the fade, and only once the wheel that skipped
        // the reel has run dry: started under the flick's inertia tail it
        // would scroll the page off the top the reel lands on.
        const wake = () => {
          if (performance.now() - lastWheelAt < WHEEL_SILENCE_MS) {
            wakeTimer = window.setTimeout(wake, WHEEL_SILENCE_MS);
            return;
          }
          lenisRef.current?.start();
        };
        const done = () => {
          setReelState("done");
          ScrollTrigger.refresh();
          wake();
        };
        if (cancelled || !stage) return done();
        gsap.to(stage, { autoAlpha: 0, duration: SCATTER_BEAT.handOver, ease: ease.out, onComplete: done });
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
        const onWheel = () => {
          lastWheelAt = performance.now();
        };
        window.addEventListener("wheel", onWheel, opts);
        offs.push(() => window.removeEventListener("wheel", onWheel, opts));
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

      // A slow first cover no longer cancels the entry (Ali 11-05: no scatter
      // on the phone, where the first frame took longer than the wait): the
      // name writes on an empty page for the first second anyway, and the
      // covers keep loading behind their placeholder colour.
      Promise.race([ready, timeout]).then(() => {
        if (cancelled) return;
        window.scrollTo(0, 0);
        const rects = covers.map((cover) => {
          const r = cover.getBoundingClientRect();
          return { x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height };
        });
        tl = gsap.timeline({ paused: true, onComplete: scrubbing ? undefined : finish });
        scatterTimeline(tl, heroes, world, rects);

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
    // revertOnUpdate: the cleanup also runs when the reel ends (showStage
    // flips), so the window listeners and the timeline go with the stage
    // instead of living on for the whole home visit.
    { scope: stageRef, dependencies: [showStage], revertOnUpdate: true },
  );

  if (!showStage || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div ref={stageRef} aria-hidden="true" className="fixed inset-0 z-[55] overflow-hidden bg-bg">
        <div ref={worldRef} className="invisible absolute left-0 top-0 will-change-transform">
          {projects.map((project, i) => (
            <div key={project._id} data-hero className="absolute left-0 top-0 overflow-hidden bg-tertiary will-change-transform">
              <HeroMedia project={project} sizes={coverSizes[i] ?? "(min-width: 75rem) 66vw, 100vw"} />
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
 * Field spots: left, top and width of each cover as
 * fractions of the field. Laptop: the six-tile composition of /lab/scatter
 * fitted to one screen (a 16:10 field inside the viewport, under the
 * header). Phone: a zigzag down the whole screen, left and right columns apart.
 * Both keep a band across the middle clear for the name (Ali 11-04: the
 * name over a cover was too busy). More projects than
 * spots reuse them, nudged.
 */
const SCATTER_LAPTOP = [
  { l: 0.02, t: 0.02, w: 0.27 },
  { l: 0.39, t: 0.0, w: 0.23 },
  { l: 0.7, t: 0.06, w: 0.28 },
  { l: 0.04, t: 0.64, w: 0.26 },
  { l: 0.41, t: 0.73, w: 0.21 },
  { l: 0.72, t: 0.62, w: 0.26 },
];
const SCATTER_PHONE = [
  { l: 0.02, t: 0.0, w: 0.5 },
  { l: 0.5, t: 0.12, w: 0.48 },
  { l: 0.06, t: 0.25, w: 0.44 },
  { l: 0.52, t: 0.55, w: 0.46 },
  { l: 0.02, t: 0.69, w: 0.47 },
  { l: 0.54, t: 0.84, w: 0.42 },
];

/**
 * The entry's timeline: while the name is being written every cover flies
 * out of the middle to its spot on one field, the field holds with a slow
 * drift once the name has reached the header, then the view dives into the
 * first project, which grows into its own slot at the top of the home while
 * the rest of the field drifts out of frame. The camera is the world
 * transform, so the first cover lands pixel exact and the page takes over.
 */
function scatterTimeline(tl: gsap.core.Timeline, heroes: HTMLElement[], world: HTMLElement, rects: Rect[]) {
  const VW = window.innerWidth;
  const VH = window.innerHeight;
  const laptop = window.matchMedia(DESKTOP_QUERY).matches;
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

  const at = SCATTER_BEAT.start;
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
  // The dive waits for the name to reach the header (the early scatter is
  // full while the name is still writing).
  const diveAt = Math.max(holdAt + SCATTER_BEAT.hold, SCATTER_BEAT.write + dur.page + SCATTER_BEAT.afterName);
  // A slow lean toward the first project while the field holds.
  const lean = 0.04;
  const leanK = 1 + lean;
  tl.to(
    world,
    {
      x: -lean * spread[0].cx,
      y: -lean * spread[0].cy,
      scale: leanK,
      duration: diveAt - (holdAt - SCATTER_BEAT.scatter * 0.5),
      ease: "none",
    },
    holdAt - SCATTER_BEAT.scatter * 0.5,
  );
  tl.to(world, { x: dx, y: dy, scale: K, duration: SCATTER_BEAT.dive, ease: ease.inOut }, diveAt);
  // The rest of the field clears out of frame as the camera dives: on the
  // phone the zoom alone left the neighbours' edges in view at the hand-over
  // (Ali 11-04). Each cover drifts away from the first one and fades.
  const push = (0.5 * Math.max(VW, VH)) / K;
  heroes.forEach((hero, i) => {
    if (i === 0) return;
    const ax = spread[i].cx - spread[0].cx;
    const ay = spread[i].cy - spread[0].cy;
    const len = Math.hypot(ax, ay) || 1;
    tl.to(
      hero,
      {
        x: spread[i].x + (ax / len) * push,
        y: spread[i].y + (ay / len) * push,
        autoAlpha: 0,
        // With the camera, over the whole dive: they drift off as it moves
        // rather than vanishing at its start (Ali 11-04: too sudden).
        duration: SCATTER_BEAT.dive,
        ease: ease.inOut,
      },
      diveAt,
    );
  });
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
          // The same hand-over as finish(): Lenis was stopped for the reel.
          tl.progress(1);
          releaseIntro();
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
