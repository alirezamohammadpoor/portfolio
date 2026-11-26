/**
 * The ring motif's rules (brief "Saturn's ring: the portfolio motif", 11-26).
 * Lab only for now; they move to src/lib/motion.ts if Ali keeps the motif.
 *
 * Proportions are Saturn's, in Saturn radii (NASA NSSDC ring fact sheet).
 */
export const RING = {
  /** Ring openings, degrees: how far the ring is tipped toward us. Edge-on
   *  is the carousel row, 9.9° is the Pebble (44 / 256 = sin 9.9°), 26.7°
   *  (Saturn's axial tilt) is the widest it ever opens. */
  open: { line: 0, pebble: 9.9, wide: 26.7 },
  /** Ring edges in Saturn radii. */
  edge: { cInner: 1.239, bInner: 1.526, bOuter: 1.95, aInner: 2.03, aOuter: 2.27 },
  /** The Cassini line sits where the B ring ends: 1.95 / 2.27 of the ring. */
  cassini: 1.95 / 2.27,
  /** Seconds for one turn of the outer edge while in orbit (linear). */
  period: 24,
  /** Inner layers move faster, by Kepler, but never more than Saturn's own
   *  inner/outer ratio ((2.27 / 1.239) ^ 1.5 = 2.5). */
  maxSpeedup: 2.5,
} as const;

/** Half-height of a level ring of half-width `a` opened `deg` degrees. */
export const ringB = (a: number, deg: number) => a * Math.sin((deg * Math.PI) / 180);
