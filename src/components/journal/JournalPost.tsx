"use client";

import { useRef } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import type { PortableTextBlock } from "next-sanity";
import { PortableText } from "next-sanity";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useTitleAnimation, useBodyAnimation } from "@/hooks/useTextAnimation";
import type {
  JOURNAL_POST_BY_SLUG_QUERY_RESULT,
  JOURNAL_POSTS_QUERY_RESULT,
} from "@/sanity/types";
import { imageUrl } from "@/sanity/lib/image";
import { portableTextComponents } from "@/components/portableText/components";
import JournalCard from "./JournalCard";

interface JournalPostProps {
  post: NonNullable<JOURNAL_POST_BY_SLUG_QUERY_RESULT>;
  relatedPosts: JOURNAL_POSTS_QUERY_RESULT;
}

export default function JournalPost({ post, relatedPosts }: JournalPostProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const excerptRef = useRef<HTMLParagraphElement>(null);
  const bylineRef = useRef<HTMLParagraphElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLElement>(null);

  // Hero text animations (SplitText)
  useTitleAnimation(titleRef, heroRef, { duration: 2, delay: 1 });
  useBodyAnimation(excerptRef, heroRef, { duration: 2, delay: 1.3 });

  // Byline gets a plain fade-up instead of SplitText. SplitText wraps each
  // word in an inline-block span; CSS text-decoration doesn't propagate to
  // atomic inline-level descendants, so the link's underline ends up
  // painting only in the gaps between words and shows up as underscores.
  useGSAP(
    () => {
      if (!bylineRef.current) return;
      gsap.from(bylineRef.current, {
        autoAlpha: 0,
        y: 20,
        duration: 1.5,
        delay: 1.6,
        ease: "power3.out",
      });
    },
    { scope: heroRef },
  );

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
        className="flex flex-col-reverse desktop:flex-col"
      >
        <div className="px-4 py-6 desktop:px-margin desktop:pt-16 desktop:pb-10">
          <div className="desktop:grid-site">
            <div className="desktop:col-span-10 desktop:[&>h1]:max-w-none desktop:[&>p]:max-w-[calc(6*var(--grid-col)+5*var(--grid-gutter))]">
            <h1 ref={titleRef} className="text-primary text-[32px] leading-[40px] desktop:text-[48px] desktop:leading-[56px] font-normal">
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
            {post.publishedAt && (
              <p ref={bylineRef} className="mt-6 text-sub text-primary">
                By{" "}
                <Link href="/about" className="underline underline-offset-2 decoration-primary">
                  Ali Reza Mohammad Poor
                </Link>
                {" · "}
                <time dateTime={post.publishedAt}>
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </p>
            )}
            </div>
          </div>
        </div>
        {post.coverImage?.asset && (
          <div
            ref={imageRef}
            className="invisible relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-tertiary desktop:aspect-video"
          >
            <Image
              src={imageUrl(post.coverImage, 1400)}
              alt={post.coverImage.alt ?? post.title ?? ""}
              fill
              className="object-cover"
              sizes="100vw"
              priority
              fetchPriority="high"
            />
          </div>
        )}
      </div>
      {/* Body content */}
      <article className="px-4 py-6 desktop:px-margin desktop:grid-site desktop:pt-16">
        <aside className="hidden desktop:block desktop:col-span-3 desktop:self-start desktop:sticky desktop:top-[calc(var(--header-height)+24px)] text-sub text-primary">
          {post.publishedAt && (
            <div>
              <p className="uppercase text-secondary">Published</p>
              <p className="mt-1">
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-6">
              <p className="uppercase text-secondary">Tags</p>
              <p className="mt-1">{post.tags.join(" · ")}</p>
            </div>
          )}
        </aside>
        {post.body && (
          <div
            ref={bodyRef}
            className="invisible text-sub desktop:text-body text-primary space-y-4 desktop:col-span-7 desktop:col-start-5 [&>h2]:mt-12 [&>h3]:mt-10 [&>h4]:mt-8 [&_h2]:text-[32px] [&_h2]:leading-[40px] desktop:[&_h2]:text-[40px] desktop:[&_h2]:leading-[48px] [&_h3]:text-[24px] [&_h3]:leading-[32px] desktop:[&_h3]:text-[32px] desktop:[&_h3]:leading-[40px] [&_h4]:text-[16px] [&_h4]:leading-[24px] desktop:[&_h4]:text-[24px] desktop:[&_h4]:leading-[32px] [&_h5]:text-[14px] [&_h5]:leading-[20px] desktop:[&_h5]:text-[20px] desktop:[&_h5]:leading-[28px] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
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
          className="invisible mt-16 pb-8 px-4 desktop:px-margin"
        >
          <h2 className="uppercase text-sub desktop:text-body">More posts</h2>
          <div className="mt-4 flex gap-2 overflow-x-auto snap-x snap-mandatory">
            {relatedPosts.map((relatedPost) => (
              <div
                key={relatedPost._id}
                className="min-w-[280px] max-w-[400px] shrink-0 snap-start desktop:w-[calc(4*var(--grid-col)+3*var(--grid-gutter))] desktop:max-w-none"
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
