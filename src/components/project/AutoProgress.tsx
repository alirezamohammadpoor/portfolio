"use client";

import { createContext, useContext } from "react";

/**
 * The clip meter for a gallery that plays in order (Ali 11-25: "some sort of
 * meter or loading bar that shows the duration of the video", thin and
 * pistachio). Round 2 (Ali 11-25 17:52: "D and E are the best so far, skip
 * the thumbnails"): every look is a line on the centred clip, under it (D)
 * or on its edge (E). Prototype: /lab/progress; the real page draws none
 * until one is picked.
 *
 * ProjectStage writes the centred clip's progress (0 to 1, measured to the
 * moment the stage glides on) as `--clip-p` on its root each frame, and the
 * centred card's box as `--card-x/y/w/h`, so every look is CSS on those
 * variables and nothing re-renders per frame.
 */
type Look = {
  id: string;
  /** under: below the clip, `gap` px off it; edge: inside its bottom edge; top: inside its top edge. */
  place: "under" | "edge" | "top";
  weight: number;
  gap?: number;
  /** The unplayed part; none leaves only the fill. */
  track?: string;
  /** One segment per clip: played ones stay full. */
  chapters?: boolean;
  /** Seconds left before the glide, under the line's end. */
  countdown?: boolean;
};

const GREY = "var(--color-tertiary)";
export const AUTO_BARS = [
  { id: "D1", place: "under", weight: 2, gap: 10, track: GREY },
  { id: "D2", place: "under", weight: 1, gap: 8 },
  { id: "D3", place: "under", weight: 2, gap: 10, track: GREY, chapters: true },
  { id: "D4", place: "under", weight: 2, gap: 10, track: GREY, countdown: true },
  { id: "D5", place: "under", weight: 3, gap: 0 },
  { id: "E1", place: "edge", weight: 2 },
  { id: "E2", place: "edge", weight: 4 },
  { id: "E3", place: "edge", weight: 3, track: "rgba(0,0,0,0.12)" },
  { id: "E4", place: "edge", weight: 3, track: "rgba(0,0,0,0.12)", chapters: true },
  { id: "E5", place: "top", weight: 2 },
] as const satisfies readonly Look[];
export type AutoBar = (typeof AUTO_BARS)[number]["id"];

export const AutoBarContext = createContext<AutoBar | null>(null);
export const useAutoBar = () => useContext(AutoBarContext);

const FADE = "opacity 240ms cubic-bezier(0.23,1,0.32,1)";

/** Drawn on the stage root over the centred card's box. */
export function CardBar({
  look: id,
  shown,
  reduceMotion,
  count,
  index,
}: {
  look: AutoBar;
  shown: boolean;
  reduceMotion: boolean;
  count: number;
  index: number;
}) {
  const look: Look | undefined = AUTO_BARS.find((b) => b.id === id);
  if (!look) return null;
  const { place, weight, gap = 0, track, chapters, countdown } = look;
  const bottom = "calc(var(--card-y, 0px) + var(--card-h, 0px))";
  const top =
    place === "under"
      ? `calc(${bottom} + ${gap}px)`
      : place === "edge"
        ? `calc(${bottom} - ${weight}px)`
        : "var(--card-y, 0px)";
  const fill = (i: number) => (i < index ? "1" : i === index ? "var(--clip-p, 0)" : "0");
  const line = (i: number, key?: number) => (
    <span
      key={key}
      className="relative h-full flex-1 overflow-hidden"
      style={{ background: track ?? "transparent" }}
    >
      <span
        className="absolute inset-0 origin-left bg-pistachio"
        style={{ transform: `scaleX(${fill(i)})` }}
      />
    </span>
  );
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-40"
      style={{
        left: "var(--card-x, 0px)",
        width: "var(--card-w, 0px)",
        top,
        opacity: shown ? 1 : 0,
        transition: reduceMotion ? "none" : FADE,
      }}
    >
      <div className="flex" style={{ height: weight, gap: chapters ? 4 : 0 }}>
        {chapters ? Array.from({ length: count }, (_, i) => line(i, i)) : line(index)}
      </div>
      {countdown && (
        <span
          data-clip-left
          className="absolute right-0 text-sub text-secondary tabular-nums"
          style={{ top: weight + 6 }}
        />
      )}
    </div>
  );
}
