"use client";

/**
 * /lab/project — mobile project "stage" (Figma: carousel v2, title block B).
 * Title block on the 4-col grid (title cols 1–2, short description + stack
 * cols 3–4), a horizontal one-item-at-a-time media strip centred in the
 * viewport with neighbours stacked behind it, pill cluster bottom-right
 * (Case study + Visit; Next project on the last item), 4 px progress line.
 * Prototype: no entrance animations, desktop just shows the phone column.
 */

import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import Image from "next/image";
import { Link } from "next-view-transitions";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;

// Card = the full 4-column width (100vw minus margins). Neighbours overlap
// behind it by OVERLAP px and are scaled down, so a visible edge of the
// previous/next card shows on each side like a stack.
const OVERLAP = 44;
const ITEM_W = "calc(100vw - 2 * var(--grid-margin))";

export default function ProjectStage({ project }: { project: Project }) {
  const gallery = project.gallery ?? [];
  const stripRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [index, setIndex] = useState(0);
  const last = gallery.length - 1;
  const atEnd = index >= last;

  // Depth: scale/opacity by distance from the strip centre; play only the centred video.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    let raf = 0;
    const update = () => {
      const mid = strip.scrollLeft + strip.clientWidth / 2;
      let best = { d: Infinity, i: 0 };
      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        const c = el.offsetLeft + el.offsetWidth / 2;
        const d = Math.abs(c - mid);
        const t = Math.min(1, d / el.offsetWidth); // 0 centred → 1 one item away
        el.style.transform = `scale(${1 - 0.08 * t})`;
        el.style.opacity = String(1 - 0.4 * t);
        el.style.boxShadow = t < 0.5 ? "0 8px 24px rgba(0,0,0,0.18)" : "none";
        el.style.zIndex = String(10 - Math.round(t * 5));
        const v = el.querySelector("video");
        if (v) { if (t < 0.5 && v.paused) v.play().catch(() => {}); else if (t >= 0.5 && !v.paused) v.pause(); }
        if (d < best.d) best = { d, i };
      });
      setIndex(best.i);
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update();
    strip.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => { strip.removeEventListener("scroll", onScroll); window.removeEventListener("resize", update); cancelAnimationFrame(raf); };
  }, [gallery.length]);

  const scrollTo = (i: number) => {
    const el = itemRefs.current[i]; const strip = stripRef.current;
    if (!el || !strip) return;
    strip.scrollTo({ left: el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  };

  const pill = "inline-flex h-9 items-center rounded-full px-4 text-sub uppercase font-medium text-primary transition-colors active:scale-[0.97]";
  const pillWhite = `${pill} bg-white border border-tertiary`;
  const pillGreen = `${pill} bg-pistachio`;

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--header-height)] mx-auto flex w-full max-w-[390px] flex-col overflow-hidden bg-bg desktop:border-x desktop:border-tertiary">
      {/* Title block B: title cols 1–2, meta cols 3–4 */}
      <div className="grid-site px-margin pt-4 pb-4">
        <h1 className="col-span-2 text-h2 text-primary">{project.title}</h1>
        <div className="col-span-2 pt-1.5 text-sub text-primary">
          {project.shortDescription && <p>{project.shortDescription}</p>}
          {project.techStack && project.techStack.length > 0 && (
            <p className="mt-3 text-primary">{project.techStack.join(", ")}</p>
          )}
        </div>
      </div>

      {/* Strip, vertically centred in the remaining space */}
      <div className="flex flex-1 items-center">
        <div
          ref={stripRef}
          className={`flex w-full snap-x snap-mandatory overflow-x-auto py-6 transition-opacity duration-300`}
          style={{ scrollPaddingInline: "var(--grid-margin)", paddingInline: "var(--grid-margin)" }}
        >
          {gallery.map((item, i) => {
            const isImage = item._type === "galleryImage";
            return (
              <div
                key={item._key}
                ref={(el) => { itemRefs.current[i] = el; }}
                className="relative shrink-0 snap-center overflow-hidden bg-black will-change-transform"
                style={{ width: ITEM_W, aspectRatio: "4 / 3", marginLeft: i === 0 ? 0 : -OVERLAP, transition: "transform 200ms ease-out, opacity 200ms ease-out, box-shadow 200ms" }}
                onClick={() => scrollTo(i)}
              >
                {isImage && item.image?.asset && (
                  <Image src={imageUrl(item.image, 900)} alt={`${project.title} — ${i + 1}`} fill className="object-cover" sizes="100vw" priority={i === 0} />
                )}
                {!isImage && item.video?.asset?._ref && (
                  <video src={fileUrl(item.video.asset._ref)} className="h-full w-full object-cover" muted loop playsInline preload="metadata" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom row: counter · pills */}
      <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-between px-margin pb-4">
        <span />
        <span className="flex items-center gap-2">
          {atEnd && project.nextProject?.slug?.current ? (
            <Link href={`/project/${project.nextProject.slug.current}`} className={pillWhite}>Next project</Link>
          ) : project.caseStudy?.slug?.current ? (
            <Link href={`/journal/${project.caseStudy.slug.current}`} className={pillWhite}>Case study</Link>
          ) : null}
          {project.siteUrl && (
            <NextLink href={project.siteUrl} target="_blank" rel="noopener noreferrer" className={pillGreen}>Visit</NextLink>
          )}
        </span>
      </div>

      {/* Progress line */}
      <div className="absolute inset-x-0 bottom-0 z-30 h-1 bg-tertiary">
        <div className="h-full bg-pistachio transition-[width] duration-300" style={{ width: `${((index + 1) / Math.max(gallery.length, 1)) * 100}%` }} />
      </div>
    </div>
  );
}
