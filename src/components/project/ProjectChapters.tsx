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
 * The test switcher puts the open test's phone in focus on a full-width
 * photo with a frosted segmented bar along its bottom; the title and text
 * (cols 1-5) and the story rows (cols 7-12) sit under the photo. Phone:
 * title, text, media, caption; the switcher's motion is SwitcherMotion. Media autoplays muted in view
 * as silent clips (InlineClip, no player chrome); the text is static.
 *
 * Next project: the preview block in the next page's landing shape (the
 * morph source for project → project, see lib/landing.ts) with the next
 * title beside it.
 */

import { createContext, useContext, useLayoutEffect, useRef, useState, type RefObject } from "react";
import NextLink from "next/link";
import Image from "next/image";
import { Link } from "@/lib/viewTransitions";
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
import { HERO_VARIANTS, LANDING_ASPECT, heroVariant, landingKind } from "@/lib/landing";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
export type ChapterBlock = NonNullable<Project["chapters"]>[number];
export type Chapter = Extract<ChapterBlock, { _type: "chapter" }>;
export type TestSwitcher = Extract<ChapterBlock, { _type: "testSwitcher" }>;
export type AbTest = NonNullable<TestSwitcher["tests"]>[number];
type ChapterMediaValue = Chapter["media"];

/**
 * Phone layout (lab exploration, 2026-10-29). "default" = one column, media
 * full width. "offset" = big title across the 4 columns, text indented one
 * column, media alternating 3-column left/right, phone frames narrow.
 * "stack" = display-size title, 18/28 text, media centred at ~70 % width.
 */
export type MobileVariant = "default" | "offset" | "stack";
const MobileVariantContext = createContext<MobileVariant>("default");

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
  mobileVariant?: MobileVariant;
}

// Lanes (laptop, 12 columns): the title lane is cols 1-3, the reading lane
// cols 5-9. Media rows sit below the text row at one of three widths.
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

// Phone columns per variant (laptop classes are unchanged by the variant).
const PHONE = {
  default: {
    title: "col-span-4 text-h3",
    body: "col-span-4 mt-3 text-body",
    media: (_layout: MediaWidth, _i: number) => "col-span-4 mt-4",
    beside: "col-span-4 mt-4",
    frame: "col-span-4 mt-4",
    frameBox: "h-[70dvh]",
  },
  offset: {
    title: "col-span-4 text-h2",
    body: "col-start-2 col-end-5 mt-4 text-body",
    media: (layout: MediaWidth, i: number) =>
      layout === "full" ? "col-span-4 mt-6" : (layout === "wide-right" || i % 2) ? "col-start-2 col-end-5 mt-6" : "col-start-1 col-end-4 mt-6",
    beside: "col-start-1 col-end-4 mt-6",
    frame: "col-start-1 col-end-4 mt-6",
    frameBox: "h-[60dvh]",
  },
  stack: {
    title: "col-span-4 text-h1",
    body: "col-span-4 mt-5 text-lead",
    media: (_layout: MediaWidth, _i: number) => "col-span-4 mt-8",
    beside: "col-span-4 mt-8",
    frame: "col-span-4 mt-8 flex flex-col items-center",
    frameBox: "h-[65dvh]",
  },
} as const;

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
  /** row: fill the media row at the image's ratio. frame: fill the parent's fixed height at natural ratio. phone: cover a phone-shaped box (switcher). */
  fit?: "row" | "frame" | "phone";
  sizes?: string;
}) {
  if (!media) return null;
  if (media.type === "phones") {
    return <PhonesPanel media={media} title={title} hidden={hidden} />;
  }
  if (media.type === "video" && media.video?.asset?._ref) {
    return (
      <InlineClip
        src={fileUrl(media.video.asset._ref)}
        poster={media.poster?.asset ? imageUrl(media.poster, 1600) : undefined}
        label={title}
        active={!hidden}
        className={
          fit === "phone" ? "h-full w-full object-cover object-top" : fit === "frame" ? "h-full w-full object-contain object-left-top" : ""
        }
      />
    );
  }
  if (media.type === "image" && media.image?.asset) {
    const dims = media.image.asset.metadata?.dimensions;
    const width = dims?.width ?? 1600;
    const height = dims?.height ?? 1200;
    if (fit === "frame" || fit === "phone") {
      return (
        <Image
          src={imageUrl(media.image, 1600)}
          alt={title}
          width={width}
          height={height}
          className={`h-full w-full ${fit === "phone" ? "object-cover object-top" : "object-contain object-left-top"}`}
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

/**
 * Phones on a panel (Ali, 10-29, alternative E): one to three phone screens
 * side by side on a 16:10 panel, each a still or a silent clip at the
 * phone's own ratio with rounded corners, no device frame. The panel is
 * black or carries an image at reduced opacity.
 */
const PHONE_WIDTH = ["w-[52%] desktop:w-[30%]", "w-[38%] desktop:w-[24%]", "w-[28%] desktop:w-[20%]"];

function PhonesPanel({ media, title, hidden }: { media: NonNullable<ChapterMediaValue>; title: string; hidden: boolean }) {
  const slots = (media.phones ?? []).slice(0, 3);
  if (slots.length === 0) return null;
  const width = PHONE_WIDTH[slots.length - 1];
  const panelImage = media.panel === "image" && media.panelImage?.asset ? media.panelImage : null;
  return (
    <div className="relative flex aspect-[16/10] w-full items-center justify-center gap-4 overflow-hidden bg-primary desktop:gap-10">
      {panelImage && (
        <Image src={imageUrl(panelImage, 2000)} alt="" fill className="object-cover opacity-55" sizes="100vw" />
      )}
      {slots.map((slot, i) => (
        <div
          key={slot._key ?? i}
          className={`relative aspect-[390/844] flex-none overflow-hidden rounded-[18px] bg-white desktop:rounded-[28px] ${width}`}
        >
          {slot.type === "video" && slot.video?.asset?._ref ? (
            <InlineClip
              src={fileUrl(slot.video.asset._ref)}
              poster={slot.poster?.asset ? imageUrl(slot.poster, 800) : undefined}
              label={`${title}, screen ${i + 1}`}
              active={!hidden}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          ) : slot.type === "image" && slot.image?.asset ? (
            <Image
              src={imageUrl(slot.image, 800)}
              alt={`${title}, screen ${i + 1}`}
              fill
              className="object-cover object-top"
              sizes="(min-width: 75rem) 30vw, 52vw"
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Caption({ text }: { text: string | null | undefined }) {
  return text ? <p className="mt-2 text-sub text-secondary">{text}</p> : null;
}

function ChapterSection({ chapter, index, hidden }: { chapter: Chapter; index: number; hidden: boolean }) {
  const phone = PHONE[useContext(MobileVariantContext)];
  const title = chapter.title ?? `Chapter ${index + 1}`;
  const text = Array.isArray(chapter.text) && chapter.text.length > 0 ? (chapter.text as PortableTextBlock[]) : null;
  const body = text ? (
    <div className="text-primary [&>p]:my-0 [&>p+p]:mt-3">
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
          <h2 className={`${phone.title} desktop:text-h3 text-primary`}>{title}</h2>
          <div className="mt-3 desktop:mt-6">{body}</div>
        </div>
        <div
          className={`${phone.beside} desktop:col-auto desktop:mt-0 ${left ? "desktop:col-start-1 desktop:col-end-7" : "desktop:col-start-7 desktop:col-end-13"} desktop:row-start-1`}
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
      <h2 className={`${phone.title} desktop:col-start-1 desktop:col-end-4 desktop:text-h3 text-primary`}>{title}</h2>
      <div className={`${phone.body} desktop:col-start-5 desktop:col-end-10 desktop:mt-0 desktop:text-lead`}>{body}</div>
      <div className={`${phone.media(layout, index)} desktop:col-auto desktop:mt-8 ${MEDIA_ROWS[layout]}`}>
        <ChapterMedia media={chapter.media} title={title} hidden={hidden} sizes={sizes} />
        <Caption text={chapter.caption} />
      </div>
    </section>
  );
}

/** Hypothesis, metric, result, decision: the four lines an outsider should be able to repeat back. */
function TestStory({ test, className = "" }: { test: AbTest; className?: string }) {
  const rows: [string, string | null | undefined][] = [
    ["Hypothesis", test.hypothesis],
    ["Metric", test.metric],
    ["Result", test.result],
    ["Decision", test.decision],
  ];
  const filled = rows.filter(([, v]) => typeof v === "string" && v.trim().length > 0);
  if (filled.length === 0) return null;
  return (
    <dl className={`border-t border-tertiary ${className}`}>
      {filled.map(([k, v]) => (
        <div key={k} className="border-b border-tertiary py-3 desktop:grid desktop:grid-cols-6 desktop:gap-x-4">
          <dt className="text-sm text-secondary desktop:text-body">{k}</dt>
          <dd className="mt-1 text-body text-primary whitespace-pre-line desktop:col-span-5 desktop:mt-0">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * How the switcher moves on a phone (lab, 10-30; laptop always uses the bar).
 * bar = M1, the frosted bar scrolls the open test to the middle and the phone
 * crossfades. swipe = M2, swipe the phones (neighbours peek) with a name chip
 * and dots. arrows = M3, back/next on the photo, the phone slides out and in.
 */
export type SwitcherMotion = "bar" | "swipe" | "arrows";
export const SwitcherMotionContext = createContext<SwitcherMotion>("bar");

const FROST = "bg-white/80 backdrop-blur-md";
const EASE = "duration-[240ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none";
// The phone: 390:844, 500 px tall on a phone, 600 on a laptop.
const PHONE_BOX =
  "relative aspect-[390/844] h-[500px] flex-none overflow-hidden rounded-[6%/2.8%] bg-white shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)] desktop:h-[600px]";
const PHONE_STEP = 231 + 16; // phone width at 500 px tall + gap, for the swipe track

function Chevron({ back }: { back?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className={back ? "rotate-180" : ""}>
      <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * D2 (Figma pf 26:1098, Ali 10-30): the tests' phone sits in focus on a
 * full-width lifestyle photo, a frosted segmented bar along the photo's
 * bottom picks the test, and under the photo the title and text (cols 1-5)
 * face the story rows (cols 7-12). Every phone and every text panel is
 * rendered in one grid cell and the inactive ones fade out, so a switch
 * never moves the page.
 */
function TestSwitcherSection({ block, hidden }: { block: TestSwitcher; hidden: boolean }) {
  const tests = (block.tests ?? []).filter((t) => t.label || t.title);
  const [active, setActive] = useState(0);
  const phone = PHONE[useContext(MobileVariantContext)];
  const motion = useContext(SwitcherMotionContext);
  const tabsRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  const current = Math.min(active, Math.max(0, tests.length - 1));

  // The pistachio thumb slides to the open tab; on a phone the bar also
  // scrolls so the open tab sits in the middle.
  useLayoutEffect(() => {
    const bar = tabsRef.current;
    const tab = bar?.querySelectorAll<HTMLElement>("[role=tab]")[current];
    if (!bar || !tab) return;
    const place = () => setThumb({ left: tab.offsetLeft, width: tab.offsetWidth });
    place();
    bar.scrollTo({ left: tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2, behavior: "smooth" });
    const ro = new ResizeObserver(place);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [current]);

  if (!tests.length) return null;
  const sectionTitle = block.title ?? "Tests";
  const nameOf = (t: AbTest) => t.label ?? t.title ?? "Test";
  const swipe = motion === "swipe";
  const arrows = motion === "arrows";

  const select = (i: number) => {
    const next = Math.max(0, Math.min(tests.length - 1, i));
    setActive(next);
    const track = trackRef.current;
    if (swipe && track && track.scrollWidth > track.clientWidth) {
      track.scrollTo({ left: next * PHONE_STEP, behavior: "smooth" });
    }
  };
  const onTabKey = (e: React.KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tests.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = (keys[e.key] + tests.length) % tests.length;
    select(next);
    tabsRef.current?.querySelectorAll<HTMLElement>("[role=tab]")[next]?.focus();
  };
  // Swipe (M2): the phone nearest the middle of the track is the open test.
  const onTrackScroll = () => {
    const track = trackRef.current;
    if (!track || track.scrollWidth <= track.clientWidth) return;
    const i = Math.max(0, Math.min(tests.length - 1, Math.round(track.scrollLeft / PHONE_STEP)));
    if (i !== current) setActive(i);
  };

  const fade = (i: number) =>
    `transition-[opacity,visibility] ${EASE} ${i === current ? "opacity-100" : "invisible opacity-0"}`;
  // A phone's state: crossfade (bar), peek at the sides (swipe), slide out and in (arrows).
  const phoneState = (i: number) => {
    if (swipe) {
      const laptop = i === current ? "" : "desktop:invisible desktop:opacity-0";
      return `snap-center transition-[opacity,visibility] ${EASE} ${i === current ? "opacity-100" : "opacity-55"} ${laptop}`;
    }
    if (arrows) {
      const slide = i < current ? "max-desktop:-translate-x-[70%]" : i > current ? "max-desktop:translate-x-[70%]" : "";
      return `transition-[opacity,visibility,translate] duration-[320ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${slide} ${i === current ? "opacity-100" : "invisible opacity-0"}`;
    }
    return fade(i);
  };
  const chip = `${FROST} pointer-events-auto flex h-10 items-center rounded-full px-4 text-body text-primary`;
  const round = `${FROST} pointer-events-auto flex size-10 items-center justify-center rounded-full text-primary disabled:opacity-40`;
  const backdrop = block.backdrop?.asset ? block.backdrop : null;
  const hotspot = backdrop?.hotspot;

  return (
    <section className="grid-site px-margin py-6 desktop:py-12" aria-label={sectionTitle}>
      {block.title && (
        <h2 className={`${phone.title} desktop:col-span-12 desktop:text-h3 text-primary mb-6 desktop:mb-8`}>{block.title}</h2>
      )}

      {/* The photo with the phone in focus. */}
      <div className="relative col-span-4 h-[560px] overflow-hidden bg-tertiary desktop:col-span-12 desktop:h-[760px]">
        {backdrop && (
          <Image
            src={imageUrl(backdrop, 2400)}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            style={hotspot?.x != null && hotspot?.y != null ? { objectPosition: `${hotspot.x * 100}% ${hotspot.y * 100}%` } : undefined}
            placeholder={backdrop.asset?.metadata?.lqip ? "blur" : "empty"}
            blurDataURL={backdrop.asset?.metadata?.lqip ?? undefined}
          />
        )}
        <div
          ref={trackRef}
          onScroll={swipe ? onTrackScroll : undefined}
          className={`absolute inset-x-0 top-6 desktop:top-8 ${
            swipe
              ? "flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50%-115.5px)] pb-16 desktop:grid desktop:justify-items-center desktop:overflow-visible desktop:px-0 desktop:pb-0"
              : "grid justify-items-center"
          }`}
        >
          {tests.map((t, i) => (
            <div
              key={t._key}
              className={`${PHONE_BOX} desktop:col-start-1 desktop:row-start-1 ${swipe ? "" : "col-start-1 row-start-1"} ${phoneState(i)}`}
              aria-hidden={i !== current}
            >
              <ChapterMedia
                media={t.media}
                title={t.title ?? nameOf(t)}
                hidden={hidden || i !== current}
                fit="phone"
                sizes="(min-width: 75rem) 280px, 240px"
              />
            </div>
          ))}
        </div>

        {/* The bar: on a laptop always, on a phone in the bar motion (M1). */}
        <div
          className={`absolute inset-x-4 bottom-4 justify-center desktop:bottom-6 ${swipe || arrows ? "hidden desktop:flex" : "flex"}`}
        >
          <div className={`${FROST} max-w-full rounded-full p-1`}>
            <div
              ref={tabsRef}
              role="tablist"
              aria-label={sectionTitle}
              onKeyDown={onTabKey}
              className="relative flex overflow-x-auto rounded-full [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)] desktop:[mask-image:none]"
            >
              {thumb && (
                <span
                  aria-hidden
                  className={`absolute inset-y-0 rounded-full bg-pistachio transition-[left,width] ${EASE}`}
                  style={{ left: thumb.left, width: thumb.width }}
                />
              )}
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
                    tabIndex={selected ? 0 : -1}
                    onClick={() => select(i)}
                    className={`relative h-10 flex-none whitespace-nowrap rounded-full px-[18px] text-body text-primary transition-colors ${
                      selected ? `font-medium${thumb ? "" : " bg-pistachio"}` : "hover:bg-lightpistachio/70"
                    }`}
                  >
                    {nameOf(t)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Swipe (M2): name chip with dots. */}
        {swipe && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center desktop:hidden">
            <div className={`${chip} gap-3`}>
              <span aria-live="polite">{nameOf(tests[current])}</span>
              <span className="flex items-center gap-1.5">
                {tests.map((t, i) => (
                  <button
                    key={t._key}
                    type="button"
                    aria-label={`Show ${nameOf(t)}`}
                    aria-current={i === current}
                    onClick={() => select(i)}
                    className={`h-1.5 rounded-full transition-[width,background-color] ${EASE} ${
                      i === current ? "w-4 bg-primary" : "w-1.5 bg-primary/30"
                    }`}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        {/* Arrows (M3): back and next around the name chip. */}
        {arrows && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-center justify-center gap-2 desktop:hidden">
            <button type="button" aria-label="Previous test" disabled={current === 0} onClick={() => select(current - 1)} className={round}>
              <Chevron back />
            </button>
            <span className={chip} aria-live="polite">
              {nameOf(tests[current])}
            </span>
            <button
              type="button"
              aria-label="Next test"
              disabled={current === tests.length - 1}
              onClick={() => select(current + 1)}
              className={round}
            >
              <Chevron />
            </button>
          </div>
        )}
      </div>

      <div className="col-span-4 grid desktop:col-span-12">
        {tests.map((t, i) => (
          <div key={t._key} className={`col-start-1 row-start-1 ${fade(i)}`} aria-hidden={i !== current}>
            <Caption text={t.caption} />
          </div>
        ))}
      </div>

      {/* Title and text (cols 1-5) facing the story (cols 7-12). */}
      <div className="col-span-4 mt-6 grid desktop:col-span-12 desktop:mt-10">
        {tests.map((t, i) => {
          const title = t.title ?? nameOf(t);
          const text = Array.isArray(t.text) && t.text.length > 0 ? (t.text as PortableTextBlock[]) : null;
          return (
            <div
              key={t._key}
              id={`${block._key}-panel-${i}`}
              role="tabpanel"
              aria-labelledby={`${block._key}-tab-${i}`}
              aria-hidden={i !== current}
              className={`col-start-1 row-start-1 desktop:grid desktop:grid-cols-12 desktop:gap-x-4 desktop:items-start ${fade(i)}`}
            >
              <div className="desktop:col-span-5">
                <h3 className="text-h3 text-primary desktop:text-h2">{title}</h3>
                {text && (
                  <div className={`mt-3 desktop:mt-4 ${readingText}`}>
                    <PortableText value={text} components={portableTextComponents} />
                  </div>
                )}
              </div>
              <TestStory test={t} className="mt-6 desktop:col-start-7 desktop:col-end-13 desktop:mt-0" />
            </div>
          );
        })}
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
  mobileVariant = "default",
}: ProjectChaptersProps) {
  const chapters = project.chapters ?? [];
  const landing = project.gallery?.[0] ?? null;
  const mediaGate = hidden ? " opacity-0 pointer-events-none" : "";
  const journalSlug = project.caseStudy?.slug?.current;

  const hero = HERO_VARIANTS[heroVariant(project.slug?.current ?? "", project.heroLayout)];
  // A chapter page follows: the next-project block takes its hero's shape.
  const nextHero = HERO_VARIANTS[heroVariant(nextProject?.slug?.current ?? "", nextProject?.heroLayout)];

  return (
    <MobileVariantContext.Provider value={mobileVariant}>
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

        {/* Next project: the preview block takes the next page's landing
            shape (lib/landing.ts), so the slide puts it exactly where that
            page's first media renders: a 16:10 box in the next hero's
            columns for a chapter page; for a gallery page the 4:3 first item
            of its right-hand column (the stage's full-width 4:3 card on a
            phone), with the title in the other half. */}
        {nextProject && onNavigateNext && nextProject.slug?.current && (() => {
          const title = (
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
          );
          const preview = (kind: "chapters" | "gallery", sizes: string) => (
            <NextProjectPreview
              nextProject={nextProject}
              previewRef={previewRef}
              onNavigate={onNavigateNext}
              sizes={sizes}
              aspect={LANDING_ASPECT[kind]}
              labelHidden
            />
          );
          return nextProject.hasChapters ? (
            <section
              className="grid-site px-margin content-start pt-6 pb-24 desktop:min-h-[calc(100dvh-var(--header-height))] desktop:pt-12"
              aria-label="Next project"
            >
              <div className={`col-span-4 desktop:row-start-1 desktop:self-end ${nextHero.text}`}>{title}</div>
              <div className={`col-span-4 mt-4 desktop:mt-0 desktop:row-start-1 ${nextHero.media}`}>
                {preview("chapters", "(min-width: 75rem) 66vw, 100vw")}
              </div>
            </section>
          ) : (
            <section
              className="pt-6 pb-24 desktop:flex desktop:min-h-[calc(100dvh-var(--header-height))] desktop:items-end desktop:pt-12"
              aria-label="Next project"
            >
              <div className="px-margin desktop:w-1/2">{title}</div>
              <div className="mt-4 px-margin desktop:mt-0 desktop:w-1/2">
                {preview("gallery", "(min-width: 75rem) 50vw, 100vw")}
              </div>
            </section>
          );
        })()}
      </div>
    </div>
    </MobileVariantContext.Provider>
  );
}
