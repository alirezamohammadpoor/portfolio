"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { getImageProps } from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import { useSharedVideo } from "@/lib/sharedVideo";
import { ease } from "@/lib/motion";
import { onFirstVideoFrame } from "@/lib/firstFrame";
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

// The `?reel=scrub` tuning bar: loaded only when asked for.
const Scrubber = dynamic(() => import("./ReelScrubber"), { ssr: false });

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
  /** Builds the whole entry: the home's saturnIntro, the lab's ringIntro. */
  build: IntroBuilder;
  /** Lab only: a project's stand-in cover file (re-recorded, not in Sanity). */
  heroOverride?: (
    project: Project,
  ) => { src: string; still?: boolean; poster?: string } | undefined;
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
 * Home entry: every project's cover flies from the middle into its place on
 * the page, choreographed by `build` (saturnIntro). The last frame is the page itself, so the stage just fades.
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
  build,
  heroOverride,
}: HomeReelProps) {
  const reel = useReelState();
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const [scrub, setScrub] = useState<gsap.core.Timeline | null>(null);
  const [retry, setRetry] = useState(0);
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
      // The page's ref can still be unset when the reel mounts inside it on a
      // client-only render (lab phone): look again on the next frame.
      if (!page && getReelState() === "waiting") {
        if (retry < 3) {
          const id = requestAnimationFrame(() => setRetry((n) => n + 1));
          return () => cancelAnimationFrame(id);
        }
        // Still no page to land on: give up and show it.
        setReelState("off");
        return;
      }
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
        build(tl, heroes, world, rects);

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
    { scope: stageRef, dependencies: [showStage, retry], revertOnUpdate: true },
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
              className="absolute left-0 top-0 overflow-hidden bg-tertiary bg-cover bg-center will-change-transform"
              style={project.coverLqip ? { backgroundImage: `url(${project.coverLqip})` } : undefined}
            >
              <HeroMedia
                project={project}
                override={heroOverride?.(project)}
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

/**
 * The intro's copy of a cover clip: the same one download as the row's
 * (sharedVideo.ts), its still until that is in.
 */
function HeroClip({ project, url, sizes }: { project: Project; url: string; sizes: string }) {
  const src = useSharedVideo(url, true, Boolean(project.coverPoster?.asset));
  // With a still, the intro starts on it (it waits for the first card's
  // img or video); without one, on the clip's first frame, as before.
  if (!src && project.coverPoster?.asset) {
    const { props } = getImageProps({
      src: imageUrl(project.coverPoster, 1600),
      alt: "",
      fill: true,
      sizes,
      loading: "eager",
      fetchPriority: "high",
    });
    // eslint-disable-next-line @next/next/no-img-element -- getImageProps gives the srcset
    return <img {...props} alt="" className="absolute inset-0 h-full w-full object-cover" />;
  }
  return (
    <video
      src={src}
      className="absolute inset-0 h-full w-full object-cover"
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
    />
  );
}

function HeroMedia({
  project,
  sizes,
  override,
}: {
  project: Project;
  sizes: string;
  override?: { src: string; still?: boolean; poster?: string };
}) {
  if (override) {
    return override.still ? (
      // eslint-disable-next-line @next/next/no-img-element -- lab stand-in
      <img src={override.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
    ) : (
      <video
        src={override.src}
        poster={override.poster}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
      />
    );
  }
  const coverMedia = project.coverMedia;
  if (coverMedia?.type === "video" && coverMedia.video?.asset?._ref) {
    return <HeroClip project={project} url={fileUrl(coverMedia.video.asset._ref)} sizes={sizes} />;
  }
  if (coverMedia?.type === "image" && coverMedia.image?.asset) {
    // The same loader URL and srcset as the page's cover (carousel.tsx
    // Cover), so the hero and the cover share one download.
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
