"use client";

import { useRef } from "react";
import Image from "next/image";
import type { PortableTextBlock } from "next-sanity";
import { PortableText } from "next-sanity";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  useTitleAnimation,
  useInlineAnimation,
} from "@/hooks/useTextAnimation";
import type { ABOUT_QUERY_RESULT } from "@/sanity/types";
import { imageUrl } from "@/sanity/lib/image";
import { dur, ease, prefersReducedMotion, stagger } from "@/lib/motion";
import dynamic from "next/dynamic";
import CopyButton from "@/components/CopyButton";
import SocialLink from "./SocialLink";

const SpotifyWidget = dynamic(() => import("./SpotifyWidget"), { ssr: false });

type AboutBio = NonNullable<NonNullable<ABOUT_QUERY_RESULT>["bio"]>;
type AboutPortrait = NonNullable<ABOUT_QUERY_RESULT>["portrait"];

interface AboutContentProps {
  heading?: string | null;
  bio: AboutBio;
  portrait?: AboutPortrait;
  email?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
}

export default function AboutContent({
  heading,
  bio,
  portrait,
  email,
  linkedinUrl,
  githubUrl,
}: AboutContentProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bioRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const portraitMobileRef = useRef<HTMLDivElement>(null);
  const portraitDesktopRef = useRef<HTMLDivElement>(null);
  const spotifyRef = useRef<HTMLDivElement>(null);

  useTitleAnimation(titleRef, sectionRef, { duration: 1, delay: 0.1 });
  useInlineAnimation(bioRef, sectionRef, "p", { duration: dur.text, delay: 0.1 + stagger });
  useInlineAnimation(linksRef, sectionRef, "[data-animate], a", {
    duration: dur.text,
    delay: 0.1 + 2 * stagger,
  });

  useGSAP(
    () => {
      const targets = [
        portraitMobileRef.current,
        portraitDesktopRef.current,
      ].filter((el) => el && getComputedStyle(el).display !== "none");
      const reduced = prefersReducedMotion();
      if (targets.length) {
        // A nudge and a fade, not a full-width slide.
        gsap.fromTo(
          targets,
          { xPercent: reduced ? 0 : 6, autoAlpha: 0 },
          {
            xPercent: 0,
            autoAlpha: 1,
            duration: dur.text,
            ease: ease.out,
            delay: 0.1 + stagger,
          },
        );
      }
      if (spotifyRef.current) {
        gsap.fromTo(
          spotifyRef.current,
          { yPercent: reduced ? 0 : 20, autoAlpha: 0 },
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: 0.8,
            ease: ease.out,
            delay: 0.4,
          },
        );
      }
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="px-4 py-4 desktop:px-6 desktop:py-6 desktop:flex desktop:items-center desktop:min-h-[calc(100dvh-var(--header-height))]"
    >
      {/* Left column: text content */}
      <div className="desktop:w-2/3 desktop:pr-12">
        {heading && (
          <h1 ref={titleRef} className="text-primary">
            {heading}
          </h1>
        )}

        {/* Mobile portrait — hidden on desktop */}
        {portrait?.asset && (
          <div
            ref={portraitMobileRef}
            className="invisible relative mt-6 aspect-[3/4] w-full overflow-hidden bg-tertiary desktop:hidden"
          >
            <Image
              src={imageUrl(portrait, 780)}
              alt={heading ?? "Portrait"}
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
        )}

        <div
          ref={bioRef}
          className="mt-6 max-w-[680px] text-sub desktop:text-body text-primary [&>p+p]:mt-6"
        >
          <PortableText value={bio as PortableTextBlock[]} />
        </div>

        <div ref={linksRef} className="mt-6 flex items-baseline gap-8">
          {linkedinUrl && <SocialLink href={linkedinUrl} label="LinkedIn" />}
          {githubUrl && <SocialLink href={githubUrl} label="GitHub" />}
          {email && <CopyButton value={email} label="Email" />}
        </div>

        <div ref={spotifyRef} className="mt-6 max-w-[400px] invisible">
          <SpotifyWidget />
        </div>
      </div>

      {/* Right column: portrait — desktop only */}
      {portrait?.asset && (
        <div
          ref={portraitDesktopRef}
          className="invisible hidden desktop:flex desktop:w-1/3 desktop:items-center desktop:justify-center"
        >
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-tertiary">
            <Image
              src={imageUrl(portrait, 780)}
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
