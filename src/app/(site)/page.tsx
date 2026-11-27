import type { Metadata } from "next";
import { preload } from "react-dom";
import { draftMode } from "next/headers";
import Home from "@/components/home/Home";
import { getAbout, getProjects } from "@/sanity/lib/data";
import { OPEN_GRAPH_BASE, SITE_OG_IMAGE } from "@/lib/site";
import { imageUrl } from "@/sanity/lib/image";
import { sanityLoaderUrl } from "@/sanity/lib/sanityLoaderUrl";

// next.config.ts images.deviceSizes after Next's default imageSizes: the
// widths getImageProps writes into a cover still's srcset.
const ALL_WIDTHS = [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1440, 1920, 2560];
const DESKTOP = "(min-width: 75rem)";

/**
 * The carousel mounts in the browser (Home.tsx), so its first still would
 * only be asked for after hydration. Preloading it from the page starts it
 * with the HTML, with the same srcset as the Cover's <img> so the browser
 * picks the same file: laptop row (sizes 96vh, every width), phone row
 * (90vw, the widths from 576 up).
 */
function preloadFirstStill(projects: Awaited<ReturnType<typeof getProjects>>) {
  const poster = projects[0]?.coverPoster;
  if (!poster?.asset) return;
  const src = imageUrl(poster, 1600);
  const srcset = (widths: number[]) =>
    widths.map((w) => `${sanityLoaderUrl({ src, width: w })} ${w}w`).join(", ");
  preload(src, {
    as: "image",
    fetchPriority: "high",
    imageSrcSet: srcset(ALL_WIDTHS),
    imageSizes: "96vh",
    media: DESKTOP,
  });
  preload(sanityLoaderUrl({ src, width: 640 }), {
    as: "image",
    fetchPriority: "high",
    imageSrcSet: srcset(ALL_WIDTHS.filter((w) => w >= 576)),
    imageSizes: "90vw",
    media: `not all and ${DESKTOP}`,
  });
}

const description =
  "Portfolio of Ali Reza Mohammad Poor, frontend developer at the intersection of product and design.";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    type: "website",
    url: "/",
    title: "Ali Reza Mohammad Poor | Developer",
    description,
    images: [SITE_OG_IMAGE],
  },
};

export default async function HomePage() {
  const { isEnabled: isDraft } = await draftMode();
  const [projects, about] = await Promise.all([
    getProjects(isDraft ? "drafts" : "published"),
    getAbout().catch(() => null),
  ]);

  preloadFirstStill(projects);

  return (
    <>
      <h1 className="sr-only">Ali Reza Mohammad Poor — Frontend developer at the intersection of product and design</h1>
      <Home projects={projects} contact={about} />
    </>
  );
}
