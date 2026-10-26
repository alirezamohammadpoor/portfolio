"use client";

import { useEffect, useRef, type RefObject } from "react";
import Image from "next/image";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import { isPlainLeftClick } from "@/lib/clicks";

export type NextProject = NonNullable<NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>["nextProject"]>;

interface NextProjectPreviewProps {
  nextProject: NextProject;
  /** The block's root: its media rect is the source of the clone morph. */
  previewRef?: RefObject<HTMLDivElement | null>;
  /** Fired on click instead of a plain navigation. */
  onNavigate: () => void;
  /** Image width hint for the Sanity URL (desktop 1200, stage 900). */
  imageWidth?: number;
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * The preview's <video> is created and owned here, imperatively, not by
 * React. The project → project transition moves that element out of this
 * block (into the clone, then into the next page's first item, see
 * adoptVideo.ts), and this page stays mounted in a hidden Activity while the
 * next one is up. Were React the owner it would still believe the element
 * is here: a later prop update would hit a detached node, and on browser
 * back the preview box would stay empty. Owning it here, each time the page
 * shows (effects run again on return) a missing element is simply re-created.
 */
function PreviewVideo({ src, hostRef }: { src: string; hostRef?: RefObject<HTMLDivElement | null> }) {
  const localRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = localRef.current;
    if (!host) return;
    let video = host.querySelector("video");
    if (!video) {
      video = document.createElement("video");
      video.src = src;
      video.className = "h-full w-full object-cover";
      video.setAttribute("aria-hidden", "true");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      host.appendChild(video);
    }
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
    return () => {
      // Only ours to pause while it is still here; once carried away by the
      // transition it belongs to the clone and then to the landing page.
      if (video && video.parentElement === host) video.pause();
    };
  }, [src]);
  return (
    <div
      ref={(el) => {
        localRef.current = el;
        if (hostRef) hostRef.current = el;
      }}
      data-next-project-preview
      className="relative w-full overflow-hidden bg-black"
      style={{ aspectRatio: 4 / 3 }}
    />
  );
}

/**
 * The next project's first gallery media at the end of the current gallery.
 * Looks like one more gallery item (4:3, object-cover) because it is the
 * morph source for the project → project transition: scrolling or tapping
 * past it carries this exact box up into the first-item slot of the next
 * page. A real link underneath, so it works without JS and for crawlers.
 */
export default function NextProjectPreview({
  nextProject,
  previewRef,
  onNavigate,
  imageWidth = 1200,
  sizes = "(min-width: 75rem) 50vw, 100vw",
  className = "",
  style,
}: NextProjectPreviewProps) {
  const slug = nextProject.slug?.current;
  const media = nextProject.firstMedia;
  if (!slug || !media) return null;

  const isImage = media._type === "galleryImage";
  const videoSrc = !isImage && media.video?.asset?._ref ? fileUrl(media.video.asset._ref) : null;
  const label = `Next project — ${nextProject.title ?? ""}`;

  return (
    <a
      href={`/project/${slug}`}
      aria-label={label}
      className={`block ${className}`}
      style={style}
      onClick={(e) => {
        if (!isPlainLeftClick(e)) return;
        e.preventDefault();
        onNavigate();
      }}
    >
      {videoSrc ? (
        <PreviewVideo src={videoSrc} hostRef={previewRef} />
      ) : (
        <div
          ref={previewRef}
          data-next-project-preview
          className="relative w-full overflow-hidden bg-black"
          style={{ aspectRatio: 4 / 3 }}
        >
          {isImage && media.image?.asset && (
            <Image
              src={imageUrl(media.image, imageWidth)}
              alt=""
              fill
              className="object-cover"
              sizes={sizes}
            />
          )}
        </div>
      )}
      <p className="mt-2 text-sub uppercase text-primary">{label}</p>
    </a>
  );
}
