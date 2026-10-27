"use client";

/**
 * The chapter project page (brief-v2, Figma frame E): hero + chapters + next
 * project on one scrolling page, for projects that carry `chapters[]`.
 *
 * Hero: today's split, minus the drawer. Title, description, tech stack and
 * the pills on the left (cols 1-5); the first gallery item as the 4:3 landing
 * media on the right (cols 7-12), which is where the home → project clone
 * lands. On a phone the landing media sits on top and the text follows.
 *
 * Chapters: one media + its own title, text and caption. Laptop layouts per
 * chapter (half / wide / full / narrow, left or right); each gets about a
 * screen of air with the text block centred on the media. Phone: one column,
 * media first, then caption, title and text. Media autoplays muted in view
 * through the shared VideoPlayer; the text is static.
 *
 * Next project: the same 4:3 preview block as the gallery page (the morph
 * source for project → project) with the next title beside it.
 */

import type { RefObject } from "react";
import NextLink from "next/link";
import Image from "next/image";
import { Link } from "next-view-transitions";
import type { PortableTextBlock } from "next-sanity";
import { PortableText } from "next-sanity";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import TechStack from "@/components/project/TechStack";
import CopyButton from "@/components/CopyButton";
import { portableTextComponents } from "@/components/portableText/components";
import NextProjectPreview, { type NextProject } from "@/components/project/NextProjectPreview";
import VideoPlayer from "@/components/player/VideoPlayer";
import LandingMedia from "@/components/project/LandingMedia";
import { isPlainLeftClick } from "@/lib/clicks";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
export type Chapter = NonNullable<Project["chapters"]>[number];

interface ProjectChaptersProps {
  project: Project;
  /** Under the clone: media invisible, no playback. The text has its own gate. */
  hidden: boolean;
  /** Hero text waits for the clone to be ~40 % of the way (contentRevealed). */
  textHidden: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
  titleRef: RefObject<HTMLHeadingElement | null>;
  descRef: RefObject<HTMLDivElement | null>;
  techRef: RefObject<HTMLDivElement | null>;
  linksRef: RefObject<HTMLDivElement | null>;
  /** The page root: scroll progress, and the column the next-project morph slides. */
  galleryRef: RefObject<HTMLDivElement | null>;
  /** The landing media box: the clone's target rect. */
  firstImageRef: RefObject<HTMLDivElement | null>;
  onFirstReady?: () => void;
  nextProject?: NextProject | null;
  previewRef?: RefObject<HTMLDivElement | null>;
  onNavigateNext?: () => void;
}

// 12-column placements (laptop). `text` is centred on the media's row.
const LAYOUTS = {
  half: {
    right: { media: "desktop:col-start-7 desktop:col-end-13", text: "desktop:col-start-1 desktop:col-end-6" },
    left: { media: "desktop:col-start-1 desktop:col-end-7", text: "desktop:col-start-8 desktop:col-end-13" },
  },
  wide: {
    left: { media: "desktop:col-start-1 desktop:col-end-8", text: "desktop:col-start-9 desktop:col-end-13" },
    right: { media: "desktop:col-start-6 desktop:col-end-13", text: "desktop:col-start-1 desktop:col-end-5" },
  },
  narrow: {
    right: { media: "desktop:col-start-8 desktop:col-end-12", text: "desktop:col-start-1 desktop:col-end-6" },
    left: { media: "desktop:col-start-2 desktop:col-end-6", text: "desktop:col-start-8 desktop:col-end-13" },
  },
} as const;

type Side = "left" | "right";

function placement(chapter: Chapter) {
  const layout = chapter.layout === "wide" || chapter.layout === "narrow" ? chapter.layout : "half";
  const side: Side = chapter.side === "left" ? "left" : "right";
  return LAYOUTS[layout][side];
}

function ChapterMedia({ chapter, title, hidden }: { chapter: Chapter; title: string; hidden: boolean }) {
  const media = chapter.media;
  if (!media) return null;
  if (media.type === "video" && media.video?.asset?._ref) {
    return (
      <VideoPlayer
        src={fileUrl(media.video.asset._ref)}
        poster={media.poster?.asset ? imageUrl(media.poster, 1600) : undefined}
        label={title}
        layout="overlay"
        language="icons"
        aspect="auto"
        hasAudio={false}
        autoplay={!hidden}
        trackId={`${title}`}
      />
    );
  }
  if (media.type === "image" && media.image?.asset) {
    const dims = media.image.asset.metadata?.dimensions;
    const ratio = dims?.width && dims?.height ? `${dims.width} / ${dims.height}` : "4 / 3";
    return (
      <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: ratio }}>
        <Image
          src={imageUrl(media.image, 1600)}
          alt={title}
          fill
          className="object-cover"
          sizes="(min-width: 75rem) 60vw, 100vw"
        />
      </div>
    );
  }
  return null;
}

function ChapterText({ chapter, display = false }: { chapter: Chapter; display?: boolean }) {
  const text = Array.isArray(chapter.text) && chapter.text.length > 0 ? (chapter.text as PortableTextBlock[]) : null;
  return (
    <>
      {!display && chapter.title && (
        <h2 className="text-h3 desktop:text-h2 text-primary">{chapter.title}</h2>
      )}
      {text && (
        <div className="mt-4 desktop:mt-6 text-body text-primary [&>p]:my-0 [&>p+p]:mt-3">
          <PortableText value={text} components={portableTextComponents} />
        </div>
      )}
    </>
  );
}

function ChapterSection({ chapter, index, hidden }: { chapter: Chapter; index: number; hidden: boolean }) {
  const title = chapter.title ?? `Chapter ${index + 1}`;
  const caption = chapter.caption ? (
    <p className="mt-3 text-sub text-secondary">{chapter.caption}</p>
  ) : null;

  if (chapter.layout === "full") {
    return (
      <section className="grid-site px-margin py-10 desktop:py-20" aria-label={title}>
        {/* Phone: media, caption, title, text. Laptop: display title, media, text + caption. */}
        <h2 className="order-3 desktop:order-none col-span-4 desktop:col-start-1 desktop:col-end-10 text-h3 desktop:text-display text-primary mt-4 desktop:mt-0 desktop:mb-10">
          {title}
        </h2>
        <div className="order-1 desktop:order-none col-span-4 desktop:col-span-12">
          <ChapterMedia chapter={chapter} title={title} hidden={hidden} />
        </div>
        <div className="order-2 desktop:order-none col-span-4 desktop:col-start-7 desktop:col-end-13 desktop:mt-3">
          {caption}
        </div>
        <div className="order-4 desktop:order-none col-span-4 desktop:col-start-1 desktop:col-end-6 desktop:-mt-7 desktop:pt-3">
          <ChapterText chapter={chapter} display />
        </div>
      </section>
    );
  }

  const place = placement(chapter);
  return (
    <section
      className="grid-site px-margin items-center py-10 desktop:min-h-[min(860px,100dvh)] desktop:py-20"
      aria-label={title}
    >
      <div className={`col-span-4 ${place.media}`}>
        <ChapterMedia chapter={chapter} title={title} hidden={hidden} />
        {caption}
      </div>
      <div className={`col-span-4 mt-4 desktop:mt-0 desktop:self-center ${place.text}`}>
        <ChapterText chapter={chapter} />
      </div>
    </section>
  );
}

export default function ProjectChapters({
  project,
  hidden,
  textHidden,
  panelRef,
  titleRef,
  descRef,
  techRef,
  linksRef,
  galleryRef,
  firstImageRef,
  onFirstReady,
  nextProject,
  previewRef,
  onNavigateNext,
}: ProjectChaptersProps) {
  const chapters = project.chapters ?? [];
  const landing = project.gallery?.[0] ?? null;
  const mediaGate = hidden ? " opacity-0 pointer-events-none" : "";
  const journalSlug = project.caseStudy?.slug?.current;

  const pill =
    "inline-flex h-8 items-center rounded-full px-4 text-sub uppercase text-primary transition-colors duration-200";

  return (
    <div ref={galleryRef} data-project-gallery className="pb-10">
      {/* Hero */}
      <section className="grid-site px-margin pt-2 desktop:pt-6 desktop:min-h-[calc(100dvh-var(--header-height))]">
        <div
          data-landing-slot
          className={`col-span-4 self-start desktop:col-start-7 desktop:col-end-13 desktop:row-start-1${mediaGate}`}
        >
          <LandingMedia item={landing} title={project.title} slotRef={firstImageRef} onReady={onFirstReady} />
        </div>
        <div
          ref={panelRef}
          className={`col-span-4 pt-6 desktop:col-start-1 desktop:col-end-6 desktop:row-start-1 desktop:pt-14${textHidden ? " invisible" : ""}`}
        >
          {project.title && (
            <h1 ref={titleRef} className="text-h2 desktop:text-h1 text-primary">
              {project.title}
            </h1>
          )}
          {Array.isArray(project.fullDescription) && project.fullDescription.length > 0 && (
            <div
              ref={descRef}
              className="mt-4 text-body text-primary [&>p]:my-0 [&>p+p]:mt-3 [&>h2]:mt-12 [&>h3]:mt-10"
            >
              <PortableText
                value={project.fullDescription as PortableTextBlock[]}
                components={portableTextComponents}
              />
            </div>
          )}
          {project.techStack && project.techStack.length > 0 && (
            <div ref={techRef} className="mt-6">
              <p className="text-sub text-secondary">Tech stack</p>
              <TechStack items={project.techStack} />
            </div>
          )}
          <div ref={linksRef} className="mt-8 flex flex-wrap items-center gap-2">
            {project.siteUrl && (
              <NextLink
                href={project.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-pill
                className={`invisible ${pill} bg-pistachio hover:bg-lightpistachio`}
              >
                Visit website
              </NextLink>
            )}
            {journalSlug && (
              <Link
                href={`/journal/${journalSlug}`}
                data-pill
                className={`invisible ${pill} border border-tertiary bg-white hover:bg-lightpistachio`}
              >
                Journal post
              </Link>
            )}
            {project.sitePassword && <CopyButton value={project.sitePassword} label="Password" />}
          </div>
        </div>
      </section>

      {/* Chapters */}
      <div className={mediaGate}>
        {chapters.map((chapter, i) => (
          <ChapterSection key={chapter._key} chapter={chapter} index={i} hidden={hidden} />
        ))}

        {/* Next project */}
        {nextProject && onNavigateNext && nextProject.slug?.current && (
          <section
            className="grid-site px-margin pt-10 pb-24 desktop:min-h-[calc(100dvh-var(--header-height))] desktop:pt-6"
            aria-label="Next project"
          >
            <div className="col-span-4 desktop:col-start-1 desktop:col-end-6 desktop:row-start-1 desktop:pt-14">
              <p className="text-sub text-secondary">Next project</p>
              <h2 className="mt-2 text-h2 desktop:text-h1 text-primary">
                <a
                  href={`/project/${nextProject.slug.current}`}
                  className="link-underline"
                  onClick={(e) => {
                    if (!isPlainLeftClick(e)) return;
                    e.preventDefault();
                    onNavigateNext();
                  }}
                >
                  {nextProject.title}
                </a>
              </h2>
            </div>
            <div className="col-span-4 mt-4 desktop:mt-0 desktop:col-start-7 desktop:col-end-13 desktop:row-start-1">
              <NextProjectPreview
                nextProject={nextProject}
                previewRef={previewRef}
                onNavigate={onNavigateNext}
                sizes="(min-width: 75rem) 50vw, 100vw"
                labelHidden
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
