"use client";

import NextLink from "next/link";
import { PortableText } from "next-sanity";
import CopyButton from "@/components/CopyButton";
import { splitLead } from "@/lib/aboutLead";
import type { BarData } from "@/sanity/lib/bar";
import type { PanelLayout } from "@/lib/barProject";

const LINK = "w-fit hover:opacity-60";
const BODY = "text-[0.9375rem] leading-[1.375rem] text-primary break-words [&_p+p]:mt-3";

type About = NonNullable<BarData["about"]>;

/** LinkedIn, GitHub and Copy my email, each its own element so a layout can place them on the grid. */
function links(about: About, classes: [string, string, string] = ["", "", ""]) {
  return [
    about.linkedinUrl && (
      <NextLink key="in" href={about.linkedinUrl} target="_blank" rel="noopener noreferrer" className={`${LINK} ${classes[0]}`}>
        LinkedIn ↗<span className="sr-only"> (opens in a new tab)</span>
      </NextLink>
    ),
    about.githubUrl && (
      <NextLink key="gh" href={about.githubUrl} target="_blank" rel="noopener noreferrer" className={`${LINK} ${classes[1]}`}>
        GitHub ↗<span className="sr-only"> (opens in a new tab)</span>
      </NextLink>
    ),
    // CopyButton puts its className on the inner button: the cell is a wrapper.
    about.email && (
      <div key="mail" className={classes[2]}>
        <CopyButton value={about.email} label="Copy my email" className={`${LINK} cursor-pointer text-left`} />
      </div>
    ),
  ];
}

/**
 * Spread (About A, Figma 11-17): every block owns a cell of the 6-row grid.
 * Laptop: the lead at heading size on the top two rows, the paragraphs side
 * by side in four columns each from row three, each link under its
 * paragraph on the last row. Phone: one paragraph per row band, the links
 * in two columns at the foot.
 */
/** Studio can leave empty paragraphs in the bio; a grid cell per paragraph must skip them. */
const hasText = (b: { children?: unknown }) =>
  ((b.children ?? []) as { text?: string }[]).some((c) => c.text?.trim());

function Spread({ about }: { about: About }) {
  const { lead, body: all } = splitLead(about.bio);
  const body = all.filter(hasText);
  const groups = [body.slice(0, 1), body.slice(1, 2), body.slice(2)].filter((g) => g.length);
  const para = [
    "row-start-2 desktop:col-start-1",
    "row-start-3 row-span-2 desktop:col-start-5",
    "row-start-5 desktop:col-start-9",
  ];
  return (
    <div className="grid h-full grid-cols-4 grid-rows-6 gap-x-3 gap-y-3 px-margin pb-4 desktop:grid-site desktop:grid-rows-6 desktop:gap-y-4 desktop:pb-5">
      {lead && <p className="col-span-4 row-start-1 self-start text-lead text-primary desktop:col-span-7 desktop:row-span-2 desktop:text-h3">{lead}</p>}
      {groups.map((g, i) => (
        <div key={i} className={`col-span-4 self-start desktop:row-span-3 desktop:row-start-3 ${para[i]} ${BODY}`}>
          <PortableText value={g} />
        </div>
      ))}
      {links(about, [
        "col-span-2 col-start-1 row-start-6 mb-7 self-end text-body desktop:col-span-4 desktop:col-start-1 desktop:mb-0",
        "col-span-2 col-start-1 row-start-6 self-end text-body desktop:col-span-4 desktop:col-start-5",
        "col-span-2 col-start-3 row-start-6 mb-7 self-end text-body desktop:col-span-4 desktop:col-start-9 desktop:mb-0",
      ])}
    </div>
  );
}

/**
 * One narrow column (About B, Figma 11-17). Laptop: everything in columns
 * five to nine, the lead on row one, the body from row three, the links on
 * the last row; the rest of the window stays empty. Phone: a full-width
 * lead, then the body and links hang from column two, a step smaller.
 */
function Column({ about }: { about: About }) {
  const { lead, body } = splitLead(about.bio);
  return (
    <div className="grid h-full grid-cols-4 grid-rows-6 gap-x-3 gap-y-3 px-margin pb-4 desktop:grid-site desktop:grid-rows-6 desktop:gap-y-4 desktop:pb-5">
      {lead && <p className="col-span-4 row-start-1 self-start text-lead text-primary desktop:col-span-5 desktop:col-start-5 desktop:row-span-2">{lead}</p>}
      {body.length > 0 && (
        <div className="col-span-3 col-start-2 row-span-4 row-start-2 self-start text-[0.875rem] leading-5 text-primary break-words desktop:col-span-5 desktop:col-start-5 desktop:row-span-3 desktop:row-start-3 desktop:text-[0.9375rem] desktop:leading-[1.375rem] [&_p+p]:mt-3">
          <PortableText value={body} />
        </div>
      )}
      <div className="col-span-3 col-start-2 row-start-6 flex flex-wrap gap-x-4 gap-y-1 self-end text-body text-primary desktop:col-span-5 desktop:col-start-5 desktop:gap-x-6">
        {links(about, ["", "", "basis-full desktop:basis-auto"])}
      </div>
    </div>
  );
}


/**
 * About inside the capsule (Ali, 11-16): sized to fit a phone without
 * scrolling, left aligned, the bio's first sentence one step above the
 * body instead of a headline.
 */
export default function AboutBody({
  about,
  layout = "now",
}: {
  about: About;
  layout?: PanelLayout["about"];
}) {
  if (layout === "spread") return <Spread about={about} />;
  if (layout === "column") return <Column about={about} />;
  const { lead, body } = splitLead(about.bio);
  return (
    // The window is Work's size (fixed), so About fills it: the links sit
    // at its foot. Laptop: lead in the left five columns, body in the right
    // seven, their first lines on one baseline.
    <div className="flex min-h-full flex-col px-margin pb-6 desktop:grid-site desktop:grid-rows-[auto_1fr] desktop:items-baseline desktop:pb-8">
      {lead && (
        <p className="text-lead text-primary desktop:col-span-5">{lead}</p>
      )}
      {body.length > 0 && (
        <div className="mt-3 text-[0.9375rem] leading-[1.375rem] text-primary break-words desktop:col-span-7 desktop:mt-0 [&_p+p]:mt-3">
          <PortableText value={body} />
        </div>
      )}
      <div className="mt-auto pt-5 desktop:col-span-5 desktop:row-start-2 desktop:self-end desktop:pt-0">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-body text-primary">
          {about.linkedinUrl && (
            <NextLink
              href={about.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK}
            >
              LinkedIn ↗<span className="sr-only"> (opens in a new tab)</span>
            </NextLink>
          )}
          {about.githubUrl && (
            <NextLink
              href={about.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK}
            >
              GitHub ↗<span className="sr-only"> (opens in a new tab)</span>
            </NextLink>
          )}
          {about.email && (
            <CopyButton
              value={about.email}
              label="Copy my email"
              className={`${LINK} cursor-pointer text-left`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
