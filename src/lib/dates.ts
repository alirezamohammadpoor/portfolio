/**
 * A post's date, the same string on the server and in the browser. The
 * server runs in UTC and a visitor's browser in their own zone, so a bare
 * `toLocaleDateString` could render two different days for a post published
 * late in the evening (hydration mismatch, and the date flips on screen).
 * Dates are pinned to Stockholm, where the posts are written.
 */
const formatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Europe/Stockholm",
});

export function formatPostDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : formatter.format(d);
}
