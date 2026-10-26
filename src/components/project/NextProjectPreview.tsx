"use client";

import type { RefObject } from "react";
import Image from "next/image";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";

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
  const label = `Next project — ${nextProject.title ?? ""}`;

  return (
    <a
      href={`/project/${slug}`}
      aria-label={label}
      className={`block ${className}`}
      style={style}
      onClick={(e) => {
        e.preventDefault();
        onNavigate();
      }}
    >
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
        {!isImage && media.video?.asset?._ref && (
          <video
            src={fileUrl(media.video.asset._ref)}
            className="h-full w-full object-cover"
            aria-hidden="true"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        )}
      </div>
      <p className="mt-2 text-sub uppercase text-primary">{label}</p>
    </a>
  );
}
