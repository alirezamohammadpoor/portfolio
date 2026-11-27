import { preload } from "react-dom";
import { sanityLoaderUrl } from "./sanityLoaderUrl";

// next.config.ts images.deviceSizes after Next's default imageSizes: the
// widths getImageProps can write into a srcset.
const ALL_WIDTHS = [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1440, 1920, 2560];

/**
 * Preload a Sanity still from a server page with the srcset next/image will
 * write for it (the loader's URLs), so the browser starts the same file with
 * the HTML instead of after hydration. `minVw` is the smallest vw share in
 * `sizes`: next/image drops widths below deviceSizes[0] × that share.
 */
export function preloadStill(
  src: string,
  { sizes, minVw = 1, media }: { sizes: string; minVw?: number; media?: string },
) {
  const widths = ALL_WIDTHS.filter((w) => w >= ALL_WIDTHS[7] * minVw);
  preload(sanityLoaderUrl({ src, width: widths[0] }), {
    as: "image",
    fetchPriority: "high",
    imageSrcSet: widths.map((w) => `${sanityLoaderUrl({ src, width: w })} ${w}w`).join(", "),
    imageSizes: sizes,
    ...(media && { media }),
  });
}

/** Preload a still served as is (`unoptimized`: one URL, no srcset). */
export function preloadPlainStill(src: string, media?: string) {
  preload(src, { as: "image", fetchPriority: "high", ...(media && { media }) });
}
