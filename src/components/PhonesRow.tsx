"use client";

import Image from "next/image";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import InlineClip from "@/components/project/InlineClip";
import { FrameBackground, PHONE_RADIUS, backgroundStyle } from "@/components/MediaFrame";
import { FRAME_PRESET, type ResolvedFrame } from "@/lib/mediaFrame";

type SanityImage = Parameters<typeof imageUrl>[0];

export type PhoneSlot = {
  _key?: string | null;
  type?: string | null;
  video?: { asset?: { _ref?: string } | null } | null;
  poster?: ({ asset?: unknown } & object) | null;
  image?: ({ asset?: unknown } & object) | null;
};

export const PHONE_ASPECT = 390 / 844;

/**
 * One to three phone screens side by side, each a still or a silent clip at
 * the phone's own ratio with rounded corners, no device frame. Used by the
 * gallery's phones row and the chapter "phones" media.
 *
 * No background: the screens share the row at full width on the page.
 * With a background (Sanity, per item or the project default): a 16:10 panel
 * in that colour (and image), the screens standing centred at `size` % of
 * its height (88 by default).
 */
export default function PhonesRow({
  slots,
  frame,
  title,
  active,
  sizes,
}: {
  slots: PhoneSlot[];
  frame: ResolvedFrame;
  title: string;
  active: boolean;
  sizes: string;
}) {
  const list = slots.slice(0, 3);
  if (list.length === 0) return null;
  const size = frame.fit === "flush" ? FRAME_PRESET.phone : frame.size;

  const screens = list.map((slot, i) => (
    <div
      key={slot._key ?? i}
      className={`relative overflow-hidden bg-tertiary/40 ${PHONE_RADIUS} ${frame.background ? "flex-none" : "min-w-0 flex-1"}`}
      style={
        frame.background
          ? { height: `${size}%`, aspectRatio: PHONE_ASPECT }
          : // A lone screen on the page would take the whole row and tower over
            // the viewport: it is held to about 70 % of the viewport's height.
            { aspectRatio: PHONE_ASPECT, maxWidth: list.length === 1 ? `calc(70svh * ${PHONE_ASPECT.toFixed(4)})` : undefined }
      }
    >
      {slot.type === "video" && slot.video?.asset?._ref ? (
        <InlineClip
          src={fileUrl(slot.video.asset._ref)}
          poster={slot.poster?.asset ? imageUrl(slot.poster as SanityImage, 800) : undefined}
          label={`${title}, screen ${i + 1}`}
          active={active}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : slot.type === "image" && slot.image?.asset ? (
        <Image
          src={imageUrl(slot.image as SanityImage, 800)}
          alt={`${title}, screen ${i + 1}`}
          fill
          className="object-cover object-top"
          sizes={sizes}
        />
      ) : null}
    </div>
  ));

  if (!frame.background) {
    return <div className="flex w-full justify-center gap-2 desktop:gap-4">{screens}</div>;
  }

  return (
    <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden" style={backgroundStyle(frame)}>
      <FrameBackground background={frame.background} />
      <div className="absolute inset-0 flex items-center justify-center gap-3 desktop:gap-8">{screens}</div>
    </div>
  );
}
