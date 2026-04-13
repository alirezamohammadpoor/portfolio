"use client";

import { useRef } from "react";
import Image from "next/image";
import type { PortableTextBlock } from "next-sanity";
import { PortableText } from "next-sanity";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useTitleAnimation, useBodyAnimation } from "@/hooks/useTextAnimation";
import type {
  JOURNAL_POST_BY_SLUG_QUERY_RESULT,
  JOURNAL_POSTS_QUERY_RESULT,
} from "@/sanity/types";
import { urlFor } from "@/sanity/lib/image";
import JournalCard from "./JournalCard";
import GlossaryTerm from "./GlossaryTerm";
import RichPreview from "./RichPreview";

interface JournalPostProps {
  post: NonNullable<JOURNAL_POST_BY_SLUG_QUERY_RESULT>;
  relatedPosts: JOURNAL_POSTS_QUERY_RESULT;
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
        className="link-highlight border-b border-primary"
      >
        {children}
      </a>
    ),
    glossary: ({
      value,
      children,
    }: {
      value?: { explanation?: string };
      children: React.ReactNode;
    }) => (
      <GlossaryTerm explanation={value?.explanation ?? ""}>
        {children}
      </GlossaryTerm>
    ),
    richPreview: ({
      value,
      children,
    }: {
      value?: {
        videoUrl?: string;
        image?: { asset?: { _ref: string }; alt?: string };
        url?: string;
        label?: string;
      };
      children: React.ReactNode;
    }) => {
      const imageUrl = value?.image?.asset
        ? urlFor(value.image).width(1200).quality(85).url()
        : undefined;
      return (
        <RichPreview
          videoUrl={value?.videoUrl}
          imageUrl={imageUrl}
          imageAlt={value?.image?.alt}
          url={value?.url}
          label={value?.label}
        >
          {children}
        </RichPreview>
      );
    },
  },
  types: {
    image: ({
      value,
    }: {
      value: {
        asset?: { _ref: string };
        hotspot?: unknown;
        crop?: unknown;
        alt?: string;
      };
    }) => {
      if (!value?.asset) return null;
      return (
        <div className="relative my-8 aspect-[4/3] w-full overflow-hidden">
          <Image
            src={urlFor(value).width(1400).quality(85).url()}
            alt={value.alt ?? ""}
            fill
            className="object-contain"
            sizes="(min-width: 75rem) 50vw, 100vw"
          />
        </div>
      );
    },
    quote: ({
      value,
    }: {
      value: { text?: PortableTextBlock[]; attribution?: PortableTextBlock[] };
    }) => (
      <blockquote className="my-8">
        <div className="text-sub desktop:text-body text-primary font-medium italic [&>p]:inline">
          &ldquo;
          {value.text && (
            <PortableText
              value={value.text}
              components={{
                ...portableTextComponents,
                marks: {
                  ...portableTextComponents.marks,
                  richPreview: ({
                    children,
                  }: {
                    children: React.ReactNode;
                  }) => <span>{children}</span>,
                  glossary: ({ children }: { children: React.ReactNode }) => (
                    <span>{children}</span>
                  ),
                },
              }}
            />
          )}
          &rdquo;
        </div>
        {value.attribution && (
          <cite className="mt-2 block text-sub desktop:text-body text-primary not-italic [&>p]:inline">
            —{" "}
            <PortableText
              value={value.attribution}
              components={portableTextComponents}
            />
          </cite>
        )}
      </blockquote>
    ),
  },
};

export default function JournalPost({ post, relatedPosts }: JournalPostProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const excerptRef = useRef<HTMLParagraphElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLElement>(null);

  // Hero text animations (SplitText)
  useTitleAnimation(titleRef, heroRef, { duration: 2, delay: 1 });
  useBodyAnimation(excerptRef, heroRef, { duration: 2, delay: 1.3 });

  // Image, body, and carousel animations (opacity fade)
  useGSAP(
    () => {
      if (imageRef.current) {
        gsap.fromTo(
          imageRef.current,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 1.5, ease: "power3.out", delay: 1 },
        );
      }
      if (bodyRef.current) {
        gsap.fromTo(
          bodyRef.current,
          { autoAlpha: 0, y: 20 },
          { autoAlpha: 1, y: 0, duration: 1.2, ease: "power3.out", delay: 1.5 },
        );
      }
      if (carouselRef.current) {
        gsap.fromTo(
          carouselRef.current,
          { autoAlpha: 0, y: 30 },
          { autoAlpha: 1, y: 0, duration: 1.2, ease: "power3.out", delay: 1.8 },
        );
      }
    },
    { scope: heroRef, dependencies: [post._id] },
  );

  return (
    <>
      {/* Hero: stacked on mobile, 50/50 split on desktop */}
      <div
        ref={heroRef}
        className="flex flex-col-reverse desktop:flex-row desktop:h-[calc(100dvh-var(--header-height))]"
      >
        <div className="px-4 py-6 desktop:flex desktop:w-1/2 desktop:items-center desktop:px-6">
          <div>
            <h1 ref={titleRef} className="text-primary">
              {post.title}
            </h1>
            {post.excerpt && (
              <p
                ref={excerptRef}
                className="mt-4 text-sub desktop:text-body text-primary"
              >
                {post.excerpt}
              </p>
            )}
          </div>
        </div>
        {post.coverImage?.asset && (
          <div
            ref={imageRef}
            className="invisible relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-tertiary desktop:aspect-auto desktop:w-1/2"
          >
            <Image
              src={urlFor(post.coverImage).width(1920).quality(85).url()}
              alt={post.title ?? ""}
              fill
              className="object-cover"
              sizes="(min-width: 75rem) 50vw, 100vw"
              priority
            />
          </div>
        )}
      </div>
      {/* Body content */}
      <article className="mx-auto desktop:max-w-[50vw] px-4 py-6 desktop:px-6">
        {post.body && (
          <div
            ref={bodyRef}
            className="invisible text-sub desktop:text-body text-primary space-y-4 [&>h2]:mt-12 [&>h3]:mt-10"
          >
            <PortableText
              value={post.body as PortableTextBlock[]}
              components={portableTextComponents}
            />
          </div>
        )}
      </article>
      {relatedPosts.length > 0 && (
        <section
          ref={carouselRef}
          className="invisible mx-auto desktop:max-w-[50vw] mt-16 pb-8 px-4 desktop:px-6"
        >
          <h4 className="uppercase">More posts</h4>
          <div className="mt-4 flex gap-2 overflow-x-auto snap-x snap-mandatory">
            {relatedPosts.map((relatedPost) => (
              <div
                key={relatedPost._id}
                className="min-w-[280px] max-w-[400px] shrink-0 snap-start"
              >
                <JournalCard post={relatedPost} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
