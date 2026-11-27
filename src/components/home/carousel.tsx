"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { getImageProps } from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import { fileUrl, imageUrl } from "@/sanity/lib/image";
import { usePageTransition } from "@/context/TransitionContext";
import { dur, ease, prefersReducedMotion, stagger } from "@/lib/motion";
import { isPlainLeftClick } from "@/lib/clicks";
import { cloneSourceFromElement } from "@/lib/cloneSource";
import { restoreVideoPosition, saveVideoPosition } from "@/lib/videoPosition";
import { onFirstVideoFrame } from "@/lib/firstFrame";
import { useSharedVideo } from "@/lib/sharedVideo";
import { getIntroState, useIntroState } from "@/lib/intro";
import { getReelState } from "@/lib/reel";
import type { Contact } from "./ClosingLine";

export type Project = PROJECTS_QUERY_RESULT[number];
export type { Contact };

export interface CarouselProps {
  projects: PROJECTS_QUERY_RESULT;
  contact?: Contact | null;
  /** The row's root: the Saturn intro lands on its `[data-cover]` boxes. */
  rootRef: RefObject<HTMLDivElement | null>;
}

export const STATEMENT =
  "Frontend developer at the intersection of product and design. Currently at TRY Stockholm.";

export function href(project: Project) {
  return `/project/${project.slug?.current}`;
}

/**
 * A click on a card morphs that card's painted cover into the project page.
 * The carousel repeats its set to loop, so the morph starts from the copy
 * that was clicked, wherever it is in the row.
 */
export function useOpenProject() {
  const router = useRouter();
  const { startTransition } = usePageTransition();
  return useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, project: Project) => {
      if (!project.slug?.current || !isPlainLeftClick(e)) return;
      const source = cloneSourceFromElement(e.currentTarget);
      if (!source) return;
      e.preventDefault();
      startTransition(source);
      router.push(href(project));
    },
    [router, startTransition],
  );
}

/**
 * The home's entrance: once the intro has landed the statement rises line
 * by line out of a mask, then every `[data-item]` fades up (its
 * `[data-reveal]` media, then its `[data-text]`). Covers the intro landed
 * on stay put. Once per visit: the home stays mounted behind a project page
 * (Activity) and its effects run again when it is shown. Reduced motion
 * fades only.
 */
export function useEntrance(rootRef: RefObject<HTMLElement | null>) {
  const introDone = useIntroState() === "done";
  const played = useRef(false);
  useGSAP(
    () => {
      if (!introDone || getIntroState() !== "done" || played.current) return;
      played.current = true;
      const reduce = prefersReducedMotion();
      const reelLanded = getReelState() !== "off";

      const statement = gsap.utils.toArray<HTMLElement>("[data-statement]");
      if (statement.length) {
        if (reduce) gsap.from(statement, { autoAlpha: 0, duration: dur.ui, ease: ease.out });
        else {
          const splits = statement.map((el) =>
            SplitText.create(el, { type: "lines", mask: "lines", aria: "none" }),
          );
          gsap.from(
            splits.flatMap((s) => s.lines),
            {
              yPercent: 105,
              duration: dur.text,
              ease: ease.out,
              stagger,
              onComplete: () => splits.forEach((s) => s.revert()),
            },
          );
        }
      }

      const items = gsap.utils.toArray<HTMLElement>("[data-item]");
      const fold = window.innerHeight * 0.9;
      let inView = 0;
      items.forEach((item) => {
        const media =
          reelLanded || reduce
            ? []
            : gsap.utils.toArray<HTMLElement>(item.querySelectorAll("[data-reveal]"));
        const text = gsap.utils.toArray<HTMLElement>(item.querySelectorAll("[data-text]"));
        if (!media.length && !text.length) return;
        const enter = (delay: number) => {
          if (media.length)
            gsap.fromTo(
              media,
              { y: 24, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: dur.ui * 2, ease: ease.out, delay },
            );
          if (text.length)
            gsap.fromTo(
              text,
              { y: reduce ? 0 : 12, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                duration: dur.ui * 2,
                ease: ease.out,
                stagger: stagger / 2,
                delay: delay + (media.length ? stagger : 0),
              },
            );
        };
        if (item.getBoundingClientRect().top < fold) {
          inView += 1;
          enter(stagger * (inView + 1));
          return;
        }
        gsap.set([...media, ...text], { autoAlpha: 0 });
        ScrollTrigger.create({
          trigger: item,
          start: "clamp(top 90%)",
          once: true,
          onEnter: () => enter(0),
        });
      });
      ScrollTrigger.refresh();
    },
    { scope: rootRef, dependencies: [introDone] },
  );
}

interface CoverProps {
  project: Project;
  /** Classes on the window box. */
  className?: string;
  /** Controlled playback (the laptop row pauses the others on hover).
   *  Unset: plays while in view. */
  playing?: boolean;
  priority?: boolean;
  /** Mark the cover for the intro. The carousel's repeated set leaves it off. */
  mark?: boolean;
  /** "flush": a 16:10 box sized from its height (laptop row). "bleed": the
   *  box the caller sizes (phone row). */
  frame?: "flush" | "bleed";
  /** The `sizes` an image cover asks for. */
  sizes?: string;
}

/**
 * A project's Sanity cover, edge to edge in its window. Videos play while in
 * view (or when `playing` says so) and keep their position across visits.
 *
 * A clip is one shared download (sharedVideo.ts): every copy of a cover
 * plays the same blob. Until its first frame is up the box shows the clip's
 * still, the inline blur first and then the poster itself, so the row never
 * shows an empty box while the files come in (Ali, 11-27).
 */
export function Cover({
  project,
  className = "w-full",
  playing,
  priority = false,
  mark = true,
  frame = "flush",
  sizes = "50vw",
}: CoverProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlled = playing !== undefined;
  const media = project.coverMedia;
  const url =
    media?.type === "video" && media.video?.asset?._ref ? fileUrl(media.video.asset._ref) : null;
  const hasStill = Boolean(project.coverPoster?.asset);
  // The clip's download waits for the still: on a phone connection the
  // stills came in late behind 11 MB of clips, so the blur showed for long
  // (Ali, 11-27: "still grey on mobile").
  const [stillIn, setStillIn] = useState(false);
  // Only clips on screen or a screen away download (a phone visitor no
  // longer pulls every cover in full); once near, a cover stays wanted.
  const boxRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !url || near) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: "0px 100% 0px 100%" },
    );
    io.observe(box);
    return () => io.disconnect();
  }, [url, near]);
  const src = useSharedVideo(url, priority, hasStill, stillIn && near);
  const [framed, setFramed] = useState<string | null>(null);
  const shown = Boolean(src) && framed === src;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    let io: IntersectionObserver | null = null;
    if (!controlled) {
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) video.play().catch(() => {});
          else video.pause();
        },
        { threshold: 0.3 },
      );
      io.observe(video);
    }
    const stop =
      video.readyState >= 2 ? (setFramed(src), () => {}) : onFirstVideoFrame(video, () => setFramed(src));
    return () => {
      stop();
      io?.disconnect();
      if (url) saveVideoPosition(video, url);
      video.pause();
    };
  }, [controlled, src, url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !controlled) return;
    if (playing) video.play().catch(() => {});
    else video.pause();
  }, [controlled, playing, src]);

  let body: React.ReactNode;
  if (url) {
    const poster = project.coverPoster?.asset
      ? getImageProps({
          src: imageUrl(project.coverPoster, 1600),
          alt: "",
          fill: true,
          sizes,
          // Every cover's still comes in up front: the row is one screen
          // and drifts, so a lazy still would be late exactly when it shows.
          loading: "eager",
          fetchPriority: priority ? "high" : "auto",
        }).props
      : null;
    body = (
      <>
        {/* Under the clip until its first frame is up, then gone, so the
            morph (cloneSource: the first img or video) starts from the
            clip once it plays and from the still before. */}
        {poster && !shown && (
          // eslint-disable-next-line @next/next/no-img-element -- getImageProps gives the srcset
          <img
            {...poster}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onLoad={() => setStillIn(true)}
            onError={() => setStillIn(true)}
          />
        )}
        {src && (
          <video
            ref={videoRef}
            key={src}
            src={src}
            className={`absolute inset-0 h-full w-full object-cover ${shown ? "" : "opacity-0"}`}
            aria-label={`${project.title ?? ""} cover video`}
            muted
            loop
            playsInline
            preload="auto"
            onLoadedMetadata={(e) => restoreVideoPosition(e.currentTarget, url)}
          />
        )}
      </>
    );
  } else if (media?.type === "image" && media.image?.asset) {
    // The same loader URL and srcset as the intro's card (HomeReel), so
    // the two share one download.
    const { props } = getImageProps({
      src: imageUrl(media.image, 1600),
      alt: project.title ?? "",
      fill: true,
      sizes,
      loading: priority ? "eager" : "lazy",
    });
    body = (
      // eslint-disable-next-line @next/next/no-img-element -- getImageProps gives the srcset
      <img
        {...props}
        alt={project.title ?? ""}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  } else {
    body = (
      <span className="absolute inset-0 flex items-center justify-center text-sub text-secondary">
        {project.title}
      </span>
    );
  }

  const markAttrs = mark ? { "data-cover": "", "data-project": project._id } : {};
  return (
    <div
      {...markAttrs}
      ref={boxRef}
      className={`relative overflow-hidden bg-tertiary bg-cover bg-center ${frame === "flush" ? "aspect-[16/10]" : ""} ${className}`}
      style={url && project.coverLqip ? { backgroundImage: `url(${project.coverLqip})` } : undefined}
    >
      {body}
    </div>
  );
}
