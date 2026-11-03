/**
 * Media backgrounds (Ali, 11-03). Recordings stay flush. The colour or image
 * behind a clip is set in Sanity and drawn here: per item, falling back to
 * the project's default, picking from the project's brand colours or a
 * one-off hex. See src/sanity/schemaTypes/mediaFrame.ts.
 */

type SanityImage = { asset?: unknown } & Record<string, unknown>;

export type FrameInput = {
  colour?: string | null;
  hex?: string | null;
  image?: SanityImage | null;
  imageOpacity?: number | null;
  fit?: string | null;
  size?: number | null;
} | null | undefined;

export type ProjectFrameSource = {
  palette?: Array<{ hex?: string | null } | null> | null;
  mediaBackground?: FrameInput;
} | null | undefined;

/** What the media is: a landscape recording, a single portrait (phone) recording, or a row of phones. */
export type MediaKind = "landscape" | "portrait" | "phones";

export type ResolvedFrame = {
  /** null: no background, the media is flush on the page. */
  background: { colour: string | null; image: SanityImage | null; imageOpacity: number } | null;
  fit: "flush" | "laptop" | "phone";
  /** Percent of the box: width for laptop, height for phone. */
  size: number;
};

export const FRAME_PRESET = { laptop: 84, phone: 88 } as const;

const HEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

function pickColour(colour: string | null | undefined, hex: string | null | undefined, project: ProjectFrameSource) {
  if (hex && HEX.test(hex)) return hex;
  if (!colour || colour === "none" || colour === "default") return null;
  const swatch = project?.palette?.[Number(colour) - 1];
  return swatch?.hex && HEX.test(swatch.hex) ? swatch.hex : null;
}

function background(input: FrameInput, project: ProjectFrameSource): ResolvedFrame["background"] {
  if (!input) return null;
  const colour = pickColour(input.colour, input.hex, project);
  const image = input.image?.asset ? input.image : null;
  if (!colour && !image) return null;
  return { colour, image, imageOpacity: (input.imageOpacity ?? 60) / 100 };
}

export function resolveFrame(frame: FrameInput, project: ProjectFrameSource, kind: MediaKind): ResolvedFrame {
  // An item left on "Project default" (or never touched) takes the project's background.
  const own = frame && frame.colour && frame.colour !== "default" ? frame : null;
  const bg = own ? background(own, project) : background(project?.mediaBackground, project);

  const asked = frame?.fit && frame.fit !== "auto" ? (frame.fit as ResolvedFrame["fit"]) : null;
  // Auto: a phone recording always stands centred in a 4:5 box (on its
  // background, or on the page), a laptop recording sits inset on its
  // background, a row of phones takes a panel when it has one, and anything
  // without a background is flush.
  const fit: ResolvedFrame["fit"] =
    asked ?? (kind === "portrait" ? "phone" : !bg ? "flush" : kind === "landscape" ? "laptop" : "phone");
  const preset = fit === "phone" ? FRAME_PRESET.phone : fit === "laptop" ? FRAME_PRESET.laptop : 100;
  const size = frame?.size && frame.size >= 20 && frame.size <= 100 ? frame.size : preset;
  return { background: bg, fit, size };
}

/**
 * The landing media (first media on a project page, where the home → project
 * clone and the project → project hand-off land) takes the same background,
 * but always as a laptop-shaped box: the clone morphs from a 16:10 cover, so
 * a phone fit would squash it. The clone lands on the media box inside.
 */
export function resolveLandingFrame(frame: FrameInput, project: ProjectFrameSource): ResolvedFrame {
  const resolved = resolveFrame(frame, project, "landscape");
  if (resolved.fit !== "phone") return resolved;
  return { ...resolved, fit: resolved.background ? "laptop" : "flush", size: resolved.background ? FRAME_PRESET.laptop : 100 };
}
