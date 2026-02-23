"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import type { JOURNAL_POSTS_QUERY_RESULT } from "@/sanity/types";
import JournalCard from "./JournalCard";

interface JournalContentProps {
  posts: JOURNAL_POSTS_QUERY_RESULT;
}

export default function JournalContent({ posts }: JournalContentProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

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

      // Description — lines slide up
      if (descRef.current) {
        SplitText.create(descRef.current, {
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
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="py-6 px-6">
      <h1 ref={titleRef} className="text-h1 text-primary">
        Journal
      </h1>
      <p ref={descRef} className="mt-4 max-w-[680px] text-sub text-primary">
        Where I share what I&apos;m thinking about — case studies from projects,
        technical decisions, and notes from the journey. Part reflection, part
        documentation.
      </p>

      <div className="mt-16 grid grid-cols-1 gap-8 desktop:grid-cols-3">
        {posts.length === 0 ? (
          <p className="text-body text-secondary">No posts yet.</p>
        ) : (
          posts.map((post) => <JournalCard key={post._id} post={post} />)
        )}
      </div>
    </section>
  );
}
