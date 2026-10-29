"use client";

/**
 * The chapter project page (brief-v3 "lanes"): hero + chapters + next project
 * on one scrolling page, for projects that carry `chapters[]`.
 *
 * Hero (layout redesign 10-29, shared with the home canvas): the first
 * gallery item as the 4:3 landing media over eight columns, which is where
 * the home → project clone lands, with the title and description hung on the
 * media's bottom edge in the four columns beside it. Two fixed variants
 * alternate per project: media right (cols 5-12, text 1-4) and media left
 * (cols 1-8, text 9-12). Under both, a meta row beneath a rule carries the
 * plain values (stack, links), no labels. On a phone the media sits on top
 * and the text and the meta row follow at full width.
 *
 * Chapters (laptop): a text row with the title in the title lane (cols 1-3)
 * and the reading lane (cols 5-9), then a media row below it whose width and
 * side vary per chapter (full 1-12, wide-left 1-7, wide-right 6-12), caption
 * under the media. "Beside" keeps text and media on one row for contrast.
 * The test switcher stacks pills in the title lane; the selected test's text
 * sits in the reading lane and its media below. Phone: title, text, media,
 * caption; switcher pills wrap above the text. Media autoplays muted in view
 * as silent clips (InlineClip, no player chrome); the text is static.
 *
 * Next project: the same 4:3 preview block as the gallery page (the morph
 * source for project → project) with the next title beside it.
 */

import { useState, type RefObject } from "react";
import NextLink from "next/link";
import Image from "next/image";
import { Link } from "next-view-transitions";
import type { PortableTextBlock } from "next-sanity";
import { PortableText } from "next-sanity";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import CopyButton from "@/components/CopyButton";
import { portableTextComponents } from "@/components/portableText/components";
import NextProjectPreview, { type NextProject } from "@/components/project/NextProjectPreview";
import InlineClip from "@/components/project/InlineClip";
import LandingMedia from "@/components/project/LandingMedia";
import { isPlainLeftClick } from "@/lib/clicks";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
export type ChapterBlock = NonNullable<Project["chapters"]>[number];
export type Chapter = Extract<ChapterBlock, { _type: "chapter" }>;
export type TestSwitcher = Extract<ChapterBlock, { _type: "testSwitcher" }>;
export type AbTest = NonNullable<TestSwitcher["tests"]>[number];
type ChapterMediaValue = Chapter["media"];

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

// Hero variants (laptop, 12 columns): the landing media takes eight columns,
// the text block the four beside it, hung on the media's bottom edge. Which
// side alternates per project, fixed by its slug so a page never changes.
const HERO_VARIANTS = {
  "media-right": { media: "desktop:col-start-5 desktop:col-end-13", text: "desktop:col-start-1 desktop:col-end-5" },
  "media-left": { media: "desktop:col-start-1 desktop:col-end-9", text: "desktop:col-start-9 desktop:col-end-13" },
} as const;
type HeroVariant = keyof typeof HERO_VARIANTS;
function heroVariant(slug: string, chosen?: string | null): HeroVariant {
  if (chosen === "media-right" || chosen === "media-left") return chosen;
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return hash % 2 === 0 ? "media-right" : "media-left";
}

// Lanes (laptop, 12 columns): the title lane is cols 1-3, the reading lane
// cols 5-9. Media rows sit below the text row at one of three widths.
const TITLE_LANE = "col-span-4 desktop:col-start-1 desktop:col-end-4";
const READING_LANE = "col-span-4 mt-3 desktop:mt-0 desktop:col-start-5 desktop:col-end-10";
const MEDIA_ROWS = {
  full: "desktop:col-start-1 desktop:col-end-13",
  "wide-left": "desktop:col-start-1 desktop:col-end-8",
  "wide-right": "desktop:col-start-6 desktop:col-end-13",
} as const;
type MediaWidth = keyof typeof MEDIA_ROWS;
type Layout = MediaWidth | "beside";

// Legacy values (half / wide / narrow) from the first draft map onto the lanes.
function layoutOf(chapter: Chapter): Layout {
  const layout = chapter.layout as string | null;
  switch (layout) {
    case "full":
    case "wide-left":
    case "wide-right":
    case "beside":
      return layout;
    case "half":
    case "narrow":
      return "beside";
    case "wide":
      return chapter.side === "right" ? "wide-right" : "wide-left";
    default:
      return "full";
  }
}

const readingText = "text-body desktop:text-lead text-primary [&>p]:my-0 [&>p+p]:mt-3";

function ChapterMedia({
  media,
  title,
  hidden,
  fit = "row",
  sizes = "(min-width: 75rem) 60vw, 100vw",
}: {
  media: ChapterMediaValue;
  title: string;
  hidden: boolean;
  /** row: fill the media row at the image's ratio. frame: fill the parent's fixed height at natural ratio (switcher). */
  fit?: "row" | "frame";
  sizes?: string;
}) {
  if (!media) return null;
  if (media.type === "video" && media.video?.asset?._ref) {
    return (
      <InlineClip
        src={fileUrl(media.video.asset._ref)}
        poster={media.poster?.asset ? imageUrl(media.poster, 1600) : undefined}
        label={title}
        active={!hidden}
        className={fit === "frame" ? "h-full w-full object-contain object-left-top" : ""}
      />
    );
  }
  if (media.type === "image" && media.image?.asset) {
    const dims = media.image.asset.metadata?.dimensions;
    const width = dims?.width ?? 1600;
    const height = dims?.height ?? 1200;
    if (fit === "frame") {
      return (
        <Image
          src={imageUrl(media.image, 1600)}
          alt={title}
          width={width}
          height={height}
          className="h-full w-full object-contain object-left-top"
          sizes={sizes}
        />
      );
    }
    return (
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: `${width} / ${height}` }}>
        <Image src={imageUrl(media.image, 1600)} alt={title} fill className="object-cover" sizes={sizes} />
      </div>
    );
  }
  return null;
}

function Caption({ text }: { text: string | null | undefined }) {
  return text ? <p className="mt-2 text-sub text-secondary">{text}</p> : null;
}

function ChapterSection({ chapter, index, hidden }: { chapter: Chapter; index: number; hidden: boolean }) {
  const title = chapter.title ?? `Chapter ${index + 1}`;
  const text = Array.isArray(chapter.text) && chapter.text.length > 0 ? (chapter.text as PortableTextBlock[]) : null;
  const body = text ? (
    <div className={readingText}>
      <PortableText value={text} components={portableTextComponents} />
    </div>
  ) : null;
  const layout = layoutOf(chapter);

  if (layout === "beside") {
    const left = chapter.side === "left";
    return (
      <section className="grid-site px-margin py-6 desktop:items-center desktop:py-12" aria-label={title}>
        <div
          className={`col-span-4 ${left ? "desktop:col-start-8 desktop:col-end-13" : "desktop:col-start-1 desktop:col-end-6"} desktop:row-start-1`}
        >
          <h2 className="text-h3 text-primary">{title}</h2>
          <div className="mt-3 desktop:mt-6">{body}</div>
        </div>
        <div
          className={`col-span-4 mt-4 desktop:mt-0 ${left ? "desktop:col-start-1 desktop:col-end-7" : "desktop:col-start-7 desktop:col-end-13"} desktop:row-start-1`}
        >
          <ChapterMedia media={chapter.media} title={title} hidden={hidden} sizes="(min-width: 75rem) 50vw, 100vw" />
          <Caption text={chapter.caption} />
        </div>
      </section>
    );
  }

  const sizes = layout === "full" ? "(min-width: 75rem) 100vw, 100vw" : "(min-width: 75rem) 60vw, 100vw";
  return (
    <section className="grid-site px-margin py-6 desktop:py-12" aria-label={title}>
      <h2 className={`${TITLE_LANE} text-h3 text-primary`}>{title}</h2>
      <div className={READING_LANE}>{body}</div>
      <div className={`col-span-4 mt-4 desktop:mt-8 ${MEDIA_ROWS[layout]}`}>
        <ChapterMedia media={chapter.media} title={title} hidden={hidden} sizes={sizes} />
        <Caption text={chapter.caption} />
      </div>
    </section>
  );
}

function TestSwitcherSection({ block, hidden }: { block: TestSwitcher; hidden: boolean }) {
  const tests = (block.tests ?? []).filter((t) => t.label || t.title);
  const [active, setActive] = useState(0);
  const current = Math.min(active, tests.length - 1);
  if (!tests.length) return null;
  const sectionTitle = block.title ?? "Tests";
  const pill = "inline-flex h-8 items-center rounded-full px-4 text-sub uppercase transition-colors duration-200";
  // Every panel is rendered in the same grid cell; the inactive ones stay
  // invisible so the cell keeps the tallest panel's height (no layout shift).
  const stacked = "col-start-1 row-start-1";
  const gate = (i: number) => (i === current ? "" : " invisible");

  return (
    <section className="grid-site px-margin py-6 desktop:py-12" aria-label={sectionTitle}>
      {block.title && (
        <h2 className="col-span-4 desktop:col-start-1 desktop:col-end-10 text-h3 text-primary mb-6 desktop:mb-8">
          {block.title}
        </h2>
      )}
      <div className={`${TITLE_LANE} flex flex-wrap gap-2 desktop:flex-col desktop:items-start`} role="tablist">
        {tests.map((t, i) => {
          const selected = i === current;
          return (
            <button
              key={t._key}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${block._key}-panel-${i}`}
              id={`${block._key}-tab-${i}`}
              onClick={() => setActive(i)}
              className={`${pill} ${selected ? "bg-pistachio text-primary" : "border border-tertiary text-secondary hover:bg-lightpistachio hover:text-primary"}`}
            >
              {t.label ?? t.title}
            </button>
          );
        })}
      </div>
      <div className={`${READING_LANE} grid`}>
        {tests.map((t, i) => {
          const title = t.title ?? t.label ?? "Test";
          const text = Array.isArray(t.text) && t.text.length > 0 ? (t.text as PortableTextBlock[]) : null;
          return (
            <div
              key={t._key}
              id={`${block._key}-panel-${i}`}
              role="tabpanel"
              aria-labelledby={`${block._key}-tab-${i}`}
              aria-hidden={i !== current}
              className={`${stacked}${gate(i)}`}
            >
              <p className="text-sub text-secondary tabular-nums">
                Test {i + 1} of {tests.length}
                {t.status ? ` · ${t.status}` : ""}
              </p>
              <h3 className="mt-2 text-h3 text-primary">{title}</h3>
              {text && (
                <div className={`mt-4 ${readingText}`}>
                  <PortableText value={text} components={portableTextComponents} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Media row: one phone-shaped box (390:844) shared by every test, so the swap never shifts the page. */}
      <div className={`col-span-4 mt-4 desktop:mt-8 ${MEDIA_ROWS["wide-left"]} grid`}>
        {tests.map((t, i) => (
          <div key={t._key} className={`${stacked}${gate(i)}`} aria-hidden={i !== current}>
            <div className="aspect-[390/844] h-[70dvh] desktop:h-[min(720px,80dvh)]">
              <ChapterMedia
                media={t.media}
                title={t.title ?? t.label ?? "Test"}
                hidden={hidden || i !== current}
                fit="frame"
                sizes="(min-width: 75rem) 40vw, 100vw"
              />
            </div>
            <Caption text={t.caption} />
          </div>
        ))}
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

  const hero = HERO_VARIANTS[heroVariant(project.slug?.current ?? "", project.heroLayout)];
  // The next-project block takes the shape of the next page's hero, so the
  // preview carried into the landing slot already sits where it will render.
  const nextHero = HERO_VARIANTS[heroVariant(nextProject?.slug?.current ?? "", nextProject?.heroLayout)];

  return (
    <div ref={galleryRef} data-project-gallery className="pb-10">
      {/* Hero */}
      <section className="grid-site px-margin pt-2 pb-6 desktop:pt-6 desktop:pb-12">
        <div
          data-landing-slot
          className={`col-span-4 self-start desktop:row-start-1 ${hero.media}${mediaGate}`}
        >
          <LandingMedia
            item={landing}
            title={project.title}
            slotRef={firstImageRef}
            onReady={onFirstReady}
            sizes="(min-width: 75rem) 66vw, 100vw"
          />
        </div>
        <div
          ref={panelRef}
          className={`col-span-4 pt-5 desktop:row-start-1 desktop:self-end desktop:pt-0 ${hero.text}${textHidden ? " invisible" : ""}`}
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
          {/* Meta row: bare values under a rule, stack left and links right. */}
          <div className="mt-6 grid grid-cols-4 gap-x-3 border-t border-tertiary pt-3 desktop:mt-8 desktop:gap-x-4">
            {project.techStack && project.techStack.length > 0 && (
              <div ref={techRef} className="col-span-4 desktop:col-span-2">
                <p className="text-sub text-primary">{project.techStack.join(", ")}</p>
              </div>
            )}
            <div
              ref={linksRef}
              className="col-span-4 mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sub desktop:col-span-2 desktop:mt-0"
            >
              {project.siteUrl && (
                <NextLink
                  href={project.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-pill
                  className="invisible link-underline text-primary"
                >
                  Visit website
                </NextLink>
              )}
              {journalSlug && (
                <Link href={`/journal/${journalSlug}`} data-pill className="invisible link-underline text-primary">
                  Journal post
                </Link>
              )}
              {project.sitePassword && (
                <CopyButton value={project.sitePassword} label="Password" className="link-underline text-sub text-primary cursor-pointer" />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Chapters */}
      <div className={mediaGate}>
        {chapters.map((block, i) =>
          block._type === "testSwitcher" ? (
            <TestSwitcherSection key={block._key} block={block} hidden={hidden} />
          ) : (
            <ChapterSection key={block._key} chapter={block} index={i} hidden={hidden} />
          ),
        )}

        {/* Next project */}
        {nextProject && onNavigateNext && nextProject.slug?.current && (
          <section
            className="grid-site px-margin pt-6 pb-24 desktop:min-h-[calc(100dvh-var(--header-height))] desktop:pt-12"
            aria-label="Next project"
          >
            <div className={`col-span-4 desktop:row-start-1 desktop:self-end ${nextHero.text}`}>
              <h2 className="text-h2 desktop:text-h1 text-primary">
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
            <div className={`col-span-4 mt-4 desktop:mt-0 desktop:row-start-1 ${nextHero.media}`}>
              <NextProjectPreview
                nextProject={nextProject}
                previewRef={previewRef}
                onNavigate={onNavigateNext}
                sizes="(min-width: 75rem) 66vw, 100vw"
                labelHidden
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
