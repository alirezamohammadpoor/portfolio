"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useTitleAnimation, useBodyAnimation } from "@/hooks/useTextAnimation";
import type { JOURNAL_POSTS_QUERY_RESULT } from "@/sanity/types";
import JournalCard from "./JournalCard";

interface JournalContentProps {
  posts: JOURNAL_POSTS_QUERY_RESULT;
  description?: string | null;
}

export default function JournalContent({
  posts,
  description,
}: JournalContentProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useTitleAnimation(titleRef, sectionRef, { duration: 2, delay: 1 });
  useBodyAnimation(descRef, sectionRef, { duration: 2, delay: 1.3 });

  useGSAP(
    () => {
      if (!gridRef.current) return;
      const cards = gridRef.current.querySelectorAll(":scope > a");
      if (!cards.length) return;

      gsap.fromTo(
        cards,
        { yPercent: 100, autoAlpha: 0 },
        {
          yPercent: 0,
          autoAlpha: 1,
          duration: 2,
          ease: "power3.out",
          delay: 1.7,
        },
      );
    },
    { scope: gridRef },
  );

  return (
    <section ref={sectionRef} className="px-4 py-4 desktop:px-6 desktop:py-6">
      <h1 ref={titleRef} className="text-h1 text-primary">
        Journal
      </h1>
      {description && (
        <p
          ref={descRef}
          className="mt-2 desktop:max-w-[33vw] text-sub desktop:text-body text-primary"
        >
          {description}
        </p>
      )}

      <div
        ref={gridRef}
        className="mt-8 grid grid-cols-1 gap-8 desktop:grid-cols-3"
      >
        {posts.length === 0 ? (
          <p className="text-body text-secondary">No posts yet.</p>
        ) : (
          posts.map((post) => <JournalCard key={post._id} post={post} />)
        )}
      </div>
    </section>
  );
}
