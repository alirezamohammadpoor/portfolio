import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProject } from "@/sanity/lib/data";
import ProjectPageClient from "@/components/project/ProjectPageClient";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import type { Chapter, TestSwitcher } from "@/components/project/ProjectChapters";

// Prototype route for the chapter project page (brief-v2, Figma frame E):
// the Stronger project with fixture chapters cut from its own gallery and a
// test switcher, until the real chapters exist in Sanity. Not linked, not indexed.
export const metadata: Metadata = {
  title: "Lab — Chapters",
  robots: { index: false, follow: false },
};

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;

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
    layout: "beside",
    side: "right",
  },
  {
    title: "Every test had been off since 1 July",
    text: [
      "A view counter is a number on a page. Nobody had asked whether a number would move anything, or whether the site could tell. The audit answered the second question first: a consent listener registered with once:true meant a user who declined cookies and then accepted never fired an exposure event.",
    ],
    caption: "The once:true listener, before and after. Nine earlier tests had run on a broken instrument.",
    layout: "wide-left",
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
    layout: "wide-right",
    side: "right",
  },
];

const TESTS = [
  { label: "Bestseller badge", title: "Bestseller badge on the product list", status: "Live since 20 Oct · final read 3 Nov", text: "The product list had no signal for what sells. The badge reuses the slot the Archive badge already had, so the grid never shifts.", caption: "Figma, ships state: mobile card, laptop card, 2-col grid." },
  { label: "Delivery promise", title: "One delivery promise, four states", status: "Ready · waiting on ops", text: "One line under the buy button; weekend, holiday and after-cut-off copy as component variants.", caption: "Figma, ships state." },
  { label: "Sold-out row", title: "A row instead of a dead end", status: "Designed", text: "One quiet row under the sizes with the sibling colours that have the size, shown on a sold-out tap.", caption: "Figma, ships state." },
  { label: "Similar product", title: "One similar product, in your size", status: "Designed", text: "When the size is gone in every colour, one size-matched card that has it.", caption: "Figma, ships state." },
  { label: "Kit upgrade", title: "Upgrade to the kit, in the cart", status: "Designed", text: "The missing kit pieces under the cart line with one swap button.", caption: "Figma, variant with sizes picked." },
];

export default async function ChaptersLabPage() {
  const project = await getProject("stronger");
  if (!project) notFound();

  const videos = (project.gallery ?? []).filter((item) => item._type === "galleryVideo");
  const chapters: Chapter[] = COPY.map((c, i) => {
    const item = videos[(i + 1) % Math.max(1, videos.length)];
    return {
      _key: `fixture-${i}`,
      _type: "chapter",
      title: c.title,
      caption: c.caption,
      layout: c.layout,
      side: c.side,
      text: c.text.map((t, j) => block(t, `fixture-${i}-${j}`)),
      media: item && item._type === "galleryVideo" ? { type: "video", video: item.video ?? null, image: null, poster: null, phones: null, panel: null, panelImage: null } : null,
    };
  });
  const switcher: TestSwitcher = {
    _key: "fixture-switcher",
    _type: "testSwitcher",
    title: "The five tests, designed before a line was written",
    tests: TESTS.map((t, i) => {
      const item = videos[i % Math.max(1, videos.length)];
      return {
        _key: `fixture-test-${i}`,
        label: t.label,
        title: t.title,
        status: t.status,
        caption: t.caption,
        text: [block(t.text, `fixture-test-${i}-0`)],
        media: item && item._type === "galleryVideo" ? { type: "video", video: item.video ?? null, image: null, poster: null, phones: null, panel: null, panelImage: null } : null,
      };
    }),
  };

  const fixture: Project = { ...project, chapters: [...chapters, switcher] };
  return <ProjectPageClient key="lab-chapters" project={fixture} nextProject={project.nextProject} prevProject={project.prevProject} />;
}
