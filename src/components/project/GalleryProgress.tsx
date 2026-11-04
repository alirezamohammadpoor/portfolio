"use client";

import Image from "next/image";
import type { RefObject } from "react";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import { EASE_OUT_CSS } from "@/lib/motion";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
type GalleryItem = NonNullable<Project["gallery"]>[number];
type NextProject = Project["nextProject"];

/** Test switch while Ali compares them on localhost (11-04): S or F. */
export type ProgressVariant = "s" | "f";

type Props = {
  variant: ProgressVariant;
  gallery: GalleryItem[];
  index: number;
  onEnd: boolean;
  nextProject: NextProject;
  title: string;
  isDesktop: boolean;
  reduceMotion: boolean;
  /** Segments carry [data-seg-fill]; the stage writes their scaleX per scroll frame. */
  rootRef: RefObject<HTMLDivElement | null>;
  onSelect: (i: number) => void;
  onNavigateNext?: () => void;
};

/**
 * The gallery's progress, horizontal (Figma "Gallery · progress ideas", 11-04).
 * S: one short segment per clip across the bottom margin; segments fill as
 * the strip moves, the counter sits above on the left and, on the last clip,
 * "Next project – X →" on the right. F: a filmstrip of tiny thumbnails at the
 * bottom centre, the current one outlined, the next project's cover last.
 */
export default function GalleryProgress(props: Props) {
  return props.variant === "f" ? <Filmstrip {...props} /> : <Segments {...props} />;
}

function NextLink({
  nextProject,
  onNavigateNext,
  show,
  reduceMotion,
  className,
  short = false,
}: {
  nextProject: NextProject;
  onNavigateNext?: () => void;
  show: boolean;
  reduceMotion: boolean;
  className: string;
  short?: boolean;
}) {
  const slug = nextProject?.slug?.current;
  if (!slug || !onNavigateNext) return null;
  return (
    <a
      href={`/project/${slug}`}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onNavigateNext();
      }}
      className={`truncate ${show ? "" : "pointer-events-none"} ${className}`}
      style={{ opacity: show ? 1 : 0, transition: reduceMotion ? "none" : `opacity 200ms ${EASE_OUT_CSS}` }}
    >
      {short ? "Next – " : "Next project – "}
      {nextProject?.title} {short ? "" : "→"}
    </a>
  );
}

function Segments({ gallery, index, onEnd, nextProject, isDesktop, reduceMotion, rootRef, onNavigateNext, onSelect }: Props) {
  const single = gallery.length <= 1;
  return (
    <div ref={rootRef} className="absolute inset-x-0 bottom-0 z-30 px-margin pb-4 desktop:pb-5">
      <div className="mb-2 flex items-baseline justify-between gap-4 desktop:mb-3">
        {!single ? (
          <p data-stage-chrome aria-hidden="true" className="invisible shrink-0 text-body text-primary tabular-nums">
            {index + 1} of {gallery.length}
          </p>
        ) : (
          <span />
        )}
        <NextLink
          nextProject={nextProject}
          onNavigateNext={onNavigateNext}
          show={onEnd}
          reduceMotion={reduceMotion}
          className={`min-w-0 font-medium text-primary hover:opacity-60 ${isDesktop ? "text-body" : "text-sub"}`}
        />
      </div>
      {!single && (
        <div className="flex gap-1" aria-hidden="true">
          {gallery.map((item, i) => (
            <button
              key={item._key}
              type="button"
              tabIndex={-1}
              onClick={() => onSelect(i)}
              className="group relative h-3 flex-1 cursor-pointer"
            >
              <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-tertiary" />
              <span
                data-seg-fill
                className="absolute inset-x-0 top-1/2 h-[3px] origin-left -translate-y-1/2 rounded-full bg-primary"
                style={{ transform: "scaleX(0)" }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function thumbSrc(item: GalleryItem): { image?: string; video?: string } {
  if (item._type === "galleryImage" && item.image?.asset) return { image: imageUrl(item.image, 160) };
  if (item._type === "galleryVideo" && item.video?.asset?._ref) return { video: fileUrl(item.video.asset._ref) };
  if (item._type === "galleryPhones") {
    const slot = item.phones?.find((p) => p.type === "image" && p.image?.asset) ?? item.phones?.[0];
    if (slot?.type === "image" && slot.image?.asset) return { image: imageUrl(slot.image as Parameters<typeof imageUrl>[0], 160) };
    if (slot?.poster?.asset) return { image: imageUrl(slot.poster as Parameters<typeof imageUrl>[0], 160) };
    if (slot?.video?.asset?._ref) return { video: fileUrl(slot.video.asset._ref) };
  }
  return {};
}

function Thumb({ src, label }: { src: { image?: string; video?: string }; label: string }) {
  if (src.image) return <Image src={src.image} alt="" fill sizes="64px" className="object-cover" />;
  if (src.video)
    // First frame only: a paused, muted element at 0.1 s with metadata preload.
    return <video src={`${src.video}#t=0.1`} muted playsInline preload="metadata" aria-label={label} className="absolute inset-0 h-full w-full object-cover" />;
  return null;
}

function Filmstrip({ gallery, index, onEnd, nextProject, title, isDesktop, reduceMotion, rootRef, onSelect, onNavigateNext }: Props) {
  const w = isDesktop ? 56 : 40;
  const h = isDesktop ? 35 : 25;
  const next = nextProject?.firstMedia as GalleryItem | null | undefined;
  const nextSrc = next ? thumbSrc(next) : {};
  const fade = reduceMotion ? "none" : `opacity 200ms ${EASE_OUT_CSS}`;
  return (
    <div ref={rootRef} className="absolute inset-x-0 bottom-0 z-30 flex justify-center px-margin pb-5 desktop:pb-6">
      <div className="flex items-start gap-1.5 desktop:gap-2">
        {gallery.length > 1 &&
          gallery.map((item, i) => (
            <button
              key={item._key}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`${title}, ${i + 1} of ${gallery.length}`}
              aria-current={i === index ? "true" : undefined}
              className="relative shrink-0 cursor-pointer overflow-hidden rounded-[2px] bg-tertiary transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96]"
              style={{
                width: w,
                height: h,
                opacity: i === index ? 1 : 0.45,
                outline: i === index ? "1.5px solid var(--color-primary)" : "1.5px solid transparent",
                outlineOffset: 1.5,
                transition: reduceMotion ? "none" : `opacity 200ms ${EASE_OUT_CSS}, outline-color 200ms ${EASE_OUT_CSS}`,
              }}
            >
              <Thumb src={thumbSrc(item)} label="" />
            </button>
          ))}
        {nextProject?.slug?.current && onNavigateNext && (
          <div className="ml-2 flex flex-col items-center desktop:ml-3">
            <button
              type="button"
              onClick={onNavigateNext}
              aria-label={`Next project: ${nextProject.title}`}
              className="relative shrink-0 cursor-pointer overflow-hidden rounded-[2px] bg-tertiary active:scale-[0.96]"
              style={{ width: w, height: h, opacity: onEnd ? 1 : 0.45, transition: fade }}
            >
              <Thumb src={nextSrc} label="" />
            </button>
            <span
              aria-hidden="true"
              className="mt-1.5 whitespace-nowrap text-[11px] text-primary desktop:text-xs"
              style={{ opacity: onEnd ? 1 : 0, transition: fade }}
            >
              Next – {nextProject.title}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
