/**
 * Where a project page's first media lands, per page kind and breakpoint.
 *
 * Project → project carries the next-project preview into that landing
 * rect across the route swap (ProjectPageClient.navigateNext), so the
 * preview block on the leaving page must already have the next page's
 * landing shape, and the slide must stop where that page's slot will be.
 * There are three landing shapes today:
 *
 * - chapters (a project with `chapters[]`, every breakpoint): a 16:10 box
 *   in the hero, eight columns on a laptop (which side per `heroLayout`
 *   or the slug hash), full width on a phone.
 * - gallery (laptop, no chapters): the first item of the right-hand
 *   gallery column, flush with the top of <main>.
 * - stage (phone, no chapters): the first card of the strip, centred
 *   in the viewport under the title block; its top depends on that layout,
 *   so there is nothing to slide to and the clone settles onto it instead.
 */

export type LandingKind = "chapters" | "gallery" | "stage";

export function landingKind(hasChapters: boolean | null | undefined, isDesktop: boolean): LandingKind {
  if (hasChapters) return "chapters";
  return isDesktop ? "gallery" : "stage";
}

/**
 * The landing box ratio before the media reports its own: the flush laptop
 * covers are 16:10 everywhere. Gallery items and stage cards then take the
 * ratio of their image (Sanity dimensions) or video (loadedmetadata), so a
 * clip is never cropped (mediaAspect below).
 */
export const LANDING_ASPECT: Record<LandingKind, number> = {
  chapters: 16 / 10,
  gallery: 16 / 10,
  stage: 16 / 10,
};

/** Width / height of a Sanity image with dimensions metadata, else null. */
export function imageAspect(
  image: { asset?: { metadata?: { dimensions?: { width?: number | null; height?: number | null } | null } | null } | null } | null | undefined,
): number | null {
  const d = image?.asset?.metadata?.dimensions;
  return d?.width && d?.height ? d.width / d.height : null;
}

/** Width / height of a video element once it knows its size, else null. */
export function videoAspect(video: HTMLVideoElement | null | undefined): number | null {
  return video?.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : null;
}

/**
 * Top padding of the chapter page's hero section (ProjectChapters renders
 * `pt-2 desktop:pt-6`); the gallery column has none. Keep in step.
 */
export const HERO_TOP = { desktop: 24, phone: 8 } as const;

/**
 * Document offset of the next page's landing media, or null when it cannot
 * be known before that page mounts (the stage).
 */
export function landingTop(kind: LandingKind, isDesktop: boolean): number | null {
  if (typeof document === "undefined") return null;
  const main = document.querySelector("main");
  if (!main) return null;
  const mainTop = main.getBoundingClientRect().top + window.scrollY;
  switch (kind) {
    case "chapters":
      return mainTop + (isDesktop ? HERO_TOP.desktop : HERO_TOP.phone);
    case "gallery":
      return mainTop;
    case "stage":
      return null;
  }
}

// Hero variants (laptop, 12 columns): the landing media takes eight columns,
// the text block the four beside it. Which side is chosen in Sanity
// (heroLayout) or fixed by the slug hash, so a page never changes.
export const HERO_VARIANTS = {
  "media-right": { media: "desktop:col-start-5 desktop:col-end-13", text: "desktop:col-start-1 desktop:col-end-5" },
  "media-left": { media: "desktop:col-start-1 desktop:col-end-9", text: "desktop:col-start-9 desktop:col-end-13" },
} as const;
export type HeroVariant = keyof typeof HERO_VARIANTS;

export function heroVariant(slug: string, chosen?: string | null): HeroVariant {
  if (chosen === "media-right" || chosen === "media-left") return chosen;
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return hash % 2 === 0 ? "media-right" : "media-left";
}
