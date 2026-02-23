"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PortableTextBlock } from "next-sanity";
import { PortableText } from "next-sanity";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import type { ABOUT_QUERY_RESULT } from "@/sanity/types";
import { urlFor } from "@/sanity/lib/image";

type AboutBio = NonNullable<NonNullable<ABOUT_QUERY_RESULT>["bio"]>;
type AboutPortrait = NonNullable<ABOUT_QUERY_RESULT>["portrait"];

interface AboutContentProps {
  heading?: string | null;
  bio: AboutBio;
  portrait?: AboutPortrait;
  skills?: string[] | null;
  email?: string | null;
  linkedinUrl?: string | null;
}

export default function AboutContent({
  heading,
  bio,
  portrait,
  skills,
  email,
  linkedinUrl,
}: AboutContentProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bioRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLParagraphElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Title — chars drop in
      if (titleRef.current) {
        SplitText.create(titleRef.current, {
          type: "words, chars",
          autoSplit: true,
          mask: "chars",
          charsClass: "char",
          onSplit: (self) =>
            gsap.from(self.chars, {
              duration: 2,
              yPercent: -120,
              scale: 1.2,
              stagger: 0.01,
              ease: "expo.out",
            }),
        });
      }

      // Bio — lines slide up
      if (bioRef.current) {
        SplitText.create(bioRef.current, {
          type: "lines, words",
          autoSplit: true,
          mask: "lines",
          linesClass: "line",
          onSplit: (self) =>
            gsap.from(self.lines, {
              duration: 2,
              yPercent: 105,
              stagger: 0.04,
              ease: "expo.out",
              delay: 0.3,
            }),
        });
      }

      // Skills — lines slide up
      if (skillsRef.current) {
        SplitText.create(skillsRef.current, {
          type: "lines, words",
          autoSplit: true,
          mask: "lines",
          linesClass: "line",
          onSplit: (self) =>
            gsap.from(self.lines, {
              duration: 2,
              yPercent: 105,
              stagger: 0.04,
              ease: "expo.out",
              delay: 0.5,
            }),
        });
      }

      // Links — each link individually
      if (linksRef.current) {
        const links = linksRef.current.querySelectorAll("a");
        links.forEach((link) => {
          SplitText.create(link, {
            type: "lines, words",
            autoSplit: true,
            mask: "lines",
            linesClass: "line",
            onSplit: (self) =>
              gsap.from(self.lines, {
                duration: 2,
                yPercent: 105,
                stagger: 0.04,
                ease: "expo.out",
                delay: 0.7,
              }),
          });
        });
      }
    },
    { scope: sectionRef },
  );

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

        {skills && skills.length > 0 && (
          <p ref={skillsRef} className="mt-6 text-sub text-secondary">
            {skills.join(", ")}
          </p>
        )}

        <div ref={linksRef} className="mt-16 flex gap-8">
          {email && (
            <Link
              href={`mailto:${email}`}
              className="text-sub desktop:text-h3 uppercase text-primary hover:text-pomegranate"
            >
              Email
            </Link>
          )}
          {linkedinUrl && (
            <Link
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sub desktop:text-h3 uppercase text-primary hover:text-pomegranate"
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
