"use client";

import Image from "next/image";
import type { RefObject } from "react";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import { EASE_OUT_CSS } from "@/lib/motion";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
type GalleryItem = NonNullable<Project["gallery"]>[number];
type NextProject = Project["nextProject"];

type Props = {
  gallery: GalleryItem[];
  index: number;
  onEnd: boolean;
  nextProject: NextProject;
  title: string;
  isDesktop: boolean;
  reduceMotion: boolean;
  rootRef?: RefObject<HTMLDivElement | null>;
  onSelect: (i: number) => void;
  onNavigateNext?: () => void;
};

/**
 * The gallery's progress (Figma "Gallery · progress ideas", 11-04, Ali picked
 * F): a filmstrip of tiny thumbnails at the bottom centre, the current one
 * outlined, the next project's cover last with its name once you reach the
 * last clip. Every thumbnail jumps to its clip; the last one hands off.
 */
export default function GalleryProgress(props: Props) {
  return <Filmstrip {...props} />;
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
  const hasNext = Boolean(nextProject?.slug?.current && onNavigateNext);
  // Laptop (Figma "Gallery · next alignment · 11-04", Ali picked B): one
  // pistachio block on the filmstrip row, the next cover inside it on the
  // left, ending on the page margin in column 12. Dimmed until the last
  // clip is centred, like the thumbnails.
  const deskNext = hasNext ? (
    <button
      type="button"
      onClick={onNavigateNext}
      aria-label={`Next project: ${nextProject?.title}`}
      className="frost-soft col-start-10 col-end-13 row-start-1 inline-flex h-[35px] cursor-pointer items-center gap-2.5 justify-self-end rounded-[8px] py-1 pr-3.5 pl-1 text-sub text-primary whitespace-nowrap transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] select-none active:scale-[0.97]"
      style={{ opacity: onEnd ? 1 : 0.6, transition: reduceMotion ? "none" : `opacity 200ms ${EASE_OUT_CSS}, scale 160ms ${EASE_OUT_CSS}` }}
    >
      <span className="relative h-[27px] w-[43px] shrink-0 overflow-hidden rounded-[4px] bg-tertiary">
        <Thumb src={nextSrc} label="" />
      </span>
      Next – {nextProject?.title}
    </button>
  ) : null;
  const phoneNext = hasNext ? (
    <div className="relative ml-2 flex flex-col items-center">
      <button
        type="button"
        onClick={onNavigateNext}
        aria-label={`Next project: ${nextProject?.title}`}
        className="relative shrink-0 cursor-pointer overflow-hidden rounded-[2px] bg-tertiary active:scale-[0.96]"
        style={{ width: w, height: h, opacity: onEnd ? 1 : 0.6, transition: fade }}
      >
        <Thumb src={nextSrc} label="" />
      </button>
      {/* The hand-off as a pistachio frost pill once the last clip is centred. */}
      <button
        type="button"
        onClick={onNavigateNext}
        tabIndex={onEnd ? 0 : -1}
        aria-hidden={!onEnd}
        className={`frost-soft absolute top-full right-0 mt-2 inline-flex h-7 items-center whitespace-nowrap rounded-full px-3 text-sub text-primary transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] select-none active:scale-[0.97] ${onEnd ? "cursor-pointer" : "pointer-events-none"}`}
        style={{ opacity: onEnd ? 1 : 0, transition: reduceMotion ? "none" : `opacity 200ms ${EASE_OUT_CSS}, scale 160ms ${EASE_OUT_CSS}` }}
      >
        Next – {nextProject?.title}
      </button>
    </div>
  ) : null;
  return (
    // Laptop: the thumbnails stay centred on the page, the next project sits
    // on the grid at the right. Phone keeps it right after the thumbnails
    // (four columns leave no room for both).
    <div
      ref={rootRef}
      data-stage-chrome="film"
      className={`invisible absolute inset-x-0 bottom-0 z-30 pb-11 desktop:pb-12 ${isDesktop ? "grid-site items-center px-margin" : "flex justify-center px-margin"}`}
    >
      <div className={`flex items-center gap-1.5 desktop:gap-2 ${isDesktop ? "col-span-full row-start-1 justify-self-center" : ""}`}>
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
                opacity: i === index ? 1 : 0.6,
                outline: i === index ? "1.5px solid var(--color-primary)" : "1.5px solid transparent",
                outlineOffset: 1.5,
                transition: reduceMotion ? "none" : `opacity 200ms ${EASE_OUT_CSS}, outline-color 200ms ${EASE_OUT_CSS}`,
              }}
            >
              <Thumb src={thumbSrc(item)} label="" />
            </button>
          ))}
        {!isDesktop && phoneNext}
      </div>
      {isDesktop && deskNext}
    </div>
  );
}

