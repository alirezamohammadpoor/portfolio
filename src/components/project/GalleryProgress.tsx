"use client";

import Image from "next/image";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import { EASE_OUT_CSS } from "@/lib/motion";
import { GridIcon, ROUND_BUTTON } from "@/components/project/ProjectSwitcher";
import { BAR_PX, type AutoBar } from "@/components/project/AutoProgress";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
type GalleryItem = NonNullable<Project["gallery"]>[number];
type NextProject = Project["nextProject"];

type Props = {
  gallery: GalleryItem[];
  index: number;
  onEnd: boolean;
  /** The next project's preview card is centred: the row hands over to the pill. */
  atPreview: boolean;
  nextProject: NextProject;
  title: string;
  isDesktop: boolean;
  reduceMotion: boolean;
  onSelect: (i: number) => void;
  onNavigateNext?: () => void;
  /** Opens every project (ProjectSwitcher): the round button leading the row. */
  onOpenIndex?: () => void;
  indexOpen?: boolean;
  /** The clip meter's look when the gallery plays in order (AutoProgress). */
  bar?: AutoBar | null;
  /** Still playing in order: the meter shows. */
  barOn?: boolean;
};

/**
 * The gallery's progress (Figma "Gallery · progress ideas", 11-04, Ali picked
 * F): a filmstrip of tiny thumbnails at the bottom centre, the current one
 * outlined, the next project's cover last. Every thumbnail jumps to its
 * clip; the last one hands off, and so does the pill that replaces the row
 * once the next project's card is centred.
 */
export default function GalleryProgress(props: Props) {
  return <Filmstrip {...props} />;
}

function thumbSrc(item: GalleryItem): { image?: string; video?: string } {
  if (item._type === "galleryImage" && item.image?.asset)
    return { image: imageUrl(item.image, 160) };
  // A video's poster (its first frame, from Sanity) is a 160 px image; the
  // clip itself is only the fallback, a metadata fetch per thumb.
  if (item._type === "galleryVideo" && item.poster?.asset)
    return { image: imageUrl(item.poster, 160) };
  if (item._type === "galleryVideo" && item.video?.asset?._ref)
    return { video: fileUrl(item.video.asset._ref) };
  if (item._type === "galleryPhones") {
    const slot = item.phones?.find((p) => p.type === "image" && p.image?.asset) ?? item.phones?.[0];
    if (slot?.type === "image" && slot.image?.asset)
      return { image: imageUrl(slot.image as Parameters<typeof imageUrl>[0], 160) };
    if (slot?.poster?.asset)
      return { image: imageUrl(slot.poster as Parameters<typeof imageUrl>[0], 160) };
    if (slot?.video?.asset?._ref) return { video: fileUrl(slot.video.asset._ref) };
  }
  return {};
}

function Thumb({ src, label }: { src: { image?: string; video?: string }; label: string }) {
  if (src.image) return <Image src={src.image} alt="" fill sizes="64px" className="object-cover" />;
  if (src.video)
    // First frame only: a paused, muted element at 0.1 s with metadata preload.
    return (
      <video
        src={`${src.video}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        aria-label={label}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  return null;
}

function Filmstrip({
  gallery,
  index,
  onEnd,
  atPreview,
  nextProject,
  title,
  isDesktop,
  reduceMotion,
  onSelect,
  onNavigateNext,
  onOpenIndex,
  indexOpen,
  bar,
  barOn = false,
}: Props) {
  const next = nextProject?.firstMedia as GalleryItem | null | undefined;
  const nextSrc = next ? thumbSrc(next) : {};
  const hasNext = Boolean(nextProject?.slug?.current && onNavigateNext);
  const ease = `200ms ${EASE_OUT_CSS}`;
  // Thumb size: 56×35 on laptop. On a phone 40×25 at most, smaller when the
  // row would run past the page margins (every thumb plus the next cover,
  // 6 px gaps and the 8 px before the cover, and the index button with
  // its 8 px when there is one).
  const shown = (gallery.length > 1 ? gallery.length : 0) + (hasNext ? 1 : 0);
  const thumbW = isDesktop
    ? "56px"
    : `min(40px, calc((100vw - 2 * var(--grid-margin) - ${hasNext ? 8 : 0}px - ${onOpenIndex ? 44 : 0}px - ${Math.max(0, shown - 1) * 6}px) / ${Math.max(1, shown)}))`;
  const thumbBox = { width: thumbW, aspectRatio: "56 / 35" };
  const handOver = atPreview && hasNext;
  return (
    <div
      data-stage-chrome="film"
      className="invisible absolute inset-x-0 bottom-0 z-30 flex justify-center px-margin pb-11 desktop:pb-12"
    >
      <div className="relative">
        <div
          className="flex items-center gap-1.5 desktop:gap-2"
          aria-hidden={handOver || undefined}
          inert={handOver || undefined}
          style={{
            opacity: handOver ? 0 : 1,
            transition: reduceMotion ? "none" : `opacity ${ease}`,
          }}
        >
          {onOpenIndex && (
            <button
              type="button"
              onClick={onOpenIndex}
              aria-label="All projects"
              aria-haspopup="dialog"
              aria-expanded={indexOpen ?? false}
              className={`${ROUND_BUTTON} mr-0.5 desktop:mr-1`}
            >
              <GridIcon />
            </button>
          )}
          {gallery.length > 1 &&
            gallery.map((item, i) => (
              <span key={item._key} className="relative flex shrink-0">
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-label={`${title}, ${i + 1} of ${gallery.length}`}
                  aria-current={i === index ? "true" : undefined}
                  className="relative shrink-0 cursor-pointer overflow-hidden rounded-[2px] bg-tertiary transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96]"
                  style={{
                    ...thumbBox,
                    opacity: i === index ? 1 : 0.6,
                    outline:
                      i === index ? "1.5px solid var(--color-primary)" : "1.5px solid transparent",
                    outlineOffset: 1.5,
                    transition: reduceMotion ? "none" : `opacity ${ease}, outline-color ${ease}`,
                  }}
                >
                  <Thumb src={thumbSrc(item)} label="" />
                </button>
                {bar && (
                  <ThumbBar look={bar} i={i} index={index} on={barOn} reduceMotion={reduceMotion} />
                )}
              </span>
            ))}
          {hasNext && (
            <button
              type="button"
              onClick={onNavigateNext}
              aria-label={`Next project: ${nextProject?.title}`}
              className="relative ml-2 shrink-0 cursor-pointer overflow-hidden rounded-[2px] bg-tertiary active:scale-[0.96] desktop:ml-3"
              style={{
                ...thumbBox,
                opacity: onEnd ? 1 : 0.6,
                transition: reduceMotion ? "none" : `opacity ${ease}`,
              }}
            >
              <Thumb src={nextSrc} label="" />
            </button>
          )}
        </div>
        {/* The hand-over (Figma "Next project · layout · 11-05", Ali picked
            A): with the next project's card centred the row gives way to one
            pill on the same axis as the name pill, its cover as a round
            thumb, then its name. */}
        {hasNext && (
          <button
            type="button"
            onClick={onNavigateNext}
            tabIndex={handOver ? 0 : -1}
            aria-hidden={!handOver}
            className={`frost-soft absolute top-1/2 left-1/2 inline-flex h-9 max-w-[calc(100vw-2*var(--grid-margin))] items-center gap-2 rounded-full pr-4 pl-1 text-sub desktop:text-body whitespace-nowrap text-primary select-none ${handOver ? "cursor-pointer" : "pointer-events-none"}`}
            style={{
              translate: "-50% -50%",
              opacity: handOver ? 1 : 0,
              scale: handOver || reduceMotion ? "1" : "0.96",
              transition: reduceMotion ? "none" : `opacity ${ease}, scale ${ease}`,
            }}
          >
            <span className="relative h-7 w-11 shrink-0 overflow-hidden rounded-full bg-tertiary">
              <Thumb src={nextSrc} label="" />
            </span>
            <span className="truncate">Next project – {nextProject?.title}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A, B and C of the clip meter, per thumbnail; they read `--clip-p` from
 * the stage root. A: a line under the current thumb. B: a line tracing the
 * current thumb's outline. C: one rail under the row, done clips full.
 */
function ThumbBar({
  look,
  i,
  index,
  on,
  reduceMotion,
}: {
  look: AutoBar;
  i: number;
  index: number;
  on: boolean;
  reduceMotion: boolean;
}) {
  const fade = reduceMotion ? "none" : "opacity 240ms cubic-bezier(0.23,1,0.32,1)";
  const fill = i < index ? "1" : i === index ? "var(--clip-p, 0)" : "0";
  if (look === "underline")
    return (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 overflow-hidden"
        style={{
          top: `calc(100% + 6px)`,
          height: BAR_PX,
          opacity: on && i === index ? 1 : 0,
          transition: fade,
        }}
      >
        <span
          className="absolute inset-0 origin-left bg-pistachio"
          style={{ transform: `scaleX(${fill})` }}
        />
      </span>
    );
  if (look === "rail")
    // The rail runs on through the 6 / 8 px gaps, so the segments read as
    // one line broken only by the gaps.
    return (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 overflow-hidden bg-tertiary"
        style={{ top: `calc(100% + 8px)`, height: BAR_PX, opacity: on ? 1 : 0, transition: fade }}
      >
        <span
          className="absolute inset-0 origin-left bg-pistachio"
          style={{ transform: `scaleX(${fill})` }}
        />
      </span>
    );
  if (look === "trace") {
    // Round the outline (it sits 1.5 px off the thumb, 1.5 px wide) from the
    // top left corner, clockwise: four edges, each filling its share of the
    // perimeter (a 56:35 thumb: 31 / 19 / 31 / 19 %).
    const o = 1.5;
    const [top, side] = [56 / 182, 35 / 182];
    const p = i < index ? "1" : "var(--clip-p, 0)";
    const edge = (from: number, len: number) => `clamp(0, (${p} - ${from}) / ${len}, 1)`;
    const line = "absolute bg-pistachio";
    return (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ inset: -o - BAR_PX / 2, opacity: on && i === index ? 1 : 0, transition: fade }}
      >
        <span
          className={`${line} inset-x-0 top-0 origin-left`}
          style={{ height: BAR_PX, transform: `scaleX(${edge(0, top)})` }}
        />
        <span
          className={`${line} inset-y-0 right-0 origin-top`}
          style={{ width: BAR_PX, transform: `scaleY(${edge(top, side)})` }}
        />
        <span
          className={`${line} inset-x-0 bottom-0 origin-right`}
          style={{ height: BAR_PX, transform: `scaleX(${edge(top + side, top)})` }}
        />
        <span
          className={`${line} inset-y-0 left-0 origin-bottom`}
          style={{ width: BAR_PX, transform: `scaleY(${edge(2 * top + side, side)})` }}
        />
      </span>
    );
  }
  return null;
}
