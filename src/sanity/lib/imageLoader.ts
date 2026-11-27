"use client";

import type { ImageLoaderProps } from "next/image";
import { sanityLoaderUrl } from "./sanityLoaderUrl";

/**
 * next/image loader for the Sanity CDN. The CDN already resizes and
 * re-encodes on request, so each srcset candidate points straight at it
 * instead of routing the (already resized) file through Vercel Image
 * Optimization a second time. Sources from other hosts (Spotify album art)
 * are returned as they are.
 */
export default function sanityImageLoader(props: ImageLoaderProps): string {
  return sanityLoaderUrl(props);
}
