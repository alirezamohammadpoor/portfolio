"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import { dur, ease } from "@/lib/motion";
import { onFirstVideoFrame } from "@/lib/firstFrame";
import { holdIntro, releaseIntro } from "@/lib/intro";
import { getReelState, reelScrubMode, setReelState, skipReel, useReelState } from "@/lib/reel";

type Project = PROJECTS_QUERY_RESULT[number];

/**
 * Beats, seconds (script: /mnt/project-files/home-reel/script.md). The name
 * starts writing at 0 and lands in the header at ≈3.8 on its own clock.
 */
const BEAT = {
  /** The first project holds full bleed while the name starts. */
  hold: 0.9,
  /** The other heroes pass upward, each quicker than the last. */
  reel: 1.8,
  /** Pull back to the whole home while the heroes slide into their slots. */
  out: 0.8,
  /** Top-to-bottom offset between the heroes' slides. */
  stagger: 0.03,
  /** The whole home, small and still. */
  map: 0.4,
};
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
 * into the top. The last frame is the page itself, so the stage just goes.
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
      let cancelled = false;
      let tl: gsap.core.Timeline | null = null;
      const offs: (() => void)[] = [];

      let finishing = false;
      function finish() {
        if (getReelState() !== "playing" || finishing) return;
        finishing = true;
        // The page's covers pick up where the reel's left off; the stage
        // stays until the cover in view has seeked (at most a few frames),
        // so the hand-over doesn't jump to another moment of the clip.
        const seeks: Promise<void>[] = [];
        heroes.forEach((hero, i) => {
          const from = hero.querySelector("video");
          const to = covers[i].querySelector("video");
          if (!from || !to || from.currentSrc !== to.currentSrc || from.readyState < 1 || to.readyState < 1) return;
          from.pause();
          seeks.push(new Promise((resolve) => to.addEventListener("seeked", () => resolve(), { once: true })));
          to.currentTime = from.currentTime;
        });
        const handOver = () => {
          lenisRef.current?.start();
          releaseIntro();
          setReelState("done");
          ScrollTrigger.refresh();
        };
        if (cancelled || !seeks.length) return handOver();
        Promise.race([Promise.all(seeks), new Promise((r) => window.setTimeout(r, 250))]).then(handOver);
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
        const VW = window.innerWidth;
        const VH = window.innerHeight;
        const n = heroes.length;
        const rects = covers.map((cover) => {
          const r = cover.getBoundingClientRect();
          return { x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height };
        });
        const H = Math.max(...rects.map((r) => r.y + r.h)) + 48;

        heroes.forEach((hero, i) => {
          const { x, y, w, h } = rects[i];
          // Stacked: scaled up to cover the viewport, clipped to it, in
          // slot i of a column of screens.
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

        lenisRef.current?.stop();
        holdIntro();
        setReelState("playing");

        tl = gsap.timeline({ paused: scrubbing, onComplete: scrubbing ? undefined : finish });
        tl.to(world, { y: -(n - 1) * VH, duration: BEAT.reel, ease: "power2.in" }, BEAT.hold);
        const outAt = BEAT.hold + BEAT.reel;
        tl.to(world, { x: (VW - VW * s) / 2, y: (VH - H * s) / 2, scale: s, duration: BEAT.out, ease: ease.out }, outAt);
        tl.to(
          heroes,
          { x: 0, y: 0, scale: 1, clipPath: "inset(0px 0px)", duration: BEAT.out, ease: ease.out, stagger: BEAT.stagger },
          outAt,
        );
        const diveAt = outAt + BEAT.out + BEAT.stagger * (n - 1) + BEAT.map;
        tl.to(world, { x: 0, y: 0, scale: 1, duration: dur.page, ease: ease.inOut }, diveAt);
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
