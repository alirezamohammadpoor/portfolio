"use client";

import { useRef } from "react";
import type { PortableTextBlock } from "next-sanity";
import { PortableText } from "next-sanity";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import type { JOURNAL_POST_BY_SLUG_QUERY_RESULT } from "@/sanity/types";

interface JournalPostProps {
  post: NonNullable<JOURNAL_POST_BY_SLUG_QUERY_RESULT>;
}

export default function JournalPost({ post }: JournalPostProps) {
  const articleRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

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

      // Body — lines slide up
      if (bodyRef.current) {
        SplitText.create(bodyRef.current, {
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
    { scope: articleRef },
  );

  return (
    <article ref={articleRef} className="mx-auto max-w-[560px] px-6 py-16">
      <h1 ref={titleRef} className="text-display text-primary">
        {post.title}
      </h1>
      {post.body && (
        <div ref={bodyRef} className="mt-4 text-body text-primary">
          <PortableText value={post.body as PortableTextBlock[]} />
        </div>
      )}
    </article>
  );
}
