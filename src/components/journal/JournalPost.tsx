"use client";

import { useRef } from "react";
import type { PortableTextBlock } from "next-sanity";
import { PortableText } from "next-sanity";
import { Link } from "next-view-transitions";
import {
  useTitleAnimation,
  useInlineAnimation,
} from "@/hooks/useTextAnimation";
import type {
  JOURNAL_POST_BY_SLUG_QUERY_RESULT,
  ADJACENT_JOURNAL_POSTS_QUERY_RESULT,
} from "@/sanity/types";

type AdjacentPost = NonNullable<ADJACENT_JOURNAL_POSTS_QUERY_RESULT>["prev"];

interface JournalPostProps {
  post: NonNullable<JOURNAL_POST_BY_SLUG_QUERY_RESULT>;
  prevPost: AdjacentPost;
  nextPost: AdjacentPost;
}

const portableTextComponents = {
  marks: {
    underline: ({ children }: { children: React.ReactNode }) => (
      <span className="underline">{children}</span>
    ),
    link: ({
      value,
      children,
    }: {
      value?: { href?: string };
      children: React.ReactNode;
    }) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noopener noreferrer"
        className="border-b border-primary"
      >
        {children}
      </a>
    ),
  },
  types: {
    quote: ({ value }: { value: { text: string; attribution?: string } }) => (
      <blockquote className="my-8">
        <p className="text-body text-primary font-medium italic">
          &ldquo;{value.text}&rdquo;
        </p>
        {value.attribution && (
          <cite className="mt-2 block text-body text-secondary not-italic">
            — {value.attribution}
          </cite>
        )}
      </blockquote>
    ),
  },
};

export default function JournalPost({
  post,
  prevPost,
  nextPost,
}: JournalPostProps) {
  const articleRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useTitleAnimation(titleRef, articleRef, { duration: 2, delay: 1 });
  useInlineAnimation(
    bodyRef,
    articleRef,
    ":scope > p, :scope > h1, :scope > h2, :scope > h3, blockquote p, blockquote cite",
    {
      duration: 2,
      delay: 1.3,
    },
  );

  return (
    <>
      <article
        ref={articleRef}
        className="mx-auto desktop:max-w-[50vw] px-4 py-6 desktop:px-6"
      >
        <h1 ref={titleRef} className="text-primary py-6">
          {post.title}
        </h1>
        {post.body && (
          <div ref={bodyRef} className="text-body text-primary space-y-4">
            <PortableText
              value={post.body as PortableTextBlock[]}
              components={portableTextComponents}
            />
          </div>
        )}
      </article>
      {(prevPost || nextPost) && (
        <nav className="mx-auto mt-4 flex items-start justify-between border-t border-tertiary px-4 pt-8 pb-8 desktop:max-w-[50vw] desktop:px-6">
          <div>
            {prevPost && (
              <Link href={`/journal/${prevPost.slug?.current}`}>
                <span className="text-sub text-secondary">Previous</span>
                <p className="mt-1 text-body text-primary">{prevPost.title}</p>
              </Link>
            )}
          </div>
          <div className="text-right">
            {nextPost && (
              <Link href={`/journal/${nextPost.slug?.current}`}>
                <span className="text-sub text-secondary">Next</span>
                <p className="mt-1 text-body text-primary">{nextPost.title}</p>
              </Link>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
