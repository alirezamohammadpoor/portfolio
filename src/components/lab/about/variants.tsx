"use client";

import NextLink from "next/link";
import CopyButton from "@/components/CopyButton";
import type { BarData } from "@/sanity/lib/bar";

export type About = NonNullable<BarData["about"]>;

/** The About copy as the panel uses it: the bio's first sentence leads, the rest are paragraphs. */
export interface AboutCopy {
  lead: string;
  paras: string[];
  about: About;
}

/** Type scale for the intro and the paragraphs (T cycles it). */
export type Size = "live" | "l" | "xl";

export interface VariantProps {
  copy: AboutCopy;
  size: Size;
}

/** Intro and paragraph classes per size: phone first, laptop after `desktop:`. */
const TYPE: Record<Size, { lead: string; body: string }> = {
  // Today: intro 18/28 on both; paragraphs 12/16 phone, 16/24 laptop.
  live: { lead: "text-lead", body: "text-sub desktop:text-body" },
  // Intro one step up to a heading (24/32), paragraphs down to 14/20 on a laptop.
  l: { lead: "text-h3", body: "text-sub desktop:text-[14px] desktop:leading-5" },
  // Intro at 28/36 on a phone and 32/40 on a laptop, paragraphs 14/20.
  xl: {
    lead: "text-[28px] leading-9 tracking-[-0.01em] desktop:text-h2",
    body: "text-sub desktop:text-[14px] desktop:leading-5",
  },
};

const LINK = "w-fit hover:opacity-60";

/** LinkedIn, GitHub and the email, as the live panel has them. */
function Links({ about, stacked = false }: { about: About; stacked?: boolean }) {
  return (
    <div className={stacked ? "flex flex-col gap-y-1" : "flex flex-wrap gap-x-6 gap-y-2"}>
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
        <NextLink href={about.githubUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
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
  );
}

/**
 * Now: the live panel. Lead in the left five columns, the paragraphs in the
 * right seven, links at the foot.
 */
export function Now({ copy, size }: VariantProps) {
  const t = TYPE[size];
  return (
    <div className="flex min-h-full flex-col px-margin pb-6 desktop:grid-site desktop:grid-rows-[auto_1fr] desktop:items-baseline desktop:pb-8">
      <p className={`${t.lead} text-primary desktop:col-span-5`}>{copy.lead}</p>
      <div className={`mt-4 ${t.body} text-primary desktop:col-span-7 desktop:mt-0 [&_p+p]:mt-3`}>
        {copy.paras.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <div className="mt-auto pt-5 text-sub text-primary desktop:col-span-5 desktop:row-start-2 desktop:self-end desktop:pt-0 desktop:text-body">
        <Links about={copy.about} />
      </div>
    </div>
  );
}

/**
 * Rail: one reading column with a rail beside it. The links stand in a
 * narrow left rail, level with the lead; the lead and the paragraphs run
 * down a single measure in the middle. Phone: the rail becomes a row of
 * links on top, the column follows.
 */
export function Rail({ copy, size }: VariantProps) {
  const t = TYPE[size];
  return (
    <div className="flex min-h-full flex-col px-margin pb-6 desktop:grid-site desktop:items-baseline desktop:pb-8">
      <div className="text-sub text-primary desktop:col-span-3 desktop:text-body">
        <div className="desktop:hidden">
          <Links about={copy.about} />
        </div>
        <div className="hidden desktop:block">
          <Links about={copy.about} stacked />
        </div>
      </div>
      <div className="mt-5 border-t border-primary/15 pt-4 desktop:col-span-7 desktop:col-start-5 desktop:mt-0 desktop:border-0 desktop:pt-0">
        <p className={`${t.lead} text-primary`}>{copy.lead}</p>
        <div className={`mt-4 ${t.body} text-primary desktop:mt-6 [&_p+p]:mt-3`}>
          {copy.paras.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Column: everything in one column, centred in the panel and read top to
 * bottom: the intro, the paragraphs under it on the same measure, the links
 * at the panel's foot, all left aligned. Laptop: seven of the twelve
 * columns, centred; phone: the full width.
 */
export function Column({ copy, size }: VariantProps) {
  return (
    <OneColumn
      copy={copy}
      size={size}
      width="desktop:mx-auto desktop:w-[calc((100%+var(--grid-gutter))*7/12-var(--grid-gutter))]"
    />
  );
}

/**
 * Narrow: the same column, with the panel itself drawn in to its width
 * (40rem on a laptop), so the window is the column.
 */
export function Narrow({ copy, size }: VariantProps) {
  return <OneColumn copy={copy} size={size} width="" />;
}

function OneColumn({ copy, size, width }: VariantProps & { width: string }) {
  const t = TYPE[size];
  return (
    <div className="flex min-h-full flex-col px-margin pb-6 desktop:pb-8">
      <div className={`flex flex-1 flex-col ${width}`}>
        <p className={`${t.lead} text-primary`}>{copy.lead}</p>
        <div className={`mt-4 ${t.body} text-primary desktop:mt-6 [&_p+p]:mt-3`}>
          {copy.paras.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <div className="mt-auto pt-5 text-sub text-primary desktop:text-body">
          <Links about={copy.about} />
        </div>
      </div>
    </div>
  );
}
