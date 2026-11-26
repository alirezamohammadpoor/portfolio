"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type RefObject } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import type { ABOUT_QUERY_RESULT, PROJECTS_QUERY_RESULT } from "@/sanity/types";
import { fileUrl, imageUrl } from "@/sanity/lib/image";
import { usePageTransition } from "@/context/TransitionContext";
import { dur, ease, prefersReducedMotion, stagger } from "@/lib/motion";
import { isPlainLeftClick } from "@/lib/clicks";
import { cloneSourceFromElement } from "@/lib/cloneSource";
import { restoreVideoPosition, saveVideoPosition } from "@/lib/videoPosition";
import { getIntroState, useIntroState } from "@/lib/intro";
import { getReelState } from "@/lib/reel";
import { ClosingLine } from "@/components/home/ScatterHome";

export type Project = PROJECTS_QUERY_RESULT[number];
export type Contact = Pick<NonNullable<ABOUT_QUERY_RESULT>, "email" | "linkedinUrl" | "githubUrl">;

export interface VariantProps {
  projects: PROJECTS_QUERY_RESULT;
  contact?: Contact | null;
  /** The variant's root: the entry ring lands on its `[data-cover]` boxes. */
  rootRef: RefObject<HTMLDivElement | null>;
}

/**
 * The project window (Ali 11-26): every project sits in the same fixed 16:10
 * box. "inset": the box is the page colour (no hairline, Ali 11-26) and the
 * recording sits 16 px in, so different projects line up side by side.
 * "flush": the recording fills the box edge to edge.
 */
export type FrameMode = "inset" | "flush";
export const FrameContext = createContext<FrameMode>("inset");

/**
 * Re-recorded covers (11-26, 1280x800 viewport at 2x, flush), served from
 * public/lab until they go to Sanity. On by default; `?clips=old` (or the
 * picker's Clips switch, C) shows the Sanity files for comparison.
 */
export const LAB_CLIPS: Record<string, { src: string; poster: string; still?: boolean }> = {
  "zone-2": {
    src: "/lab/project-window/zone2-cover.mp4",
    poster: "/lab/project-window/zone2-cover-poster.jpg",
  },
  "sania-d-mina": {
    src: "/lab/project-window/sania-cover.mp4",
    poster: "/lab/project-window/sania-cover-poster.jpg",
    // The store's announcement bar flips through messages in the clip; the
    // home hero itself doesn't move, so the cover holds one frame (Ali 11-26).
    still: true,
  },
};
export const ClipsContext = createContext(true);

export const STATEMENT =
  "Frontend developer at the intersection of product and design. Currently at TRY Stockholm.";

export function href(project: Project) {
  return `/project/${project.slug?.current}`;
}

/**
 * A click on a project starts the home's morph from that project's painted
 * cover (`[data-cover][data-project]` inside the root), like the live home.
 */
export function useOpenProject(rootRef: RefObject<HTMLElement | null>) {
  const router = useRouter();
  const { startTransition } = usePageTransition();
  return useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, project: Project) => {
      if (!project.slug?.current || !isPlainLeftClick(e)) return;
      const cover =
        rootRef.current?.querySelector<HTMLElement>(
          `[data-cover][data-project="${project._id}"]`,
        ) ?? null;
      const source = cloneSourceFromElement(cover);
      if (!source) return;
      e.preventDefault();
      startTransition(source);
      router.push(href(project));
    },
    [rootRef, router, startTransition],
  );
}

/**
 * The live home's entrance, shared by every variant: once the entry has
 * landed the statement rises line by line out of a mask, then every
 * `[data-item]` fades up as it scrolls in (its `[data-reveal]` media, then
 * its `[data-text]`). Covers the ring landed on stay put. Reduced motion
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
          // Items on screen at the start follow the statement in order.
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
  /** Classes on the window box (its width; the 16:10 ratio is fixed). */
  className?: string;
  /** Controlled playback (index preview). Unset: plays while in view. */
  playing?: boolean;
  priority?: boolean;
  /** Mark the recording for the entry ring and the morph. A repeated copy
   *  (the carousel's second set) leaves it off. */
  mark?: boolean;
  /** Overrides the lab's window mode (full bleed always fills). */
  frame?: FrameMode | "bleed";
  /** Inset only: the window hugs the recording, 16 px on every side, and
   *  takes its size from the height (carousel row). */
  hug?: boolean;
}

/**
 * A project's recording in its window. Videos play while in view (or when
 * `playing` says so) and keep their position across visits.
 */
export function Cover({
  project,
  className = "w-full",
  playing,
  priority = false,
  mark = true,
  frame,
  hug = false,
}: CoverProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const labFrame = useContext(FrameContext);
  const mode = frame ?? labFrame;
  const controlled = playing !== undefined;
  const media = project.coverMedia;
  const newClips = useContext(ClipsContext);
  const lab = newClips ? LAB_CLIPS[project.slug?.current ?? ""] : undefined;
  const src = lab?.still
    ? null
    : (lab?.src ??
      (media?.type === "video" && media.video?.asset?._ref
        ? fileUrl(media.video.asset._ref)
        : null));

  useEffect(() => {
    const video = videoRef.current;
    if (!video || controlled) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.3 },
    );
    io.observe(video);
    return () => {
      io.disconnect();
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !controlled) return;
    return () => {
      saveVideoPosition(video, video.getAttribute("src") ?? "");
      video.pause();
    };
  }, [controlled, src]);

  const markAttrs = mark ? { "data-cover": "", "data-project": project._id } : {};
  let body: React.ReactNode;
  if (src) {
    body = (
      <video
        ref={videoRef}
        key={src}
        src={src}
        poster={lab?.poster}
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
  } else if (lab?.still) {
    // eslint-disable-next-line @next/next/no-img-element -- lab stand-in
    body = (
      <img
        src={lab.poster}
        alt={project.title ?? ""}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  } else if (media?.type === "image" && media.image?.asset) {
    // eslint-disable-next-line @next/next/no-img-element -- lab stand-in
    body = (
      <img
        src={imageUrl(media.image, 1600)}
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

  if (mode === "bleed") {
    return (
      <div {...markAttrs} className={`relative overflow-hidden bg-tertiary ${className}`}>
        {body}
      </div>
    );
  }
  if (mode === "flush") {
    return (
      <div
        {...markAttrs}
        className={`relative aspect-[16/10] overflow-hidden bg-tertiary ${className}`}
      >
        {body}
      </div>
    );
  }
  // Inset: the window keeps 16:10 and the recording keeps 16:10 inside it,
  // 16 px in at the top and bottom (a touch more at the sides).
  return (
    <div
      className={`relative flex items-center justify-center bg-bg p-4 ${hug ? "" : "aspect-[16/10]"} ${className}`}
    >
      <div
        {...markAttrs}
        className="relative aspect-[16/10] h-full max-w-full overflow-hidden bg-tertiary"
      >
        {body}
      </div>
    </div>
  );
}

/** The live home's closing sentence in the statement's size. */
export function Closing({
  contact,
  className = "",
}: {
  contact?: Contact | null;
  className?: string;
}) {
  if (!contact || !(contact.email || contact.linkedinUrl || contact.githubUrl)) return null;
  return (
    <section data-item className={`grid grid-cols-12 gap-4 ${className}`}>
      <p data-text className="col-start-1 col-end-8 text-h1">
        <ClosingLine contact={contact} />
      </p>
    </section>
  );
}
