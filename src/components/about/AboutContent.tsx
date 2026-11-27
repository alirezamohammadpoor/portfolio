"use client";

import { useRef, type ReactNode } from "react";
import {
  useTitleAnimation,
  useInlineAnimation,
} from "@/hooks/useTextAnimation";
import { dur, stagger } from "@/lib/motion";
import CopyButton from "@/components/CopyButton";
import SocialLink from "./SocialLink";

interface AboutContentProps {
  heading?: string | null;
  /** The bio, rendered on the server (PortableText) and only animated here. */
  bio: ReactNode;
  email?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
}

export default function AboutContent({
  heading,
  bio,
  email,
  linkedinUrl,
  githubUrl,
}: AboutContentProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bioRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useTitleAnimation(titleRef, sectionRef, { duration: 1, delay: 0.1 });
  useInlineAnimation(bioRef, sectionRef, "p", { duration: dur.text, delay: 0.1 + stagger });
  useInlineAnimation(linksRef, sectionRef, "[data-animate], a", {
    duration: dur.text,
    delay: 0.1 + 2 * stagger,
  });

  return (
    <section
      ref={sectionRef}
      className="px-4 py-4 desktop:px-6 desktop:py-6 desktop:flex desktop:items-center desktop:min-h-[calc(100dvh-var(--header-height))]"
    >
      <div className="desktop:w-2/3 desktop:pr-12">
        {heading && (
          <h1 ref={titleRef} className="text-primary">
            {heading}
          </h1>
        )}

        <div
          ref={bioRef}
          className="mt-6 max-w-[680px] text-sub desktop:text-body text-primary [&>p+p]:mt-6"
        >
          {bio}
        </div>

        <div ref={linksRef} className="mt-6 flex items-baseline gap-8">
          {linkedinUrl && <SocialLink href={linkedinUrl} label="LinkedIn" />}
          {githubUrl && <SocialLink href={githubUrl} label="GitHub" />}
          {email && <CopyButton value={email} label="Email" />}
        </div>
      </div>
    </section>
  );
}
