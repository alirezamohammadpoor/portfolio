import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { imageUrl } from "@/sanity/lib/image";
import type { ResolvedFrame } from "@/lib/mediaFrame";

/** Rounded screen corners for phone recordings (no device frame). */
export const PHONE_RADIUS = "rounded-[18px] desktop:rounded-[28px]";

/**
 * The background a media item sits on: its colour, with an optional image
 * over it at reduced opacity. Drawn by the page, never recorded into the clip.
 */
export function FrameBackground({ background, sizes = "100vw" }: { background: NonNullable<ResolvedFrame["background"]>; sizes?: string }) {
  return background.image ? (
    <Image
      src={imageUrl(background.image as Parameters<typeof imageUrl>[0], 2000)}
      alt=""
      fill
      className="object-cover"
      style={{ opacity: background.imageOpacity }}
      sizes={sizes}
    />
  ) : null;
}

export const backgroundStyle = (frame: ResolvedFrame): CSSProperties | undefined =>
  frame.background?.colour ? { backgroundColor: frame.background.colour } : undefined;

/**
 * One media item in its box. Flush: the box takes the media's ratio and the
 * media fills it. Laptop: same box ratio, the media inset on its background
 * at `size` % of the width. Phone: a 4:5 box with the recording standing
 * centred at `size` % of the height, rounded, no device frame (Pritch-style
 * tiles). `children` fill the media box (absolute, inset 0).
 */
export default function MediaFrame({
  frame,
  mediaAspect,
  className = "",
  boxClassName = "",
  sizes,
  children,
}: {
  frame: ResolvedFrame;
  /** Width / height of the recording or image. */
  mediaAspect: number;
  className?: string;
  /** Extra classes on the media box (e.g. a placeholder fill). */
  boxClassName?: string;
  sizes?: string;
  children: ReactNode;
}) {
  if (frame.fit === "flush") {
    return (
      <div className={`relative w-full overflow-hidden ${boxClassName} ${className}`} style={{ aspectRatio: mediaAspect, ...backgroundStyle(frame) }}>
        {children}
      </div>
    );
  }

  const phone = frame.fit === "phone";
  const inner: CSSProperties = phone
    ? { height: `${frame.size}%`, aspectRatio: mediaAspect }
    : { width: `${frame.size}%`, aspectRatio: mediaAspect };

  return (
    <div
      className={`relative flex w-full items-center justify-center overflow-hidden ${className}`}
      style={{ aspectRatio: phone ? 4 / 5 : mediaAspect, ...backgroundStyle(frame) }}
    >
      {frame.background && <FrameBackground background={frame.background} sizes={sizes} />}
      <div className={`relative overflow-hidden ${phone ? PHONE_RADIUS : ""} ${boxClassName}`} style={inner}>
        {children}
      </div>
    </div>
  );
}
