import type { BarData } from "@/sanity/lib/bar";

/**
 * One window for Work and About (Ali, 11-17): the same size whichever is
 * open and whatever the text, so nothing grows. The height is Work's, worked
 * out from its parts so About can take it without Work being on screen:
 *  phone  = the 16:9 preview (capsule width less 2x16 margin) + 8 + three
 *           12/16 lines (48) + 24 + the list + 12 bottom
 *  laptop = the 16:10 preview (8 of 12 columns in the 64rem capsule, 403)
 *           + 8 + four 16/24 lines (96) + 32 bottom, or the list if longer
 * and never past --panel-max (the screen less the capsule's row).
 */
export function panelSize(bar: BarData) {
  // Quiet (Ali 11-18): every name, project or post, is one 16/24 line on a
  // phone and one 18/28 line on a laptop; a label is 12/16 plus 8 below.
  const count = bar.projects.length + bar.posts.length;
  const phone = `calc((100vw - 64px) * 9 / 16 + ${8 + 48 + 24 + 12 + 24 + (bar.posts.length ? 40 : 0) + 24 * count}px)`;
  const laptop = `${Math.ceil(Math.max(403.34 + 8 + 96 + 32, 32 + 24 + (bar.posts.length ? 56 : 0) + 28 * count))}px`;
  return { "--panel-h": phone, "--panel-h-desk": laptop } as Record<string, string>;
}
export const PANEL_H =
  "h-[min(var(--panel-h),var(--panel-max))] desktop:h-[min(var(--panel-h-desk),var(--panel-max))]";
