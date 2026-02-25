"use client";

import { useRef } from "react";
import type { PortableTextBlock } from "next-sanity";
import { PortableText } from "next-sanity";
import { useTitleAnimation, useBodyAnimation } from "@/hooks/useTextAnimation";
import type { JOURNAL_POST_BY_SLUG_QUERY_RESULT } from "@/sanity/types";

interface JournalPostProps {
  post: NonNullable<JOURNAL_POST_BY_SLUG_QUERY_RESULT>;
}

export default function JournalPost({ post }: JournalPostProps) {
  const articleRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useTitleAnimation(titleRef, articleRef, { duration: 2, delay: 1 });
  useBodyAnimation(bodyRef, articleRef, { duration: 2, delay: 1.3 });

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
