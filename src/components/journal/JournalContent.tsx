"use client";

import { useRef } from "react";
import { useTitleAnimation, useBodyAnimation } from "@/hooks/useTextAnimation";
import type { JOURNAL_POSTS_QUERY_RESULT } from "@/sanity/types";
import JournalCard from "./JournalCard";

interface JournalContentProps {
  posts: JOURNAL_POSTS_QUERY_RESULT;
}

export default function JournalContent({ posts }: JournalContentProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  useTitleAnimation(titleRef, sectionRef, { duration: 2, delay: 1 });
  useBodyAnimation(descRef, sectionRef, { duration: 2, delay: 1.3 });

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
