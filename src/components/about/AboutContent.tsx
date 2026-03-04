"use client";

import { useRef, useState } from "react";
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

function EmailCopyButton({ email }: { email: string }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative inline-block">
      {/* Tooltip — appears above, desktop only */}
      <div
          className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 ml-2 hidden desktop:flex items-center justify-center px-2 py-1 whitespace-nowrap bg-pistachio text-primary transition-all duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
        >
          <span className="text-sub uppercase invisible">Click to copy</span>
          <span
            className={`text-sub uppercase absolute transition-opacity duration-300 ${copied ? "opacity-0" : "opacity-100"}`}
          >
            Click to copy
          </span>
          <span
            className={`text-sub uppercase absolute transition-opacity duration-300 ${copied ? "opacity-100" : "opacity-0"}`}
          >
            Copied
          </span>
        </div>
      {/* Email is the clickable element */}
      <button
        data-animate
        onClick={handleCopy}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="link-underline text-sub desktop:text-body uppercase text-primary cursor-pointer"
      >
        Email
      </button>
    </div>
  );
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
  useInlineAnimation(linksRef, sectionRef, "[data-animate], a", {
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
          {email && <EmailCopyButton email={email} />}
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
