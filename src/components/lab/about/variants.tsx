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

export interface VariantProps {
  copy: AboutCopy;
}

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
 * Now: the live panel, for comparison. Lead in the left five columns, the
 * paragraphs in the right seven, links at the foot.
 */
export function Now({ copy }: VariantProps) {
  return (
    <div className="flex min-h-full flex-col px-margin pb-6 desktop:grid-site desktop:grid-rows-[auto_1fr] desktop:items-baseline desktop:pb-8">
      <p className="text-lead text-primary desktop:col-span-5">{copy.lead}</p>
      <div className="mt-3 text-sub text-primary desktop:col-span-7 desktop:mt-0 desktop:text-body [&_p+p]:mt-3">
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
 * Rows: three bands, read top to bottom. The lead runs wide across the
 * top, the paragraphs sit side by side in three equal columns at the foot,
 * each under a rule, and the links close the panel on a rule of their own.
 * Phone: the same bands stacked, a rule between each paragraph.
 */
export function Rows({ copy }: VariantProps) {
  return (
    <div className="flex min-h-full flex-col px-margin pb-6 desktop:pb-8">
      <p className="text-h3 text-primary desktop:max-w-[52rem] desktop:text-h2">{copy.lead}</p>
      <div className="mt-6 flex flex-col gap-3 text-sub text-primary desktop:mt-auto desktop:grid-site desktop:gap-y-0 desktop:pt-10 desktop:text-body">
        {copy.paras.map((p) => (
          <p key={p} className="border-t border-primary/15 pt-3 desktop:col-span-4">
            {p}
          </p>
        ))}
      </div>
      <div className="mt-auto pt-5 text-sub text-primary desktop:mt-6 desktop:border-t desktop:border-primary/15 desktop:pt-3 desktop:text-body">
        <Links about={copy.about} />
      </div>
    </div>
  );
}

/**
 * Steps: a diagonal reading path. The lead holds the top left and each
 * paragraph steps two columns right of the one before, so the eye walks
 * down and across the panel. Phone: the paragraphs swing between the
 * left three and the right three of the four columns.
 */
export function Steps({ copy }: VariantProps) {
  const desk = ["desktop:col-start-4", "desktop:col-start-6", "desktop:col-start-8"];
  const phone = ["col-start-1", "col-start-2", "col-start-1"];
  return (
    <div className="flex min-h-full flex-col px-margin pb-6 desktop:pb-8">
      <div className="grid-site gap-y-4 desktop:gap-y-6">
        <p className="col-span-4 text-lead text-primary desktop:col-span-6 desktop:text-h3">
          {copy.lead}
        </p>
        {copy.paras.map((p, i) => (
          <p
            key={p}
            className={`col-span-3 text-sub text-primary desktop:col-span-5 desktop:text-body ${phone[i % 3]} ${desk[i % 3]}`}
          >
            {p}
          </p>
        ))}
      </div>
      <div className="mt-auto pt-5 text-sub text-primary desktop:text-body">
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
export function Rail({ copy }: VariantProps) {
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
        <p className="text-lead text-primary desktop:text-h3">{copy.lead}</p>
        <div className="mt-4 text-sub text-primary desktop:mt-6 desktop:text-body [&_p+p]:mt-3">
          {copy.paras.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Poster: the hierarchy turned over. The paragraphs and links sit small at
 * the top, in columns like a colophon; the lead is set large and anchored
 * to the panel's foot, the last thing you read and the first you see.
 */
export function Poster({ copy }: VariantProps) {
  const [first, ...rest] = copy.paras;
  return (
    <div className="flex min-h-full flex-col px-margin pb-6 desktop:pb-8">
      <div className="flex flex-col gap-3 text-sub text-primary desktop:grid-site desktop:gap-y-0 desktop:text-[14px] desktop:leading-5">
        <div className="order-last pt-1 desktop:order-none desktop:col-span-3 desktop:pt-0">
          <div className="desktop:hidden">
            <Links about={copy.about} />
          </div>
          <div className="hidden desktop:block">
            <Links about={copy.about} stacked />
          </div>
        </div>
        {first && <p className="desktop:col-span-4 desktop:col-start-5">{first}</p>}
        <div className="flex flex-col gap-3 desktop:col-span-4 desktop:col-start-9">
          {rest.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </div>
      <p className="mt-auto pt-8 text-h3 text-primary desktop:max-w-[60rem] desktop:text-h1">
        {copy.lead}
      </p>
    </div>
  );
}
