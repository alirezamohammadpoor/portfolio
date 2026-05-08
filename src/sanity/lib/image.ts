import createImageUrlBuilder from '@sanity/image-url'
import { SanityImageSource } from "@sanity/image-url/lib/types/types";

import { dataset, projectId } from '../env'

// https://www.sanity.io/docs/image-url
const builder = createImageUrlBuilder({ projectId, dataset })

export const urlFor = (source: SanityImageSource) => {
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
 * OpenGraph image URL — fixed 1200x630 with quality 85, the standard
 * og:image dimensions used in route-level generateMetadata.
 */
export const ogImageUrl = (source: SanityImageSource): string =>
  urlFor(source).width(1200).height(630).quality(85).url();

export function fileUrl(ref: string): string {
  const [, id, ext] = ref.split('-');
  return `https://cdn.sanity.io/files/${projectId}/${dataset}/${id}.${ext}`;
}
