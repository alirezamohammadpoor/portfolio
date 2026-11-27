/**
 * The URL the next/image loader (imageLoader.ts) asks the Sanity CDN for.
 * Kept free of "use client" so a server component can build the same srcset
 * (the home preloads its first cover still with it).
 */
export function sanityLoaderUrl({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  if (url.hostname !== "cdn.sanity.io") return src;
  const params = url.searchParams;
  const w = Number(params.get("w"));
  const h = Number(params.get("h"));
  if (w && h) params.set("h", String(Math.round((h / w) * width)));
  params.set("w", String(width));
  params.set("q", String(quality ?? (Number(params.get("q")) || 85)));
  params.set("auto", "format");
  if (!params.has("fit")) params.set("fit", "max");
  return url.toString();
}
