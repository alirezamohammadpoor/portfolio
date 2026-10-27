import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProject } from "@/sanity/lib/data";
import ProjectPageClient from "@/components/project/ProjectPageClient";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";

// Prototype route for the chapter project page (brief-v2, Figma frame E):
// the Stronger project with four fixture chapters cut from its own gallery,
// until the real chapters exist in Sanity. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Chapters",
  robots: { index: false, follow: false },
};

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
type Chapter = NonNullable<Project["chapters"]>[number];

const block = (text: string, key: string) => ({
  _type: "block" as const,
  _key: key,
  style: "normal" as const,
  markDefs: [],
  children: [{ _type: "span" as const, _key: `${key}s`, text, marks: [] }],
});

const COPY: Array<Pick<Chapter, "title" | "caption" | "layout" | "side"> & { text: string[] }> = [
  {
    title: "A view counter nobody could measure",
    text: [
      "A Swedish fashion brand on a shared headless storefront asked for one thing in September: a product-page urgency element, a view counter. Lab mobile scores sat in the 30s, which became a second track.",
    ],
    caption: "The product listing in September. Zero products carried the bestseller badge because of a data bug.",
    layout: "half",
    side: "right",
  },
  {
    title: "Every test had been off since 1 July",
    text: [
      "A view counter is a number on a page. Nobody had asked whether a number would move anything, or whether the site could tell. The audit answered the second question first: a consent listener registered with once:true meant a user who declined cookies and then accepted never fired an exposure event.",
    ],
    caption: "The once:true listener, before and after. Nine earlier tests had run on a broken instrument.",
    layout: "wide",
    side: "left",
  },
  {
    title: "Five tests, one priority ladder",
    text: [
      "I reframed the ask from one widget to a programme: a research brief, two product-page audits, a decisions log and five candidate tests. A priority ladder decides which one a product shows, so two numbers never compete on one page.",
      "Each test was specced in Figma and prototyped in a product-page lab where stakeholders could flip arms before anything was coded. The client picked the bestseller badge and the countdown.",
    ],
    caption: "Sold line, ship-today countdown, USP block and sold-out-size recovery, as one film.",
    layout: "full",
    side: "right",
  },
  {
    title: "Lighthouse 34 to 87, and 31 badged products",
    text: [
      "The bestseller badge shipped on 20 October as the first live test; badged products went from 0 to 31. The performance rebuild raised Lighthouse mobile from 34, 35 and 33 to 87, 83 and 82 on home, listing and product pages, with 133 of 151 parity checks passing and 0 failing.",
      "The rebuilds are open draft merge requests, not adopted. The A/B readout is pending.",
    ],
    caption: "Mobile product page with the badge, 3-run Lighthouse medians in the same batch as production.",
    layout: "narrow",
    side: "right",
  },
];

export default async function ChaptersLabPage() {
  const project = await getProject("stronger");
  if (!project) notFound();

  const videos = (project.gallery ?? []).filter((item) => item._type === "galleryVideo");
  const chapters: Chapter[] = COPY.map((c, i) => {
    const item = videos[(i + 1) % Math.max(1, videos.length)];
    return {
      _key: `fixture-${i}`,
      title: c.title,
      caption: c.caption,
      layout: c.layout,
      side: c.side,
      text: c.text.map((t, j) => block(t, `fixture-${i}-${j}`)),
      media: item && item._type === "galleryVideo" ? { type: "video", video: item.video ?? null, image: null, poster: null } : null,
    };
  });

  const fixture: Project = { ...project, chapters };
  return <ProjectPageClient key="lab-chapters" project={fixture} nextProject={project.nextProject} prevProject={project.prevProject} />;
}
