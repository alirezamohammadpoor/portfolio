"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Link } from "next-view-transitions";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import { usePageTransition } from "@/context/TransitionContext";
import { dur, ease, prefersReducedMotion } from "@/lib/motion";
import { isPlainLeftClick } from "@/lib/clicks";
import { restoreVideoPosition, saveVideoPosition } from "@/lib/videoPosition";

type Project = PROJECTS_QUERY_RESULT[number];

/**
 * The home as one scrollable canvas (Figma "Layout redesign · 10-29", Home A).
 * Laptop: a 12-column grid, 16px gutters, 24px margins; every project is a
 * media block at its own width and column offset with its title hung on one
 * edge of the media. Phone: the same rows as a full-width stack, text under
 * the media. The shape of a row comes from Sanity (homeLayout, homeTextAlign)
 * and otherwise cycles through six presets; the morph to the project page
 * starts from whichever block was clicked.
 */
interface Preset {
  /** Tailwind classes for the media cell on the laptop grid. */
  media: string;
  /** Tailwind classes for the label cell's columns. */
  label: string;
  /** Aspect ratio of the media box. */
  aspect: string;
  /** Where the text hangs on the media's edge unless Sanity says otherwise. */
  align: TextAlign;
  /** Full-bleed rows put the label under the media instead of beside it. */
  under?: boolean;
}

type TextAlign = "top" | "middle" | "bottom";
type LayoutName = "wide-left" | "wide-right" | "centre" | "full" | "tall-left" | "small-right";

// Covers are flush exports: laptop recordings at 16:10, phone recordings at
// 4:5 (the tall preset). Both cells are pinned to row 1 of their grid: with auto placement a label
// whose columns start before the media's would drop to a second row.
const PRESETS: Record<LayoutName, Preset> = {
  "wide-left": { media: "desktop:col-start-1 desktop:col-end-9", label: "desktop:col-start-10 desktop:col-end-13", aspect: "aspect-[16/10]", align: "bottom" },
  "wide-right": { media: "desktop:col-start-6 desktop:col-end-13", label: "desktop:col-start-1 desktop:col-end-5", aspect: "aspect-[16/10]", align: "top" },
  centre: { media: "desktop:col-start-3 desktop:col-end-9", label: "desktop:col-start-10 desktop:col-end-13", aspect: "aspect-[16/10]", align: "bottom" },
  full: { media: "desktop:col-start-1 desktop:col-end-13", label: "", aspect: "aspect-[16/10]", align: "bottom", under: true },
  "tall-left": { media: "desktop:col-start-1 desktop:col-end-5", label: "desktop:col-start-6 desktop:col-end-10", aspect: "aspect-[16/10] desktop:aspect-[4/5]", align: "middle" },
  "small-right": { media: "desktop:col-start-8 desktop:col-end-13", label: "desktop:col-start-1 desktop:col-end-4", aspect: "aspect-[16/10]", align: "bottom" },
};
// Rows without a layout in Sanity take the next shape in this cycle.
const CYCLE: LayoutName[] = ["wide-left", "wide-right", "centre", "full", "tall-left", "small-right"];
const ALIGN: Record<TextAlign, string> = {
  top: "desktop:self-start",
  middle: "desktop:self-center",
  bottom: "desktop:self-end",
};

function isLayout(value: string | null | undefined): value is LayoutName {
  return typeof value === "string" && value in PRESETS;
}
function isAlign(value: string | null | undefined): value is TextAlign {
  return value === "top" || value === "middle" || value === "bottom";
}

interface ScatterHomeProps {
  projects: PROJECTS_QUERY_RESULT;
}

export default function ScatterHome({ projects }: ScatterHomeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { startTransition } = usePageTransition();

  // Rows reveal once as they scroll in: media and label rise together. Once
  // only per visit: the home stays mounted behind a project page and its
  // effects run again when it is shown (Activity), which must not hide the
  // rows a second time with their scroll positions measured while hidden.
  const playedRef = useRef(false);
  useGSAP(
    () => {
      if (prefersReducedMotion() || playedRef.current) return;
      playedRef.current = true;
      const rows = gsap.utils.toArray<HTMLElement>("[data-row]");
      rows.forEach((row) => {
        gsap.from(row.querySelectorAll("[data-reveal]"), {
          y: 24,
          autoAlpha: 0,
          duration: dur.ui,
          ease: ease.out,
          stagger: 0.08,
          scrollTrigger: { trigger: row, start: "top 85%", once: true },
        });
      });
      ScrollTrigger.refresh();
    },
    { scope: rootRef },
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, project: Project) => {
      const coverMedia = project.coverMedia;
      const image = coverMedia?.type === "image" && coverMedia.image?.asset ? coverMedia.image : null;
      const videoRef =
        coverMedia?.type === "video" && coverMedia.video?.asset?._ref ? coverMedia.video.asset._ref : null;
      if (!image && !videoRef) return;
      if (!isPlainLeftClick(e)) return;
      e.preventDefault();

      const mediaEl = e.currentTarget.querySelector("img, video");
      const rect = (mediaEl ?? e.currentTarget).getBoundingClientRect();
      const sourceRect = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
      const href = `/project/${project.slug?.current}`;

      if (image) {
        startTransition({ mediaType: "image", imageUrl: imageUrl(image, 1200), sourceRect });
      } else if (videoRef) {
        const videoEl = mediaEl as HTMLVideoElement | null;
        startTransition({
          mediaType: "video",
          videoSrc: fileUrl(videoRef),
          videoCurrentTime: videoEl?.currentTime ?? 0,
          sourceVideoElement: videoEl ?? undefined,
          sourceRect,
        });
      }
      router.push(href);
    },
    [router, startTransition],
  );

  return (
    <div ref={rootRef} className="px-margin pb-24 desktop:pb-40">
      {/* Opening statement, cols 1-7 on the laptop. */}
      <section className="pt-8 desktop:grid desktop:grid-cols-12 desktop:gap-4 desktop:pt-12">
        <h2 className="text-h2 desktop:col-start-1 desktop:col-end-8 desktop:text-h1">
          Frontend developer at the intersection of product and design. Currently at TRY, Stockholm.
        </h2>
      </section>

      {/* The canvas: one row per project. */}
      <div className="mt-10 flex flex-col gap-16 desktop:mt-16 desktop:gap-40">
        {projects.map((project, index) => {
          const layout = isLayout(project.homeLayout) ? project.homeLayout : CYCLE[index % CYCLE.length];
          const preset = PRESETS[layout];
          const align = isAlign(project.homeTextAlign) ? project.homeTextAlign : preset.align;
          const href = `/project/${project.slug?.current}`;
          const label = (
            <div
              data-reveal
              className={`mt-4 desktop:mt-0 ${preset.under ? "desktop:col-start-1 desktop:col-end-4 desktop:row-start-2 desktop:mt-6" : `desktop:row-start-1 ${preset.label} ${ALIGN[align]}`}`}
            >
              <Link href={href} onClick={(e) => handleClick(e, project)} className="block">
                <h3 className="text-h3">{project.title}</h3>
                {!preset.under && <p className="mt-2 text-body text-primary">{project.shortDescription}</p>}
              </Link>
            </div>
          );
          return (
            <article key={project._id} data-row className="desktop:grid desktop:grid-cols-12 desktop:gap-4">
              <Link
                href={href}
                aria-label={`View ${project.title ?? "project"}`}
                onClick={(e) => handleClick(e, project)}
                data-reveal
                className={`block desktop:row-start-1 ${preset.media}`}
              >
                <CoverMedia project={project} aspect={preset.aspect} priority={index === 0} />
              </Link>
              {label}
              {preset.under && (
                <p data-reveal className="mt-2 text-body text-primary desktop:col-start-5 desktop:col-end-10 desktop:row-start-2 desktop:mt-6 desktop:text-lead">
                  {project.shortDescription}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {/* Index of everything, as a table. */}
      <section className="mt-24 desktop:mt-48">
        <ul>
          {projects.map((project) => (
            <li key={project._id} className="border-t border-tertiary">
              <Link
                href={`/project/${project.slug?.current}`}
                onClick={(e) => handleClick(e, project)}
                className="flex items-baseline justify-between py-4 desktop:grid desktop:grid-cols-12 desktop:gap-4"
              >
                <span className="text-body desktop:col-start-1 desktop:col-end-5 desktop:text-h3">{project.title}</span>
                <span className="hidden text-body text-primary desktop:col-start-6 desktop:col-end-11 desktop:block">
                  {project.shortDescription}
                </span>
                <span className="text-sub text-secondary desktop:col-start-12 desktop:col-end-13 desktop:text-right desktop:text-body">
                  →
                </span>
              </Link>
            </li>
          ))}
          <li className="border-t border-tertiary" />
        </ul>
      </section>
    </div>
  );
}

interface CoverMediaProps {
  project: Project;
  aspect: string;
  priority?: boolean;
}

/**
 * The project's cover in a fixed-ratio box. A video plays only while it is
 * in view and keeps its position across visits (the home stays mounted but
 * hidden behind a project page, see MediaPanel for the long version).
 */
function CoverMedia({ project, aspect, priority = false }: CoverMediaProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const coverMedia = project.coverMedia;
  const title = project.title ?? "";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const p = video.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(video);
    return () => {
      io.disconnect();
      saveVideoPosition(video, video.getAttribute("src") ?? "");
      video.pause();
    };
  }, []);

  if (coverMedia?.type === "video" && coverMedia.video?.asset?._ref) {
    return (
      <div className={`relative w-full overflow-hidden bg-tertiary ${aspect}`}>
        <video
          ref={videoRef}
          src={fileUrl(coverMedia.video.asset._ref)}
          className="absolute inset-0 h-full w-full object-cover"
          aria-label={`${title} cover video`}
          muted
          loop
          playsInline
          preload={priority ? "auto" : "metadata"}
          onLoadedMetadata={(e) => restoreVideoPosition(e.currentTarget, e.currentTarget.getAttribute("src") ?? "")}
        />
      </div>
    );
  }

  if (coverMedia?.type === "image" && coverMedia.image?.asset) {
    return (
      <div className={`relative w-full overflow-hidden bg-tertiary ${aspect}`}>
        <Image
          src={imageUrl(coverMedia.image, 1600)}
          alt={title}
          fill
          className="object-cover"
          sizes="(min-width: 75rem) 66vw, 100vw"
          priority={priority}
        />
      </div>
    );
  }

  return (
    <div className={`relative flex w-full items-center justify-center bg-tertiary ${aspect}`}>
      <span className="text-sub text-secondary">{title}</span>
    </div>
  );
}
