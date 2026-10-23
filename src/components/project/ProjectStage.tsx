"use client";

/**
 * Mobile project page ("stage"). Title block on the 4-column grid (title on
 * columns 1–2, short description + stack on 3–4), a horizontal one-card-at-a-
 * time media strip centred in the viewport with the previous/next cards
 * stacked behind it, pills bottom-right (Case study + Visit; Next project on
 * the last card) and a 4 px progress line.
 *
 * Rules (see the action plan, phase 2): 1 item → no strip chrome; only the
 * current card and its two neighbours mount <video>; media fills a 4:3 frame
 * (object-cover, like the desktop gallery and the home → project clone);
 * reduced motion drops the depth transforms.
 */

import { useEffect, useRef, useState, type RefObject } from "react";
import NextLink from "next/link";
import Image from "next/image";
import { Link } from "next-view-transitions";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;

interface ProjectStageProps {
  project: Project;
  /** Hidden while the home → project clone is in flight. */
  hidden?: boolean;
  /** The first card: the clone's landing rect. */
  firstCardRef?: RefObject<HTMLDivElement | null>;
  /** First card's media is decoded; the clone may morph. */
  onFirstReady?: () => void;
}

// Motion spec (phase 2). Reference: Swiper coverflow demo at 390 px —
// 300 px snap settles in ~290 ms, next card peeks 22 px. Ours: card is the
// full 4-column width, neighbours overlap 44 px behind it at 0.92 scale.
const OVERLAP = 44;
const NEIGHBOUR_SCALE = 0.92;
const NEIGHBOUR_OPACITY = 0.6;
const SETTLE_MS = 200;
const ITEM_W = "calc(100vw - 2 * var(--grid-margin))";

export default function ProjectStage({
  project,
  hidden = false,
  firstCardRef,
  onFirstReady,
}: ProjectStageProps) {
  const gallery = project.gallery ?? [];
  const stripRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const last = gallery.length - 1;
  const atEnd = index >= last;
  const single = gallery.length <= 1;
  // Titles longer than ~11 characters don't fit two columns at h2 (phase 2
  // rule: "Deploymentbar" overflowed), so the title takes all four columns
  // and the meta drops below it.
  const longTitle = (project.title?.length ?? 0) > 11;

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
      itemRefs.current.forEach((el, i) => {
        if (!el) return;
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
      setIndex((prev) => (prev === best.i ? prev : best.i));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    measure();
    strip.addEventListener("scroll", onScroll, { passive: true });
    strip.addEventListener("scrollend", measure);
    window.addEventListener("resize", measure);
    return () => {
      strip.removeEventListener("scroll", onScroll);
      strip.removeEventListener("scrollend", measure);
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
    };
  }, [gallery.length, reduceMotion]);

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

  const pill =
    "inline-flex h-9 items-center rounded-full px-4 text-sub uppercase font-medium text-primary transition-colors active:scale-[0.97]";
  const pillWhite = `${pill} bg-white border border-tertiary`;
  const pillGreen = `${pill} bg-pistachio`;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 top-[var(--header-height)] flex flex-col overflow-hidden bg-bg${hidden ? " opacity-0 pointer-events-none" : ""}`}
    >
      {/* Title block B: title cols 1–2, meta cols 3–4 */}
      <div className="grid-site px-margin pt-4 pb-4">
        <h1 className={`${longTitle ? "col-span-4" : "col-span-2"} text-h2 text-primary`}>{project.title}</h1>
        <div className={`${longTitle ? "col-span-4 pt-2" : "col-span-2 pt-1.5"} text-sub text-primary`}>
          {project.shortDescription && <p>{project.shortDescription}</p>}
          {project.techStack && project.techStack.length > 0 && (
            <p className="mt-3 text-primary">{project.techStack.join(", ")}</p>
          )}
        </div>
      </div>

      {/* Strip, vertically centred in the remaining space */}
      <div className="flex flex-1 items-center pb-[52px]">
        <div
          ref={stripRef}
          className={`flex w-full overflow-x-auto py-6 ${single ? "justify-center" : "snap-x snap-mandatory"}`}
          style={{ scrollPaddingInline: "var(--grid-margin)", paddingInline: "var(--grid-margin)" }}
          data-lenis-prevent
          role="region"
          aria-roledescription="carousel"
          aria-label={`${project.title} gallery, ${gallery.length} items`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault();
            const next = Math.min(last, Math.max(0, index + (e.key === "ArrowRight" ? 1 : -1)));
            const el = itemRefs.current[next];
            const strip = stripRef.current;
            if (!el || !strip) return;
            strip.scrollTo({
              left: el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2,
              behavior: reduceMotion ? "auto" : "smooth",
            });
          }}
        >
          {gallery.map((item, i) => {
            const isImage = item._type === "galleryImage";
            const near = Math.abs(i - index) <= 1;
            return (
              <div
                key={item._key}
                ref={(el) => {
                  itemRefs.current[i] = el;
                  if (i === 0 && firstCardRef) firstCardRef.current = el;
                }}
                className="relative shrink-0 snap-center overflow-hidden bg-black will-change-transform"
                style={{
                  width: ITEM_W,
                  aspectRatio: "4 / 3",
                  marginLeft: i === 0 ? 0 : -OVERLAP,
                  boxShadow: i === index && !reduceMotion ? "0 8px 24px rgba(0,0,0,0.18)" : "none",
                  transition: reduceMotion
                    ? "none"
                    : `transform ${SETTLE_MS}ms ease-out, opacity ${SETTLE_MS}ms ease-out, box-shadow ${SETTLE_MS}ms`,
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${gallery.length}`}
              >
                {isImage && item.image?.asset && (
                  <Image
                    src={imageUrl(item.image, 900)}
                    alt={`${project.title} — ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    priority={i === 0}
                    onLoad={i === 0 ? onFirstReady : undefined}
                  />
                )}
                {!isImage && item.video?.asset?._ref && near && (
                  <video
                    src={fileUrl(item.video.asset._ref)}
                    className="h-full w-full object-cover"
                    aria-label={`${project.title} — ${i + 1}`}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    autoPlay={i === 0}
                    onLoadedMetadata={i === 0 ? onFirstReady : undefined}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Position for screen readers; the progress line is decorative */}
      <p className="sr-only" aria-live="polite">
        {single ? "" : `${index + 1} of ${gallery.length}`}
      </p>

      {/* Bottom row: pills */}
      <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-end gap-2 px-margin pb-4">
        {atEnd && !single && project.nextProject?.slug?.current ? (
          <Link href={`/project/${project.nextProject.slug.current}`} className={pillWhite}>
            Next project
          </Link>
        ) : project.caseStudy?.slug?.current ? (
          <Link href={`/journal/${project.caseStudy.slug.current}`} className={pillWhite}>
            Case study
          </Link>
        ) : null}
        {project.siteUrl && (
          <NextLink href={project.siteUrl} target="_blank" rel="noopener noreferrer" className={pillGreen}>
            Visit<span className="sr-only"> (opens in a new tab)</span>
          </NextLink>
        )}
      </div>

      {/* Progress line (hidden for a single item) */}
      {!single && (
        <div className="absolute inset-x-0 bottom-0 z-30 h-1 bg-tertiary" aria-hidden="true">
          <div
            className="h-full bg-pistachio"
            style={{
              width: `${((index + 1) / gallery.length) * 100}%`,
              transition: reduceMotion ? "none" : "width 300ms",
            }}
          />
        </div>
      )}
    </div>
  );
}
