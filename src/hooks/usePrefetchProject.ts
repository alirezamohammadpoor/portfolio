"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getImageProps } from "next/image";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

/** The subset of a gallery item the preload needs. */
export interface PreloadableMedia {
  _type: "galleryImage" | "galleryVideo";
  image?: { asset?: unknown } | null;
  video?: { asset?: { _ref?: string | null } | null } | null;
}

/** The landing item's `sizes` (ProjectGallery and ProjectStage agree). */
const LANDING_SIZES = "(min-width: 75rem) 50vw, 100vw";

/**
 * Give a project route a head start: prefetch its RSC payload and preload
 * its first gallery media, so the clone morph onto that page lands on a
 * painted box instead of a black one. Used by the home gallery for the
 * active slide and by the project page for the next project.
 *
 * The image preload carries the same srcset and sizes next/image will
 * render for the landing item, so the browser picks the very URL it is
 * about to request; a bare `href` of the source URL would download a file
 * the <Image> never uses. `as="video"` is not a preload destination, so the
 * video goes out as a prefetch, which the media element then serves from
 * cache.
 */
export function usePrefetchProject(
  slug: string | null | undefined,
  firstMedia: PreloadableMedia | null | undefined,
) {
  const router = useRouter();

  useEffect(() => {
    if (!slug) return;
    router.prefetch(`/project/${slug}`);

    const link = document.createElement("link");
    if (firstMedia?._type === "galleryImage" && firstMedia.image?.asset) {
      const { props } = getImageProps({
        src: imageUrl(firstMedia.image as SanityImageSource, 1200),
        alt: "",
        fill: true,
        sizes: LANDING_SIZES,
      });
      link.rel = "preload";
      link.as = "image";
      link.href = props.src;
      if (props.srcSet) link.setAttribute("imagesrcset", props.srcSet);
      if (props.sizes) link.setAttribute("imagesizes", props.sizes);
    } else if (firstMedia?._type === "galleryVideo" && firstMedia.video?.asset?._ref) {
      link.rel = "prefetch";
      link.href = fileUrl(firstMedia.video.asset._ref);
    } else {
      return;
    }

    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [slug, firstMedia, router]);
}
