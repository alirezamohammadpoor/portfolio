"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getImageProps } from "next/image";
import { imageUrl } from "@/sanity/lib/image";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

/** The subset of a gallery item the preload needs. */
export interface PreloadableMedia {
  _type: "galleryImage" | "galleryVideo";
  image?: { asset?: unknown } | null;
  video?: { asset?: { _ref?: string | null } | null } | null;
}

/**
 * Give a project route a head start: prefetch its RSC payload and preload
 * its first gallery image, so the clone morph onto that page lands on a
 * painted box instead of a black one. Used by the project page for the
 * next project.
 *
 * The image preload carries the same srcset and the `sizes` the landing
 * item renders with (lib/landing.ts LANDING_SIZES), so the browser picks
 * the very URL it is about to request; a bare `href` of the source URL
 * would download a file the <Image> never uses. A video is not warmed:
 * `<link rel="prefetch">` downloads the whole file in Chromium (tens of MB
 * on mobile data) and does nothing in Safari, and the next-project preview
 * already plays that clip on this page.
 */
export function usePrefetchProject(
  slug: string | null | undefined,
  firstMedia: PreloadableMedia | null | undefined,
  sizes: string,
) {
  const router = useRouter();

  useEffect(() => {
    if (!slug) return;
    router.prefetch(`/project/${slug}`);
    if (firstMedia?._type !== "galleryImage" || !firstMedia.image?.asset) return;

    const { props } = getImageProps({
      src: imageUrl(firstMedia.image as SanityImageSource, 1200),
      alt: "",
      fill: true,
      sizes,
    });
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = props.src;
    if (props.srcSet) link.setAttribute("imagesrcset", props.srcSet);
    if (props.sizes) link.setAttribute("imagesizes", props.sizes);
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [slug, firstMedia, sizes, router]);
}
