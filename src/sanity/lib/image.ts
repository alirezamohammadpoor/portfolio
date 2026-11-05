import createImageUrlBuilder from '@sanity/image-url'
import { SanityImageSource } from "@sanity/image-url/lib/types/types";

import { dataset, projectId } from '../env'

// https://www.sanity.io/docs/image-url
const builder = createImageUrlBuilder({ projectId, dataset })

// Internal — call sites should use `imageUrl()` or `ogImageUrl()` below
// rather than chaining urlFor directly. Keeps the 85-quality default
// in one place and avoids drift across the codebase.
const urlFor = (source: SanityImageSource) => {
  return builder.image(source)
}

/**
 * Standard Sanity image URL with our default quality (85).
 * Replaces the repeated `urlFor(x).width(N).quality(85).url()` chain
 * that lived at 13 call sites — single place to tune quality policy.
 */
export const imageUrl = (
  source: SanityImageSource,
  width: number,
  quality = 85,
): string => urlFor(source).width(width).quality(quality).url();

/**
 * A crop to exactly `width` × `height`: with both set, the builder cuts the
 * image around its hotspot (inside the editor's crop) to the target ratio.
 */
export const cropImageUrl = (source: SanityImageSource, width: number, height: number): string =>
  urlFor(source).width(width).height(height).quality(85).url();

/**
 * OpenGraph image URL — fixed 1200x630 with quality 85, the standard
 * og:image dimensions used in route-level generateMetadata.
 */
export const ogImageUrl = (source: SanityImageSource): string => cropImageUrl(source, 1200, 630);

type HotspotImage = {
  hotspot?: { x?: number; y?: number } | null;
  crop?: { top?: number; bottom?: number; left?: number; right?: number } | null;
} | null | undefined;

/**
 * `object-position` for an object-cover <Image> of a Sanity image: the
 * editor's hotspot, as a point of the served file (the builder already cuts
 * the editor's crop out of it, so the hotspot is re-based inside that crop).
 * A box of another ratio then keeps the face where the Studio preview shows
 * it instead of the middle of the image. Undefined without a hotspot.
 */
export function hotspotPosition(img: HotspotImage): string | undefined {
  const h = img?.hotspot;
  if (!h || h.x == null || h.y == null) return undefined;
  const c = img?.crop ?? {};
  const left = c.left ?? 0;
  const top = c.top ?? 0;
  const spanX = Math.max(1 - left - (c.right ?? 0), 0.01);
  const spanY = Math.max(1 - top - (c.bottom ?? 0), 0.01);
  const pct = (v: number) => `${(Math.min(1, Math.max(0, v)) * 100).toFixed(1)}%`;
  return `${pct((h.x - left) / spanX)} ${pct((h.y - top) / spanY)}`;
}

export function fileUrl(ref: string): string {
  const [, id, ext] = ref.split('-');
  return `https://cdn.sanity.io/files/${projectId}/${dataset}/${id}.${ext}`;
}
