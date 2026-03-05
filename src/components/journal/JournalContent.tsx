"use client";

import { useRef } from "react";
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

  useTitleAnimation(titleRef, sectionRef, { duration: 2, delay: 1 });
  useBodyAnimation(descRef, sectionRef, { duration: 2, delay: 1.3 });

  return (
    <section ref={sectionRef} className="px-4 py-4 desktop:px-6 desktop:py-6">
      <h1 ref={titleRef} className="text-h1 text-primary">
        Journal
      </h1>
      {description && (
        <p ref={descRef} className="mt-2 max-w-[33vw] text-sub text-primary">
          {description}
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 desktop:grid-cols-3">
        {posts.length === 0 ? (
          <p className="text-body text-secondary">No posts yet.</p>
        ) : (
          posts.map((post) => <JournalCard key={post._id} post={post} />)
        )}
      </div>
    </section>
  );
}
