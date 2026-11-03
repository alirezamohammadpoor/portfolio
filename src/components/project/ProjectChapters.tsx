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

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
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
import TestMorph, { type TestMorphHandle } from "@/components/lab/morph/TestMorph";
import { SCENE_BY_KEY } from "@/components/lab/morph/scenes";
import MediaFrame from "@/components/MediaFrame";
import PhonesRow from "@/components/PhonesRow";
import { resolveFrame, resolveLandingFrame, type ProjectFrameSource } from "@/lib/mediaFrame";
import { isPlainLeftClick } from "@/lib/clicks";
import { HERO_VARIANTS, LANDING_ASPECT, heroVariant, landingKind } from "@/lib/landing";

type Project = NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>;
export type ChapterBlock = NonNullable<Project["chapters"]>[number];
export type Chapter = Extract<ChapterBlock, { _type: "chapter" }>;
export type TestSwitcher = Extract<ChapterBlock, { _type: "testSwitcher" }>;
export type AbTest = NonNullable<TestSwitcher["tests"]>[number];
type ChapterMediaValue = Chapter["media"];
type MorphKey = keyof typeof SCENE_BY_KEY;

/**
 * Phone layout (lab exploration, 2026-10-29). "default" = one column, media
 * full width. "offset" = big title across the 4 columns, text indented one
 * column, media alternating 3-column left/right, phone frames narrow.
 * "stack" = display-size title, 18/28 text, media centred at ~70 % width.
 */
export type MobileVariant = "default" | "offset" | "stack";
const MobileVariantContext = createContext<MobileVariant>("default");
/** The project's brand colours and default media background, for chapter media. */
const FrameSourceContext = createContext<ProjectFrameSource>(null);

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
type Layout = MediaWidth | "beside" | "beside-phone" | "pair-left" | "pair-right";

// Legacy values (half / wide / narrow) from the first draft map onto the lanes.
function layoutOf(chapter: Chapter): Layout {
  const layout = chapter.layout as string | null;
  switch (layout) {
    case "full":
    case "wide-left":
    case "wide-right":
    case "beside":
    case "beside-phone":
    case "pair-left":
    case "pair-right":
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

// A ref that starts with "/" is a file in public/ (lab fixtures only); anything else is a Sanity asset.
const clipSrc = (ref: string) => (ref.startsWith("/") ? ref : fileUrl(ref));
type Poster = { asset?: { _ref: string } } | null | undefined;
const posterSrc = (poster: Poster, width: number) =>
  poster?.asset ? (poster.asset._ref.startsWith("/") ? poster.asset._ref : imageUrl(poster as Parameters<typeof imageUrl>[0], width)) : undefined;

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
  /**
   * row: the media in its own box on its background from Sanity. frame: fill
   * the parent's fixed phone-shaped box at natural ratio. phone: cover a
   * phone-shaped box (switcher). frame and phone draw no background.
   */
  fit?: "row" | "frame" | "phone";
  sizes?: string;
}) {
  const source = useContext(FrameSourceContext);
  const [clipAspect, setClipAspect] = useState<number | null>(null);
  if (!media) return null;
  if (media.type === "phones") {
    return (
      <PhonesRow
        slots={media.phones ?? []}
        frame={resolveFrame(media.frame, source, "phones")}
        title={title}
        active={!hidden}
        sizes="(min-width: 75rem) 30vw, 52vw"
      />
    );
  }
  if (media.type === "video" && media.video?.asset?._ref) {
    const clip = (framed: boolean) => (
      <InlineClip
        src={clipSrc(media.video!.asset!._ref!)}
        poster={posterSrc(media.poster, 1600)}
        label={title}
        active={!hidden}
        onAspect={setClipAspect}
        className={
          fit === "phone"
            ? "h-full w-full object-cover object-top"
            : fit === "frame"
              ? "h-full w-full object-contain object-left-top"
              : framed
                ? "absolute inset-0 h-full w-full object-cover"
                : ""
        }
      />
    );
    if (fit === "frame" || fit === "phone") return clip(false);
    // Until the clip reports its size, assume the flush laptop shape (16:10).
    const aspect = clipAspect ?? 16 / 10;
    const frame = resolveFrame(media.frame, source, aspect < 1 ? "portrait" : "landscape");
    if (frame.fit === "flush" && !frame.background) return clip(false);
    return (
      <MediaFrame frame={frame} mediaAspect={aspect} sizes={sizes}>
        {clip(true)}
      </MediaFrame>
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
    const aspect = width / height;
    return (
      <MediaFrame frame={resolveFrame(media.frame, source, aspect < 1 ? "portrait" : "landscape")} mediaAspect={aspect} sizes={sizes}>
        <Image src={imageUrl(media.image, 1600)} alt={title} fill className="object-cover" sizes={sizes} />
      </MediaFrame>
    );
  }
  return null;
}

function Caption({ text }: { text: string | null | undefined }) {
  return text ? <p className="mt-2 text-sub text-secondary">{text}</p> : null;
}

/**
 * A small results table (chapter media type "table"): the first row is the
 * header. Numbers live here, not in the chapter's sentences (Ali, 11-02).
 */
function ResultTable({ rows, title }: { rows: NonNullable<NonNullable<ChapterMediaValue>["table"]>; title: string }) {
  const cells = rows.map((r) => (r.cells ?? []).filter((c): c is string => typeof c === "string"));
  if (cells.length === 0) return null;
  const [head, ...body] = cells;
  return (
    <table className="w-full border-collapse text-sm tabular-nums desktop:text-body" aria-label={title}>
      <thead>
        <tr className="border-y border-tertiary">
          {head.map((c, i) => (
            <th key={i} scope="col" className={`py-2.5 pr-4 text-left font-normal text-secondary desktop:py-3 ${i === 0 ? "w-1/2" : ""}`}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {body.map((row, r) => (
          <tr key={r} className="border-b border-tertiary">
            {row.map((c, i) =>
              i === 0 ? (
                <th key={i} scope="row" className="py-2.5 pr-4 text-left font-normal text-primary desktop:py-3">
                  {c}
                </th>
              ) : (
                <td key={i} className="py-2.5 pr-4 text-primary desktop:py-3">
                  {c}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * One chapter (type scale, Ali 11-02): an optional statement, a big
 * full-width question or statement at h1 (h2 on a phone) that opens an act;
 * then the heading (24) in the title lane, and in the reading lane a one-line
 * subtext (18) over the paragraph (16). A chapter can be a statement on its
 * own (no title), text without media, or carry a laptop + phone pair.
 * On a phone a statement chapter stacks statement, media, heading, text.
 */
function ChapterSection({ chapter, index, hidden }: { chapter: Chapter; index: number; hidden: boolean }) {
  const phone = PHONE[useContext(MobileVariantContext)];
  const statement = chapter.statement?.trim() || null;
  const heading = chapter.title?.trim() || null;
  const label = heading ?? statement ?? `Chapter ${index + 1}`;
  const subtext = chapter.subtext?.trim() || null;
  const text = Array.isArray(chapter.text) && chapter.text.length > 0 ? (chapter.text as PortableTextBlock[]) : null;
  const hasMedia = Boolean(chapter.media?.type);
  const layout = layoutOf(chapter);
  const H = statement ? "h3" : "h2";

  const statementEl = statement ? (
    <h2 className="col-span-4 text-h2 text-primary desktop:col-start-1 desktop:col-end-11 desktop:text-h1">{statement}</h2>
  ) : null;

  if (!heading && !subtext && !text && !hasMedia) {
    return statementEl ? (
      <section className="grid-site px-margin pt-16 pb-6 desktop:pt-32 desktop:pb-12" aria-label={label}>
        {statementEl}
      </section>
    ) : null;
  }

  // On a phone a statement chapter shows its media right under the statement.
  const mediaFirst = statement && hasMedia;
  const o = { text: mediaFirst ? "order-2 desktop:order-none" : "" };
  const mediaBox = (phoneBase: string) =>
    mediaFirst ? "col-span-4 order-1 mb-6 desktop:order-none desktop:mb-0" : phoneBase;

  const reading = (subtext || text) && (
    <>
      {subtext && <p className="text-lead text-primary">{subtext}</p>}
      {text && (
        <div className={`text-body text-primary [&>p]:my-0 [&>p+p]:mt-3 ${subtext ? "mt-3 desktop:mt-4" : ""}`}>
          <PortableText value={text} components={portableTextComponents} />
        </div>
      )}
    </>
  );
  const headingEl = heading && <H className={`${phone.title} text-primary desktop:text-h3`}>{heading}</H>;

  const media = (sizes: string, value: ChapterMediaValue = chapter.media) =>
    value?.type === "table" ? (
      <ResultTable rows={value.table ?? []} title={label} />
    ) : (
      <ChapterMedia media={value} title={label} hidden={hidden} sizes={sizes} />
    );

  let body: ReactNode;
  if (layout === "beside" || layout === "beside-phone") {
    const left = chapter.side === "left";
    const phoneLane = layout === "beside-phone";
    const textCols = left ? "desktop:col-start-8 desktop:col-end-13" : "desktop:col-start-1 desktop:col-end-6";
    const mediaCols = phoneLane
      ? left ? "desktop:col-start-2 desktop:col-end-6" : "desktop:col-start-8 desktop:col-end-12"
      : left ? "desktop:col-start-1 desktop:col-end-7" : "desktop:col-start-7 desktop:col-end-13";
    body = (
      <div className="grid-site desktop:items-center">
        <div className={`col-span-4 ${textCols} desktop:row-start-1 ${o.text}`}>
          {headingEl}
          {reading && <div className={heading ? "mt-3 desktop:mt-6" : ""}>{reading}</div>}
        </div>
        {hasMedia && (
          <div className={`${mediaBox(phone.beside)} desktop:mt-0 ${mediaCols} desktop:row-start-1`}>
            {media(phoneLane ? "(min-width: 75rem) 30vw, 100vw" : "(min-width: 75rem) 50vw, 100vw")}
            <Caption text={chapter.caption} />
          </div>
        )}
      </div>
    );
  } else {
    const pair = layout === "pair-left" || layout === "pair-right";
    const width: MediaWidth = pair ? "full" : layout;
    body = (
      <div className="grid-site">
        {headingEl && <div className={`col-span-4 desktop:col-start-1 desktop:col-end-4 ${o.text}`}>{headingEl}</div>}
        {reading && (
          <div className={`col-span-4 ${heading ? "mt-3" : ""} desktop:col-start-5 desktop:col-end-10 desktop:mt-0 ${o.text}`}>{reading}</div>
        )}
        {hasMedia && !pair && (
          <div className={`${mediaBox(phone.media(width, index))} desktop:mt-8 ${MEDIA_ROWS[width]}`}>
            {media(width === "full" ? "100vw" : "(min-width: 75rem) 60vw, 100vw")}
            <Caption text={chapter.caption} />
          </div>
        )}
        {hasMedia && pair && (
          <div className={`${mediaBox("col-span-4 mt-4")} desktop:col-span-12 desktop:mt-8`}>
            <div className="grid-site items-stretch">
              <div className={`col-span-4 ${layout === "pair-left" ? "desktop:col-start-5 desktop:col-end-13 desktop:row-start-1" : "desktop:col-start-1 desktop:col-end-9"}`}>
                {media("(min-width: 75rem) 66vw, 100vw")}
              </div>
              {chapter.phone?.type && (
                // The phone stands as tall as the laptop media beside it (laptop), centred in its four columns.
                <div className={`relative col-span-4 mt-4 desktop:mt-0 ${layout === "pair-left" ? "desktop:col-start-1 desktop:col-end-5 desktop:row-start-1" : "desktop:col-start-9 desktop:col-end-13"}`}>
                  <div className="mx-auto aspect-[390/844] w-2/3 overflow-hidden rounded-[18px] desktop:absolute desktop:inset-y-0 desktop:left-1/2 desktop:w-auto desktop:-translate-x-1/2 desktop:rounded-[24px]">
                    <ChapterMedia media={chapter.phone as ChapterMediaValue} title={label} hidden={hidden} fit="phone" sizes="(min-width: 75rem) 20vw, 66vw" />
                  </div>
                </div>
              )}
            </div>
            <Caption text={chapter.caption} />
          </div>
        )}
      </div>
    );
  }

  return (
    <section
      className={`px-margin ${statement ? "pt-16 pb-6 desktop:pt-32 desktop:pb-12" : "py-6 desktop:py-12"}`}
      aria-label={label}
    >
      {statementEl && <div className="grid-site mb-6 desktop:mb-12">{statementEl}</div>}
      {body}
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
/**
 * Where the photo sits on a phone (lab, 10-30). flow = in the page, 560 px
 * tall, the text below it. sticky = pinned under the header at 45 % of the
 * screen while the text scrolls beneath, so phone, text and controls stay
 * on screen together. follow = in the page, and once the photo's controls
 * scroll away they float at the bottom of the screen while the text is in
 * view (like Stronger's sticky add to cart).
 */
export type SwitcherStage = "flow" | "sticky" | "follow";
export const SwitcherStageContext = createContext<SwitcherStage>("flow");

const FROST = "bg-white/80 backdrop-blur-md";
const EASE = "duration-[240ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none";
// The phone: 390:844, 500 px tall on a phone, 600 on a laptop.
// The phone: 390:844, --phone-h tall (set on the stage per layout), 600 px on a laptop.
const PHONE_BOX =
  "relative aspect-[390/844] h-[var(--phone-h)] flex-none overflow-hidden rounded-[6%/2.8%] bg-white shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)] desktop:h-[600px]";
const TRACK_GAP = 16;

function Chevron({ back }: { back?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className={back ? "rotate-180" : ""}>
      <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The switcher's controls: the frosted segmented bar (laptop always, phone
 * in M1), the name chip with dots (M2) or back/next around the chip (M3).
 * Rendered on the photo, and again floating at the bottom of the screen in
 * the follow stage, where `tabs` is off so only one tablist exists.
 */
function SwitcherControls({
  tests,
  current,
  select,
  motion,
  id,
  label,
  pos,
  tabs = false,
  shadow = false,
}: {
  tests: AbTest[];
  current: number;
  select: (i: number) => void;
  motion: SwitcherMotion;
  id: string;
  label: string;
  /** Where each control row sits: absolute, along the bottom of its parent. */
  pos: string;
  tabs?: boolean;
  shadow?: boolean;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  const nameOf = (t: AbTest) => t.label ?? t.title ?? "Test";
  const swipe = motion === "swipe";
  const arrows = motion === "arrows";
  const lift = shadow ? " shadow-[0_8px_24px_-8px_rgba(0,0,0,0.3)]" : "";
  const chip = `${FROST}${lift} pointer-events-auto flex h-10 items-center rounded-full px-4 text-body text-primary`;
  const round = `${FROST}${lift} pointer-events-auto flex size-10 items-center justify-center rounded-full text-primary disabled:opacity-40`;

  // The pistachio thumb slides to the open segment; on a phone the bar also
  // scrolls so the open segment sits in the middle.
  useLayoutEffect(() => {
    const bar = barRef.current;
    const seg = bar?.querySelectorAll<HTMLElement>("button")[current];
    if (!bar || !seg) return;
    const place = () => setThumb({ left: seg.offsetLeft, width: seg.offsetWidth });
    place();
    bar.scrollTo({ left: seg.offsetLeft - (bar.clientWidth - seg.offsetWidth) / 2, behavior: "smooth" });
    const ro = new ResizeObserver(place);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [current]);

  const onKey = (e: React.KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tests.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = (keys[e.key] + tests.length) % tests.length;
    select(next);
    barRef.current?.querySelectorAll<HTMLElement>("button")[next]?.focus();
  };

  return (
    <>
      <div className={`${pos} justify-center ${swipe || arrows ? "hidden desktop:flex" : "flex"}`}>
        <div className={`${FROST}${lift} max-w-full rounded-full p-1`}>
          <div
            ref={barRef}
            role={tabs ? "tablist" : "group"}
            aria-label={label}
            onKeyDown={onKey}
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
              const a11y = tabs
                ? { role: "tab", "aria-selected": selected, "aria-controls": `${id}-panel-${i}`, id: `${id}-tab-${i}` }
                : { "aria-pressed": selected };
              return (
                <button
                  key={t._key}
                  type="button"
                  {...a11y}
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

      {swipe && (
        <div className={`pointer-events-none ${pos} flex justify-center desktop:hidden`}>
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

      {arrows && (
        <div className={`pointer-events-none ${pos} flex items-center justify-center gap-2 desktop:hidden`}>
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
    </>
  );
}

/**
 * Follow stage: true while the photo's own controls are off screen and the
 * test text is still on screen, like a sticky add to cart under a buy box.
 */
function useFloatingControls(on: boolean, stageRef: RefObject<HTMLElement | null>, textRef: RefObject<HTMLElement | null>) {
  const [floating, setFloating] = useState(false);
  useEffect(() => {
    const stage = stageRef.current;
    const text = textRef.current;
    if (!on || !stage || !text) return;
    let stageSeen = true;
    let textSeen = false;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === stage) stageSeen = e.isIntersecting;
        else textSeen = e.isIntersecting;
      }
      setFloating(!stageSeen && textSeen);
    }, { rootMargin: "-40px 0px 0px 0px" });
    io.observe(stage);
    io.observe(text);
    return () => io.disconnect();
  }, [on, stageRef, textRef]);
  return on && floating;
}

// The coded morph per test (today's page into the design). Tests seeded before
// the morph field existed fall back on their label.
const MORPH_BY_LABEL: Record<string, MorphKey> = {
  "Bestseller badge": "badge",
  "Delivery promise": "delivery",
  "Sold-out row": "soldout",
  "Similar product": "similar",
  "Kit upgrade": "kit",
};
const morphOf = (t: AbTest) => {
  const key = (t.morph ?? MORPH_BY_LABEL[t.label ?? ""]) as MorphKey | undefined;
  return key ? SCENE_BY_KEY[key] : undefined;
};

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
  const stageMode = useContext(SwitcherStageContext);
  const sticky = stageMode === "sticky";
  const follow = stageMode === "follow";
  const textRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const current = Math.min(active, Math.max(0, tests.length - 1));
  const floating = useFloatingControls(follow, stageRef, textRef);
  const morphs = useRef<(TestMorphHandle | null)[]>([]);
  // A test's morph plays from the start each time it is opened.
  const opened = useRef(current);
  useEffect(() => {
    if (opened.current === current) return;
    opened.current = current;
    morphs.current[current]?.replay();
  }, [current]);

  if (!tests.length) return null;
  const stepOf = (track: HTMLElement) => ((track.firstElementChild as HTMLElement | null)?.offsetWidth ?? 231) + TRACK_GAP;
  const sectionTitle = block.title ?? "Tests";
  const nameOf = (t: AbTest) => t.label ?? t.title ?? "Test";
  const swipe = motion === "swipe";
  const arrows = motion === "arrows";

  const select = (i: number) => {
    const next = Math.max(0, Math.min(tests.length - 1, i));
    setActive(next);
    const track = trackRef.current;
    if (swipe && track && track.scrollWidth > track.clientWidth) {
      track.scrollTo({ left: next * stepOf(track), behavior: "smooth" });
    }
    // Sticky and follow: a new test starts reading from its first line, under
    // the pinned stage or under the header.
    const text = textRef.current;
    if ((sticky || follow) && text && window.matchMedia("(max-width: 74.99rem)").matches) {
      const under = sticky ? (stageRef.current?.getBoundingClientRect().bottom ?? 0) : (document.querySelector("header")?.getBoundingClientRect().bottom ?? 0);
      const top = text.getBoundingClientRect().top;
      if (top < under) window.scrollBy({ top: top - under - 16, behavior: "smooth" });
    }
  };
  // Swipe (M2): the phone nearest the middle of the track is the open test.
  const onTrackScroll = () => {
    const track = trackRef.current;
    if (!track || track.scrollWidth <= track.clientWidth) return;
    const i = Math.max(0, Math.min(tests.length - 1, Math.round(track.scrollLeft / stepOf(track))));
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
  const backdrop = block.backdrop?.asset ? block.backdrop : null;
  const hotspot = backdrop?.hotspot;

  return (
    <section className="grid-site px-margin py-6 desktop:py-12" aria-label={sectionTitle}>
      {block.title && (
        <h2 className={`${phone.title} desktop:col-span-12 desktop:text-h3 text-primary mb-6 desktop:mb-8`}>{block.title}</h2>
      )}

      {/* The photo with the phone in focus. */}
      <div
        ref={stageRef}
        className={`relative col-span-4 overflow-hidden bg-tertiary desktop:relative desktop:top-auto desktop:col-span-12 desktop:h-[760px] ${
          sticky
            ? "sticky top-[var(--header-height)] z-10 h-[45dvh] [--phone-h:calc(45dvh-40px)] desktop:z-auto"
            : "h-[560px] [--phone-h:500px]"
        }`}
      >
        {backdrop && (
          <Image
            src={backdrop.asset?.url?.startsWith("/") ? backdrop.asset.url : imageUrl(backdrop, 2400)}
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
          className={`absolute inset-x-0 desktop:top-8 ${sticky ? "top-3" : "top-6"} ${
            swipe
              ? "flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50%-var(--phone-h)*195/844)] pb-16 desktop:grid desktop:justify-items-center desktop:overflow-visible desktop:px-0 desktop:pb-0"
              : "grid justify-items-center"
          }`}
        >
          {tests.map((t, i) => (
            <div
              key={t._key}
              className={`${PHONE_BOX} desktop:col-start-1 desktop:row-start-1 ${swipe ? "" : "col-start-1 row-start-1"} ${phoneState(i)}`}
              aria-hidden={i !== current}
            >
              {morphOf(t) ? (
                <TestMorph
                  ref={(h) => {
                    morphs.current[i] = h;
                  }}
                  scene={morphOf(t)!}
                  autoplay={!hidden}
                  className="h-full w-full"
                />
              ) : (
                <ChapterMedia
                  media={t.media}
                  title={t.title ?? nameOf(t)}
                  hidden={hidden || i !== current}
                  fit="phone"
                  sizes="(min-width: 75rem) 280px, 240px"
                />
              )}
            </div>
          ))}
        </div>

        <SwitcherControls
          tests={tests}
          current={current}
          select={select}
          motion={motion}
          id={block._key}
          label={sectionTitle}
          pos="absolute inset-x-4 bottom-4 desktop:bottom-6"
          tabs
        />
      </div>

      <div className="col-span-4 grid desktop:col-span-12">
        {tests.map((t, i) => (
          <div key={t._key} className={`col-start-1 row-start-1 ${fade(i)}`} aria-hidden={i !== current}>
            <Caption text={t.caption} />
          </div>
        ))}
      </div>

      {/* Title and text (cols 1-5) facing the story (cols 7-12). */}
      <div ref={textRef} className="col-span-4 mt-6 grid desktop:col-span-12 desktop:mt-10">
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
                <h3 className="text-h3 text-primary">{title}</h3>
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
      {/* Follow: the controls float at the bottom of the screen, like a sticky add to cart. */}
      {follow && (
        <div
          aria-hidden={!floating}
          inert={!floating}
          className={`fixed inset-x-0 bottom-4 z-40 h-12 transition-[opacity,translate] ${EASE} desktop:hidden ${
            floating ? "opacity-100" : "pointer-events-none translate-y-6 opacity-0"
          }`}
        >
          <SwitcherControls
            tests={tests}
            current={current}
            select={select}
            motion={motion}
            id={block._key}
            label={sectionTitle}
            pos="absolute inset-x-4 bottom-0"
            shadow
          />
        </div>
      )}
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
    <FrameSourceContext.Provider value={project}>
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
            frame={landing && landing._type !== "galleryPhones" ? resolveLandingFrame(landing.frame, project) : undefined}
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
              className="mt-4 text-lead text-primary [&>p]:my-0 [&>p+p]:mt-3 [&>h2]:mt-12 [&>h3]:mt-10"
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
            // The bar carries the title on a laptop (ScrollProgress).
            <h2 className="text-h2 text-primary desktop:hidden">
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
    </FrameSourceContext.Provider>
    </MobileVariantContext.Provider>
  );
}
