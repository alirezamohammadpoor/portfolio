"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PortableTextBlock } from "next-sanity";
import { PortableText } from "next-sanity";
import {
  useTitleAnimation,
  useBodyAnimation,
  useInlineAnimation,
} from "@/hooks/useTextAnimation";
import type { ABOUT_QUERY_RESULT } from "@/sanity/types";
import { urlFor } from "@/sanity/lib/image";

type AboutBio = NonNullable<NonNullable<ABOUT_QUERY_RESULT>["bio"]>;
type AboutPortrait = NonNullable<ABOUT_QUERY_RESULT>["portrait"];

interface AboutContentProps {
  heading?: string | null;
  bio: AboutBio;
  portrait?: AboutPortrait;
  email?: string | null;
  linkedinUrl?: string | null;
}

export default function AboutContent({
  heading,
  bio,
  portrait,
  email,
  linkedinUrl,
}: AboutContentProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bioRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useTitleAnimation(titleRef, sectionRef, { duration: 2, delay: 1 });
  useBodyAnimation(bioRef, sectionRef, { duration: 2, delay: 1.3 });
  useInlineAnimation(linksRef, sectionRef, "a, span[data-animate]", {
    duration: 2,
    delay: 1.7,
  });

  return (
    <section
      ref={sectionRef}
      className="px-6 py-6 desktop:flex desktop:items-center desktop:min-h-[calc(100dvh-var(--header-height))]"
    >
      {/* Left column: text content */}
      <div className="desktop:w-2/3 desktop:pr-12">
        {heading && (
          <h1 ref={titleRef} className="text-h1 text-primary">
            {heading}
          </h1>
        )}

        {/* Mobile portrait — hidden on desktop */}
        {portrait?.asset && (
          <div className="relative mt-6 aspect-[3/4] w-full overflow-hidden bg-tertiary desktop:hidden">
            <Image
              src={urlFor(portrait).width(780).quality(85).url()}
              alt={heading ?? "Portrait"}
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
        )}

        <div
          ref={bioRef}
          className="mt-6 max-w-[680px] text-sub desktop:text-body text-primary"
        >
          <PortableText value={bio as PortableTextBlock[]} />
        </div>

        <div ref={linksRef} className="mt-16 flex gap-8">
          {email && (
            <a
              href={`mailto:${email}`}
              data-animate
              className="link-underline text-sub desktop:text-body uppercase text-primary"
            >
              Email
            </a>
          )}
          {linkedinUrl && (
            <Link
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline text-sub desktop:text-body uppercase text-primary"
            >
              LinkedIn
            </Link>
          )}
        </div>
      </div>

      {/* Right column: portrait — desktop only */}
      {portrait?.asset && (
        <div className="hidden desktop:flex desktop:w-1/3 desktop:items-center desktop:justify-center">
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-tertiary">
            <Image
              src={urlFor(portrait).width(780).quality(85).url()}
              alt={heading ?? "Portrait"}
              fill
              className="object-cover"
              sizes="33vw"
            />
          </div>
        </div>
      )}
    </section>
  );
}
