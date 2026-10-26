"use client";

import type { ImageLoaderProps } from "next/image";

/**
 * next/image loader for the Sanity CDN. The CDN already resizes and
 * re-encodes on request, so each srcset candidate points straight at it
 * instead of routing the (already resized) file through Vercel Image
 * Optimization a second time. Sources from other hosts (Spotify album art)
 * are returned as they are.
 */
export default function sanityImageLoader({ src, width, quality }: ImageLoaderProps): string {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  if (url.hostname !== "cdn.sanity.io") return src;
  const params = url.searchParams;
  const w = Number(params.get("w"));
  const h = Number(params.get("h"));
  if (w && h) params.set("h", String(Math.round((h / w) * width)));
  params.set("w", String(width));
  params.set("q", String(quality ?? (Number(params.get("q")) || 85)));
  params.set("auto", "format");
  if (!params.has("fit")) params.set("fit", "max");
  return url.toString();
}
