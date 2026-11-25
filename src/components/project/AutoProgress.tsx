"use client";

import { createContext, useContext } from "react";

/**
 * The clip meter for a gallery that plays in order (Ali 11-25: "some sort of
 * meter or loading bar that shows the duration of the video", thin and
 * pistachio). Prototype: /lab/progress switches between the looks below; the
 * stage draws none until one is picked.
 *
 * ProjectStage writes the centred clip's progress (0 to 1, measured to the
 * moment the stage glides on) as `--clip-p` on its root each frame, and the
 * centred card's box as `--card-x/y/w/h`, so every look is plain CSS on one
 * variable and nothing re-renders per frame.
 */
export type AutoBar =
  | "underline" // A: a line under the current thumbnail
  | "trace" // B: the current thumbnail's outline traces round
  | "rail" // C: one rail under the filmstrip, a segment per clip
  | "under" // D: a line under the centred clip, its width
  | "edge"; // E: a line on the centred clip's bottom edge

export const AUTO_BARS: { id: AutoBar; name: string }[] = [
  { id: "underline", name: "A" },
  { id: "trace", name: "B" },
  { id: "rail", name: "C" },
  { id: "under", name: "D" },
  { id: "edge", name: "E" },
];

export const AutoBarContext = createContext<AutoBar | null>(null);
export const useAutoBar = () => useContext(AutoBarContext);

/** Line weight on every look. */
export const BAR_PX = 2;

/** D and E: drawn on the stage root over the centred card's box. */
export function CardBar({
  look,
  shown,
  reduceMotion,
}: {
  look: AutoBar;
  shown: boolean;
  reduceMotion: boolean;
}) {
  if (look !== "under" && look !== "edge") return null;
  const under = look === "under";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-40 overflow-hidden"
      style={{
        left: "var(--card-x, 0px)",
        width: "var(--card-w, 0px)",
        top: under
          ? `calc(var(--card-y, 0px) + var(--card-h, 0px) + 10px)`
          : `calc(var(--card-y, 0px) + var(--card-h, 0px) - ${BAR_PX}px)`,
        height: BAR_PX,
        background: under ? "var(--color-tertiary)" : "rgba(255,255,255,0.22)",
        opacity: shown ? 1 : 0,
        transition: reduceMotion ? "none" : "opacity 240ms cubic-bezier(0.23,1,0.32,1)",
      }}
    >
      <span
        className="absolute inset-0 origin-left bg-pistachio"
        style={{ transform: "scaleX(var(--clip-p, 0))" }}
      />
    </div>
  );
}
