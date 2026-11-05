// Single source of truth for the public site URL. Production reads
// NEXT_PUBLIC_SITE_URL from the deployment environment; local builds
// fall through to the alirezamp.com canonical.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://alirezamp.com";

export const SITE_NAME = "Ali Reza Mohammad Poor";

/**
 * Spread into every page-level `openGraph`. Next replaces nested metadata
 * objects rather than merging them, so a page that sets its own openGraph
 * drops the layout's siteName and locale unless it repeats them.
 */
export const OPEN_GRAPH_BASE = {
  siteName: SITE_NAME,
  locale: "en_US",
} as const;

/**
 * The site-wide share image (src/app/opengraph-image.tsx), for pages that
 * have no image of their own. Never put it in OPEN_GRAPH_BASE: the project
 * and journal pages spread that, and an `images` key there would hide the
 * per-page image their own routes generate.
 */
export const SITE_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Ali Reza Mohammad Poor — Developer",
} as const;
