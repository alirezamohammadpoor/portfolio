"use client";

import NextLink from "next/link";
import { PortableText } from "next-sanity";
import CopyButton from "@/components/CopyButton";
import { splitLead } from "@/lib/aboutLead";
import type { BarData } from "@/sanity/lib/bar";

const LINK = "w-fit hover:opacity-60";

/**
 * About inside the capsule (Ali, 11-16): sized to fit a phone without
 * scrolling, left aligned, the bio's first sentence one step above the
 * body instead of a headline.
 */
export default function AboutBody({
  about,
}: {
  about: NonNullable<BarData["about"]>;
}) {
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
        <div className="mt-3 text-sub text-primary desktop:text-body break-words desktop:col-span-7 desktop:mt-0 [&_p+p]:mt-3">
          <PortableText value={body} />
        </div>
      )}
      <div className="mt-auto pt-5 desktop:col-span-5 desktop:row-start-2 desktop:self-end desktop:pt-0">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sub desktop:text-body text-primary">
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
