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
  /** Display scale of the slice (source points to stage points). */
  scale?: number;
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
  poster: { still: Still; x: number; y: number; from?: [number, number]; scale?: number }[];
};

const S = (name: string, w: number, h: number): Still => ({ src: `/lab/morph/${name}.webp`, w, h });

const t1Today = S("t1-today", 390, 844);
const t1Design = S("t1-design", 390, 844);
const t2Today = S("t2-today", 374, 508);
const t2Design = S("t2-design", 374, 548);
/** C2b (Ali 30 Oct): the colour row as 2.5 similar-product cards, Figma 226:232. */
const t3Design = S("t3-design", 374, 792);
const t4Today = S("t4-today", 374, 508);
const t4Design = S("t4-design", 374, 683);
const t5Today = S("t5-today", 390, 844);
const t5Design = S("t5-design", 390, 844);
const t5Picked = S("t5-picked", 390, 844);
const t5Upgraded = S("t5-upgraded", 390, 844);
/** Live PDP gallery (Signature One Tights Black, 30 Oct), carousel with the next image peeking. */
const gallery = S("pdp-gallery", 390, 487);

/** PDP frames are Figma's 374-wide phone: scale them to the 390 stage so
 * they run edge to edge, as on a real phone. The design state ends at the
 * bottom of the phone; the live gallery photo fills the space above it, as on
 * prod (gallery, then breadcrumbs and the buy box). Today is shorter, so the
 * morph pushes the page down into the open space. A sliver under 60 pt is not
 * worth a photo: the frame then sits at the top. */
const K = 390 / 374;
function pdp(designH: number) {
  const space = 844 - designH * K;
  const withPhoto = space >= 60;
  const y0 = withPhoto ? space : 0;
  const Y = (frameY: number) => y0 + frameY * K;
  const slice = (id: string, still: Still, from: [number, number], frameY: number, extra: Partial<Layer> = {}): Layer => ({
    id,
    still,
    from,
    x: 0,
    y: Y(frameY),
    scale: K,
    ...extra,
  });
  const photo: Layer[] = withPhoto
    ? [{ id: "photo", still: gallery, from: [gallery.h - space, gallery.h], x: 0, y: 0 }]
    : [];
  const poster = (still: Still) => [
    ...photo.map((l) => ({ still: l.still, x: 0, y: 0, from: l.from })),
    { still, x: 0, y: y0, scale: K },
  ];
  return { Y, slice, photo, poster, dy: (d: number) => d * K, x: (x: number) => x * K };
}

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

const t2 = pdp(548);
const delivery: Scene = {
  key: "delivery",
  label: "Delivery promise",
  bg: "#ffffff",
  layers: [
    ...t2.photo,
    t2.slice("top", t2Today, [0, 476], 0),
    t2.slice("low", t2Today, [476, 508], 476),
    t2.slice("band", t2Design, [476, 516], 476, { reveal: "down" }),
  ],
  steps: [
    { kind: "hold", d: 0.8 },
    { kind: "move", ids: ["low"], dy: t2.dy(40), d: 0.6 },
    { kind: "reveal", ids: ["band"], d: 0.6, at: "<0.1" },
    { kind: "hold", d: 0.2 },
  ],
  poster: t2.poster(t2Design),
};

/** Figma has no separate today frame for the sold-out row: today is the
 * design with the card row taken out (same components, the row is the only add). */
const t3 = pdp(792);
const soldout: Scene = {
  key: "soldout",
  label: "Sold-out row",
  bg: "#ffffff",
  layers: [
    ...t3.photo,
    t3.slice("top", t3Design, [0, 398], 0),
    t3.slice("low", t3Design, [682, 792], 398),
    t3.slice("band", t3Design, [398, 682], 398, { reveal: "down" }),
  ],
  steps: [
    { kind: "hold", d: 0.6 },
    { kind: "tap", x: t3.x(138.4), y: t3.Y(358) },
    { kind: "move", ids: ["low"], dy: t3.dy(284), d: 0.8 },
    { kind: "reveal", ids: ["band"], d: 0.8, at: "<0.1" },
    { kind: "hold", d: 0.2 },
  ],
  poster: t3.poster(t3Design),
};

const t4 = pdp(683);
const similar: Scene = {
  key: "similar",
  label: "Similar product",
  bg: "#ffffff",
  layers: [
    ...t4.photo,
    t4.slice("top", t4Today, [0, 316], 0),
    t4.slice("sizesToday", t4Today, [316, 394], 316),
    t4.slice("sizesDesign", t4Design, [316, 394], 316, { hidden: true }),
    t4.slice("findSize", t4Today, [394, 422], 394),
    t4.slice("low", t4Today, [422, 508], 422),
    t4.slice("band", t4Design, [394, 597], 394, { reveal: "down" }),
  ],
  steps: [
    { kind: "hold", d: 0.6 },
    { kind: "tap", x: t4.x(138.4), y: t4.Y(358) },
    { kind: "fade", out: ["sizesToday", "findSize"], in: ["sizesDesign"], dy: t4.dy(8), d: 0.35 },
    { kind: "move", ids: ["low"], dy: t4.dy(175), d: 0.7, at: "-=0.1" },
    { kind: "reveal", ids: ["band"], d: 0.7, at: "<0.1" },
    { kind: "hold", d: 0.2 },
  ],
  poster: t4.poster(t4Design),
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

/** One scene per A/B test, for use on its own (e.g. the switcher's media slot). */
export const SCENE_BY_KEY: Record<"badge" | "delivery" | "soldout" | "similar" | "kit", Scene> = {
  badge,
  delivery,
  soldout,
  similar,
  kit: kitFull,
};
