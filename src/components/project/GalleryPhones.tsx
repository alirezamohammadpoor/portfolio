"use client";

import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import PhonesRow from "@/components/PhonesRow";
import type { ResolvedFrame } from "@/lib/mediaFrame";

type GalleryItem = NonNullable<NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>["gallery"]>[number];
export type GalleryPhonesItem = Extract<GalleryItem, { _type: "galleryPhones" }>;

/**
 * A gallery row of phone screens side by side on the page background (Ali,
 * 11-02): e.g. a product page still next to a menu clip. Each screen keeps
 * the phone's own ratio, so the row has its height before anything loads,
 * and the clip never carries a recorded backdrop: the row's background comes
 * from Sanity (none: the page shows through).
 */
export default function GalleryPhones({
  item,
  frame,
  title,
  active,
  sizes,
}: {
  item: GalleryPhonesItem;
  frame: ResolvedFrame;
  title: string;
  /** false under the transition clone: paused, no observer. */
  active: boolean;
  sizes: string;
}) {
  return <PhonesRow slots={item.phones ?? []} frame={frame} title={title} active={active} sizes={sizes} />;
}
