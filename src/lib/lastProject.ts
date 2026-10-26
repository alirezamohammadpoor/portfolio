/**
 * The project the visitor was on most recently. Home opens on it when they
 * come back (header name, browser back), so the gallery continues from where
 * they were instead of snapping to the first project. In memory only: a
 * reload is a fresh visit and starts at the top.
 */
let lastSlug: string | null = null;

export function rememberProject(slug: string | null | undefined) {
  if (slug) lastSlug = slug;
}

export function lastProjectSlug() {
  return lastSlug;
}
