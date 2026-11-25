"use client";

/**
 * The clip meter for a gallery that plays in order (Ali 11-25: "some sort of
 * meter or loading bar that shows the duration of the video", thin and
 * pistachio). Prototyped in two rounds in /lab/progress; Ali picked E3 + D4:
 * a 3 px pistachio line on the clip's bottom edge over a faint dark track
 * (the seconds-left label went, Ali 11-25: "remove the seconds").
 *
 * ProjectStage writes the centred clip's progress (0 to 1, measured to the
 * glide) as `--clip-p` on its root each frame, the centred card's box as
 * `--card-x/y/w/h`, so nothing re-renders per frame. Handed back to the visitor, the meter fades out.
 */
const WEIGHT = 3;

export default function ClipMeter({
  shown,
  reduceMotion,
}: {
  shown: boolean;
  reduceMotion: boolean;
}) {
  const bottom = "calc(var(--card-y, 0px) + var(--card-h, 0px))";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-40"
      style={{
        left: "var(--card-x, 0px)",
        width: "var(--card-w, 0px)",
        top: `calc(${bottom} - ${WEIGHT}px)`,
        opacity: shown ? 1 : 0,
        transition: reduceMotion ? "none" : "opacity 240ms cubic-bezier(0.23,1,0.32,1)",
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{ height: WEIGHT, background: "rgba(0,0,0,0.12)" }}
      >
        <span
          className="absolute inset-0 origin-left bg-pistachio"
          style={{ transform: "scaleX(var(--clip-p, 0))" }}
        />
      </div>
    </div>
  );
}
