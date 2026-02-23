import createImageUrlBuilder from '@sanity/image-url'
import { SanityImageSource } from "@sanity/image-url/lib/types/types";

import { dataset, projectId } from '../env'

// https://www.sanity.io/docs/image-url
const builder = createImageUrlBuilder({ projectId, dataset })

export const urlFor = (source: SanityImageSource) => {
  return builder.image(source)
}

export function fileUrl(ref: string): string {
  const [, id, ext] = ref.split('-');
  return `https://cdn.sanity.io/files/${projectId}/${dataset}/${id}.${ext}`;
}
