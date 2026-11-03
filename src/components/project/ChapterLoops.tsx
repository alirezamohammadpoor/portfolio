"use client";

/**
 * Chapter media made of short loops (Henriksson pilot, 11-03, Pritch grammar):
 *
 * Bento: rows of one or two loops side by side at the same height, 2 px
 * apart. A laptop loop is a flush 16:10 box; a phone loop stands centred in a
 * 4:5 box (MediaFrame "phone" fit), on its background from Sanity or on the
 * page. Each tile's width follows its box ratio, so a row of laptop + phone
 * is about 2:1.
 *
 * Carousel: steps shown one at a time in the same box. A clip plays through
 * once, then the next step follows; a still holds for STILL_MS. The step
 * labels under the box jump to a step. Every step stays mounted in one grid
 * cell, so switching never shifts the page.
 */

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import InlineClip from "@/components/project/InlineClip";
import MediaFrame from "@/components/MediaFrame";
import { resolveFrame, type FrameInput, type ProjectFrameSource, type ResolvedFrame } from "@/lib/mediaFrame";

type SanityImage = Parameters<typeof imageUrl>[0];

export type LoopTile = {
  _key?: string | null;
  type?: string | null;
  device?: string | null;
  label?: string | null;
  video?: { asset?: { _ref?: string } | null } | null;
  poster?: ({ asset?: unknown } & object) | null;
  image?: ({ asset?: { metadata?: { dimensions?: { width?: number | null; height?: number | null } | null } | null } | null } & object) | null;
  frame?: FrameInput;
};

const DEVICE_ASPECT = { laptop: 16 / 10, phone: 390 / 844 } as const;
const STILL_MS = 4000;

function mediaAspect(tile: LoopTile) {
  if (tile.type === "image") {
    const d = tile.image?.asset?.metadata?.dimensions;
    if (d?.width && d?.height) return d.width / d.height;
  }
  return tile.device === "phone" ? DEVICE_ASPECT.phone : DEVICE_ASPECT.laptop;
}

/** The ratio of the box the tile takes in its row (a phone fit is a 4:5 box). */
function boxAspect(frame: ResolvedFrame, aspect: number) {
  return frame.fit === "phone" ? 4 / 5 : aspect;
}

function frameOf(tile: LoopTile, source: ProjectFrameSource) {
  return resolveFrame(tile.frame, source, tile.device === "phone" ? "portrait" : "landscape");
}

function TileMedia({
  tile,
  title,
  active,
  sizes,
  loop = true,
  onEnded,
}: {
  tile: LoopTile;
  title: string;
  active: boolean;
  sizes: string;
  loop?: boolean;
  onEnded?: () => void;
}) {
  if (tile.type === "video" && tile.video?.asset?._ref) {
    return (
      <InlineClip
        src={fileUrl(tile.video.asset._ref)}
        poster={tile.poster?.asset ? imageUrl(tile.poster as SanityImage, 1600) : undefined}
        label={tile.label ? `${title}: ${tile.label}` : title}
        active={active}
        loop={loop}
        onEnded={onEnded}
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
    );
  }
  if (tile.type === "image" && tile.image?.asset) {
    return (
      <Image
        src={imageUrl(tile.image as SanityImage, 1600)}
        alt={tile.label ? `${title}: ${tile.label}` : title}
        fill
        className="object-cover object-top"
        sizes={sizes}
      />
    );
  }
  return null;
}

export function BentoMedia({
  rows,
  source,
  title,
  active,
}: {
  rows: Array<{ _key?: string | null; tiles?: LoopTile[] | null }>;
  source: ProjectFrameSource;
  title: string;
  active: boolean;
}) {
  const filled = rows.map((r) => ({ ...r, tiles: (r.tiles ?? []).slice(0, 2) })).filter((r) => r.tiles.length > 0);
  if (!filled.length) return null;
  return (
    <div className="flex flex-col gap-[2px]">
      {filled.map((row, r) => (
        <div key={row._key ?? r} className="flex gap-[2px]">
          {row.tiles.map((tile, i) => {
            const frame = frameOf(tile, source);
            const aspect = mediaAspect(tile);
            const share = boxAspect(frame, aspect);
            const sizes = row.tiles.length > 1 ? "(min-width: 75rem) 50vw, 60vw" : "(min-width: 75rem) 100vw, 100vw";
            return (
              <div key={tile._key ?? i} className="min-w-0" style={{ flex: `${share} 1 0%` }}>
                <MediaFrame frame={frame} mediaAspect={aspect} sizes={sizes} boxClassName="bg-tertiary/40">
                  <TileMedia tile={tile} title={title} active={active} sizes={sizes} />
                </MediaFrame>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function CarouselMedia({
  slides,
  source,
  title,
  active,
}: {
  slides: LoopTile[];
  source: ProjectFrameSource;
  title: string;
  active: boolean;
}) {
  const steps = slides.filter((s) => (s.type === "video" && s.video?.asset?._ref) || (s.type === "image" && s.image?.asset));
  const [current, setCurrent] = useState(0);
  const count = steps.length;
  const next = useCallback(() => setCurrent((c) => (count ? (c + 1) % count : 0)), [count]);

  // A still has no "ended": hold it, then move on.
  const step = steps[current];
  useEffect(() => {
    if (!active || !step || step.type !== "image") return;
    const id = window.setTimeout(next, STILL_MS);
    return () => window.clearTimeout(id);
  }, [active, step, next]);

  if (!count) return null;
  const sizes = "(min-width: 75rem) 100vw, 100vw";

  return (
    <div>
      <div className="grid">
        {steps.map((s, i) => {
          const frame = frameOf(s, source);
          const on = i === current;
          return (
            <div
              key={s._key ?? i}
              aria-hidden={!on}
              className={`col-start-1 row-start-1 transition-opacity duration-300 ease-out ${on ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              <MediaFrame frame={frame} mediaAspect={mediaAspect(s)} sizes={sizes} boxClassName="bg-tertiary/40">
                <TileMedia tile={s} title={title} active={active && on} sizes={sizes} loop={count < 2} onEnded={next} />
              </MediaFrame>
            </div>
          );
        })}
      </div>
      {count > 1 && (
        <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-1" aria-label={`${title}: steps`}>
          {steps.map((s, i) => (
            <li key={s._key ?? i}>
              <button
                type="button"
                aria-current={i === current ? "step" : undefined}
                onClick={() => setCurrent(i)}
                className={`text-sub tabular-nums transition-colors duration-200 ${i === current ? "text-primary" : "text-secondary hover:text-primary"}`}
              >
                {i + 1} {s.label ?? ""}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** One big line between chapters, with optional subtext; no media. */
export function StatementSection({ text, subtext }: { text?: string | null; subtext?: string | null }) {
  if (!text) return null;
  return (
    <section className="grid-site px-margin py-12 desktop:py-24" aria-label={text}>
      <p className="col-span-4 text-h2 text-primary text-balance desktop:col-start-1 desktop:col-end-11 desktop:text-display">{text}</p>
      {subtext && (
        <p className="col-span-4 mt-4 text-body text-secondary desktop:col-start-1 desktop:col-end-6 desktop:mt-6 desktop:text-lead">{subtext}</p>
      )}
    </section>
  );
}
