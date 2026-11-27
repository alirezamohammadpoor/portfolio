"use client";

import NextLink from "next/link";
import { PortableText } from "next-sanity";
import CopyButton from "@/components/CopyButton";
import { splitLead } from "@/lib/aboutLead";
import type { BarData } from "@/sanity/lib/bar";

const LINK = "w-fit hover:opacity-60";

/**
 * About inside the capsule (Ali, 11-16): sized to fit a phone without
 * scrolling, left aligned. Narrow (Ali picked it in /lab/about, 11-27): one
 * column in a panel drawn in to it, the bio's first sentence set as a
 * heading over smaller paragraphs.
 */
export default function AboutBody({
  about,
}: {
  about: NonNullable<BarData["about"]>;
}) {
  const { lead, body } = splitLead(about.bio);
  return (
    // The window is Work's height (fixed), so About fills it: the links sit
    // at its foot.
    <div className="flex min-h-full flex-col px-margin pb-6 desktop:pb-8">
      {lead && <p className="text-h3 text-primary">{lead}</p>}
      {body.length > 0 && (
        <div className="mt-4 break-words text-sub text-primary desktop:mt-6 desktop:text-[14px] desktop:leading-5 [&_p+p]:mt-3">
          <PortableText value={body} />
        </div>
      )}
      <div className="mt-auto pt-5">
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
