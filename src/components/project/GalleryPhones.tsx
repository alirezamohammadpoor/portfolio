"use client";

import Image from "next/image";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import InlineClip from "@/components/project/InlineClip";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";

type GalleryItem = NonNullable<NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>["gallery"]>[number];
export type GalleryPhonesItem = Extract<GalleryItem, { _type: "galleryPhones" }>;

/**
 * A gallery row of phone screens side by side on the page background (Ali,
 * 11-02): e.g. a product page still next to a menu clip. Each screen keeps
 * the phone's own ratio, so the row has its height before anything loads,
 * and the clip never carries a recorded backdrop.
 */
export default function GalleryPhones({
  item,
  title,
  active,
  sizes,
}: {
  item: GalleryPhonesItem;
  title: string;
  /** false under the transition clone: paused, no observer. */
  active: boolean;
  sizes: string;
}) {
  const slots = (item.phones ?? []).slice(0, 3);
  return (
    <div className="flex w-full justify-center gap-2 desktop:gap-4">
      {slots.map((slot, i) => (
        <div
          key={slot._key ?? i}
          className="relative aspect-[390/844] min-w-0 flex-1 overflow-hidden rounded-[18px] bg-tertiary/40 desktop:rounded-[28px]"
        >
          {slot.type === "video" && slot.video?.asset?._ref ? (
            <InlineClip
              src={fileUrl(slot.video.asset._ref)}
              poster={slot.poster?.asset ? imageUrl(slot.poster, 800) : undefined}
              label={`${title}, screen ${i + 1}`}
              active={active}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          ) : slot.type === "image" && slot.image?.asset ? (
            <Image
              src={imageUrl(slot.image, 800)}
              alt={`${title}, screen ${i + 1}`}
              fill
              className="object-cover object-top"
              sizes={sizes}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
