/**
 * Storyboard for the Stronger test morphs: each test goes from the page as it
 * is today to the design that ships, built from two stills.
 *
 * Every still is real: the badge stills are production captures of the PLP
 * with the GrowthBook gate flipped (the arm is a body attribute, nothing else
 * changes); the other four are Figma frames from the Stronger-test file, where
 * the "today" and the design frame share components, so they line up pixel
 * for pixel and only the test differs.
 *
 * Units are points on a 390 x 844 phone stage. Image slices are cut in the
 * still's own points (its width is `w`).
 */

export type Still = { src: string; w: number; h: number };

export type Layer = {
  id: string;
  still: Still;
  /** Source rows in the still, in points. Defaults to the whole still. */
  from?: [number, number];
  /** Source columns, in points. Defaults to the full width. */
  cols?: [number, number];
  /** Where the slice sits on the stage at time 0. */
  x: number;
  y: number;
  /** A reveal layer starts clipped shut and its content hidden. */
  reveal?: "down" | "right";
  /** Starts invisible (for crossfades). */
  hidden?: boolean;
};

/** One step of the timeline; the stage runs them in order (`at` overrides). */
export type Step =
  | { kind: "hold"; d: number }
  | { kind: "move"; ids: string[]; dy: number; d: number; at?: string }
  | { kind: "reveal"; ids: string[]; d: number; stagger?: number; at?: string }
  | { kind: "fade"; out?: string[]; in?: string[]; dy?: number; d: number; at?: string }
  /** A finger tap at a stage point (where the shopper acts). */
  | { kind: "tap"; x: number; y: number; at?: string };

export type Scene = {
  key: string;
  label: string;
  /** Background of the stage (matches the stills' own edge colour). */
  bg: string;
  /** Clip region on the stage for moving layers, if any: [top, bottom]. */
  clip?: [number, number];
  /** Fill behind the clipped layers (the sheet colour), so a gap never shows the stage. */
  clipBg?: string;
  /** Layers drawn above the clip region (static chrome), ids. */
  chrome?: string[];
  layers: Layer[];
  steps: Step[];
  /** The final stills, shown on their own under reduced motion. */
  poster: { still: Still; x: number; y: number; from?: [number, number] }[];
};

const S = (name: string, w: number, h: number): Still => ({ src: `/lab/morph/${name}.webp`, w, h });

const t1Today = S("t1-today", 390, 844);
const t1Design = S("t1-design", 390, 844);
const t2Today = S("t2-today", 374, 508);
const t2Design = S("t2-design", 374, 548);
const t3Design = S("t3-design", 374, 604);
const t4Today = S("t4-today", 374, 508);
const t4Design = S("t4-design", 374, 683);
const t5Today = S("t5-today", 390, 844);
const t5Design = S("t5-design", 390, 844);
const t5Picked = S("t5-picked", 390, 844);
const t5Upgraded = S("t5-upgraded", 390, 844);
/** Live PDP gallery (Signature One Tights Black, 30 Oct), carousel with the next image peeking. */
const gallery = S("pdp-gallery", 390, 487);

/** PDP frames are 374 wide: centre them. The design state ends at the
 * bottom of the phone; the live gallery photo fills the space above it, as on
 * prod (gallery, then breadcrumbs and the buy box). Today is shorter, so the
 * morph pushes the page down into the open space. */
const PX = 8;
const top = (designH: number) => 844 - designH;
const photo = (designH: number): Layer => ({
  id: "photo",
  still: gallery,
  from: [gallery.h - (844 - designH), gallery.h],
  x: 0,
  y: 0,
});

/** Badge rects measured on the capture (getBoundingClientRect, 390 x 844). */
const BADGES: [number, number][] = [
  [8, 150.5],
  [204, 150.5],
  [8, 594.5],
  [204, 594.5],
];

const badge: Scene = {
  key: "badge",
  label: "Bestseller badge",
  bg: "#ffffff",
  layers: [
    { id: "base", still: t1Today, x: 0, y: 0 },
    ...BADGES.map(([x, y], i) => ({
      id: `b${i}`,
      still: t1Design,
      from: [y - 1, y + 24] as [number, number],
      cols: [x - 1, x + 73] as [number, number],
      x: x - 1,
      y: y - 1,
      reveal: "right" as const,
    })),
  ],
  steps: [
    { kind: "hold", d: 0.8 },
    { kind: "reveal", ids: ["b0", "b1", "b2", "b3"], d: 0.5, stagger: 0.07 },
    { kind: "hold", d: 0.2 },
  ],
  poster: [{ still: t1Design, x: 0, y: 0 }],
};

const t2y = top(548);
const delivery: Scene = {
  key: "delivery",
  label: "Delivery promise",
  bg: "#ffffff",
  layers: [
    photo(548),
    { id: "top", still: t2Today, from: [0, 476], x: PX, y: t2y },
    { id: "low", still: t2Today, from: [476, 508], x: PX, y: t2y + 476 },
    { id: "band", still: t2Design, from: [476, 516], x: PX, y: t2y + 476, reveal: "down" },
  ],
  steps: [
    { kind: "hold", d: 0.8 },
    { kind: "move", ids: ["low"], dy: 40, d: 0.6 },
    { kind: "reveal", ids: ["band"], d: 0.6, at: "<0.1" },
    { kind: "hold", d: 0.2 },
  ],
  poster: [{ still: gallery, x: 0, y: 0, from: [gallery.h - t2y, gallery.h] }, { still: t2Design, x: PX, y: t2y }],
};

/** Figma has no separate today frame for the sold-out row: today is the
 * design with the row taken out (same components, the row is the only add). */
const t3y = top(604);
const soldout: Scene = {
  key: "soldout",
  label: "Sold-out row",
  bg: "#ffffff",
  layers: [
    photo(604),
    { id: "top", still: t3Design, from: [0, 398], x: PX, y: t3y },
    { id: "low", still: t3Design, from: [494, 604], x: PX, y: t3y + 398 },
    { id: "band", still: t3Design, from: [398, 494], x: PX, y: t3y + 398, reveal: "down" },
  ],
  steps: [
    { kind: "hold", d: 0.6 },
    { kind: "tap", x: PX + 138.4, y: t3y + 358 },
    { kind: "move", ids: ["low"], dy: 96, d: 0.7 },
    { kind: "reveal", ids: ["band"], d: 0.7, at: "<0.1" },
    { kind: "hold", d: 0.2 },
  ],
  poster: [{ still: gallery, x: 0, y: 0, from: [gallery.h - t3y, gallery.h] }, { still: t3Design, x: PX, y: t3y }],
};

const t4y = top(683);
const similar: Scene = {
  key: "similar",
  label: "Similar product",
  bg: "#ffffff",
  layers: [
    photo(683),
    { id: "top", still: t4Today, from: [0, 316], x: PX, y: t4y },
    { id: "sizesToday", still: t4Today, from: [316, 394], x: PX, y: t4y + 316 },
    { id: "sizesDesign", still: t4Design, from: [316, 394], x: PX, y: t4y + 316, hidden: true },
    { id: "findSize", still: t4Today, from: [394, 422], x: PX, y: t4y + 394 },
    { id: "low", still: t4Today, from: [422, 508], x: PX, y: t4y + 422 },
    { id: "band", still: t4Design, from: [394, 597], x: PX, y: t4y + 394, reveal: "down" },
  ],
  steps: [
    { kind: "hold", d: 0.6 },
    { kind: "tap", x: PX + 138.4, y: t4y + 358 },
    { kind: "fade", out: ["sizesToday", "findSize"], in: ["sizesDesign"], dy: 8, d: 0.35 },
    { kind: "move", ids: ["low"], dy: 175, d: 0.7, at: "-=0.1" },
    { kind: "reveal", ids: ["band"], d: 0.7, at: "<0.1" },
    { kind: "hold", d: 0.2 },
  ],
  poster: [{ still: gallery, x: 0, y: 0, from: [gallery.h - t4y, gallery.h] }, { still: t4Design, x: PX, y: t4y }],
};

/** Mini-cart: the drawer scrolls the line card to the top (as the design note
 * says), then the kit block opens under it and pushes "Bara för dig" down. */
const kitLayers: Layer[] = [
  { id: "chrome", still: t5Today, from: [0, 100], x: 0, y: 0 },
  { id: "c1", still: t5Today, from: [100, 452], x: 0, y: 100 },
  { id: "c2", still: t5Today, from: [452, 668], x: 0, y: 452 },
  { id: "band", still: t5Design, from: [258, 646], x: 0, y: 258, reveal: "down" },
  { id: "designC", still: t5Design, from: [100, 668], x: 0, y: 100, hidden: true },
  { id: "footer", still: t5Today, from: [668, 844], x: 0, y: 668 },
];
const kitSteps: Step[] = [
  { kind: "hold", d: 0.8 },
  { kind: "move", ids: ["c1", "c2"], dy: -192, d: 0.7 },
  { kind: "move", ids: ["c2"], dy: 388, d: 0.7, at: "-=0.05" },
  { kind: "reveal", ids: ["band"], d: 0.7, at: "<" },
  /* Settle on the design still itself (the morph ends on the same pixels). */
  { kind: "fade", out: ["c1", "c2", "band"], in: ["designC"], d: 0.01 },
  { kind: "hold", d: 0.2 },
];

const kitBlock: Scene = {
  key: "kit-block",
  label: "Kit upgrade (block only)",
  bg: "#111111",
  clip: [100, 668],
  clipBg: "#ffffff",
  chrome: ["chrome", "footer"],
  layers: kitLayers,
  steps: kitSteps,
  poster: [{ still: t5Design, x: 0, y: 0 }],
};

/** Whole flow: block, sizes picked, one tap swaps the line for the kit. */
const kitFull: Scene = {
  ...kitBlock,
  key: "kit",
  label: "Kit upgrade",
  layers: [
    ...kitLayers.slice(0, 5),
    { id: "picked", still: t5Picked, from: [258, 646], x: 0, y: 258, hidden: true },
    { id: "pickedC", still: t5Picked, from: [100, 668], x: 0, y: 100, hidden: true },
    { id: "upC", still: t5Upgraded, from: [100, 640], x: 0, y: 100, hidden: true },
    kitLayers[5],
    { id: "upFooter", still: t5Upgraded, from: [640, 844], x: 0, y: 640, hidden: true },
    { id: "upTop", still: t5Upgraded, from: [0, 100], x: 0, y: 0, hidden: true },
  ],
  chrome: ["chrome", "footer", "upFooter", "upTop"],
  steps: [
    ...kitSteps.slice(0, 5),
    { kind: "hold", d: 0.6 },
    /* Sizes picked in the frame's own order: T-shirt S, bra M (tights keep M). */
    { kind: "tap", x: 162, y: 390 },
    { kind: "tap", x: 208, y: 470 },
    { kind: "fade", in: ["picked"], d: 0.25, at: "-=0.2" },
    { kind: "fade", out: ["designC", "picked"], in: ["pickedC"], d: 0.01 },
    { kind: "hold", d: 0.4 },
    { kind: "tap", x: 195, y: 594 },
    /* One tap swaps the tights line for the kit and the drawer returns to the top. */
    { kind: "fade", out: ["pickedC", "footer", "chrome"], in: ["upC", "upFooter", "upTop"], d: 0.45, at: "-=0.15" },
    { kind: "hold", d: 0.2 },
  ],
  poster: [{ still: t5Upgraded, x: 0, y: 0 }],
};

/** Ali 10-30: the kit test plays the whole flow; the block-only cut is kept for reference. */
export const SCENES: Scene[] = [badge, delivery, soldout, similar, kitFull];
export const EXTRA_SCENES: Scene[] = [kitBlock];
