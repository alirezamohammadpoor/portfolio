// Single source of truth for the public site URL. Production reads
// NEXT_PUBLIC_SITE_URL from the deployment environment; local builds
// fall through to the alirezamp.com canonical.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://alirezamp.com";
