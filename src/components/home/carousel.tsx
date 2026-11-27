"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
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
  const src =
    media?.type === "video" && media.video?.asset?._ref ? fileUrl(media.video.asset._ref) : null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
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
    return () => {
      io?.disconnect();
      saveVideoPosition(video, video.getAttribute("src") ?? "");
      video.pause();
    };
  }, [controlled, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !controlled) return;
    if (playing) video.play().catch(() => {});
    else video.pause();
  }, [controlled, playing, src]);

  let body: React.ReactNode;
  if (src) {
    body = (
      <video
        ref={videoRef}
        key={src}
        src={src}
        className="absolute inset-0 h-full w-full object-cover"
        aria-label={`${project.title ?? ""} cover video`}
        muted
        loop
        playsInline
        preload={priority ? "auto" : "metadata"}
        onLoadedMetadata={(e) =>
          restoreVideoPosition(e.currentTarget, e.currentTarget.getAttribute("src") ?? "")
        }
      />
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
      className={`relative overflow-hidden bg-tertiary ${frame === "flush" ? "aspect-[16/10]" : ""} ${className}`}
    >
      {body}
    </div>
  );
}
