"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

/** The subset of a gallery item the preload needs. */
export interface PreloadableMedia {
  _type: "galleryImage" | "galleryVideo";
  image?: { asset?: unknown } | null;
  video?: { asset?: { _ref?: string | null } | null } | null;
}

/**
 * Give a project route a head start: prefetch its RSC payload and preload
 * its first gallery media, so the clone morph onto that page lands on a
 * painted box instead of a black one. Used by the home gallery for the
 * active slide and by the project page for the next project.
 */
export function usePrefetchProject(
  slug: string | null | undefined,
  firstMedia: PreloadableMedia | null | undefined,
) {
  const router = useRouter();

  useEffect(() => {
    if (!slug) return;
    router.prefetch(`/project/${slug}`);

    let href: string | null = null;
    let asAttr: "image" | "video" | null = null;

    if (firstMedia?._type === "galleryImage" && firstMedia.image?.asset) {
      href = imageUrl(firstMedia.image as SanityImageSource, 1200);
      asAttr = "image";
    } else if (firstMedia?._type === "galleryVideo" && firstMedia.video?.asset?._ref) {
      href = fileUrl(firstMedia.video.asset._ref);
      asAttr = "video";
    }

    if (!href || !asAttr) return;

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = asAttr;
    link.href = href;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [slug, firstMedia, router]);
}
