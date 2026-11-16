"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import NextLink from "next/link";
import type { PortableTextBlock } from "next-sanity";
import { PortableText } from "next-sanity";
import { useLenis } from "lenis/react";
import type { ABOUT_QUERY_RESULT } from "@/sanity/types";
import { EASE_OUT_CSS } from "@/lib/motion";
import CopyButton from "@/components/CopyButton";
import { useModalFocus } from "@/hooks/useModalFocus";

const SpotifyWidget = dynamic(() => import("./SpotifyWidget"), { ssr: false });

export type AboutData = Pick<NonNullable<ABOUT_QUERY_RESULT>, "bio" | "email" | "linkedinUrl" | "githubUrl">;

const LINK = "w-fit hover:opacity-60";

/**
 * The bio's first sentence leads, the rest follows as body. Only a plain
 * first paragraph is split (no marks or links in it); anything richer
 * keeps its blocks as they are and leads with nothing.
 */
function splitLead(bio: PortableTextBlock[]): { lead: string | null; body: PortableTextBlock[] } {
  const [first, ...rest] = bio;
  const children = (first?.children ?? []) as { _type: string; text?: string; marks?: string[] }[];
  const plain = first?._type === "block" && children.every((c) => c._type === "span" && !c.marks?.length);
  if (!plain) return { lead: null, body: bio };
  const text = children.map((c) => c.text ?? "").join("");
  const end = text.search(/[.!?](\s|$)/);
  if (end < 0) return { lead: text, body: rest };
  const lead = text.slice(0, end + 1);
  const tail = text.slice(end + 1).trim();
  const tailBlock = tail
    ? [{ ...first, _key: `${first._key ?? "b"}-tail`, children: [{ _type: "span", _key: "t", text: tail, marks: [] }] }]
    : [];
  return { lead, body: [...tailBlock, ...rest] as PortableTextBlock[] };
}

/**
 * About as a panel instead of a page (Ali, 11-16, option A in Figma
 * "About panel · 11-16"): the header's About link opens it over whatever
 * page you are on. Same surface and motion as the project details overlay,
 * laid on the site grid: the lead on columns 3-10, the text on 4-9 (on a
 * phone all four). The header stays above it, so About closes it again.
 */
export default function AboutPanel({
  about,
  open,
  onClose,
}: {
  about: AboutData | null;
  open: boolean;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const bio = (about?.bio ?? []) as PortableTextBlock[];
  const { lead, body } = splitLead(bio);

  useModalFocus(open, rootRef, closeRef, onClose);

  // The page behind holds still while the panel is up: Lenis stops, and
  // the native scroll (touch, keyboard) is held by the root's overflow.
  // Each open starts at the top of the text.
  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    return () => {
      html.style.overflow = prev;
      lenis?.start();
    };
  }, [open, lenis]);

  // Same beat as the project details: 240 ms in with an 8 px rise, 160 ms
  // out as a plain fade.
  const ms = open ? 240 : 160;
  const fade = `opacity ${ms}ms ${EASE_OUT_CSS}, visibility 0s${open ? "" : ` linear ${ms}ms`}`;
  const lift = open
    ? `transform ${ms}ms ${EASE_OUT_CSS}, opacity ${ms}ms ${EASE_OUT_CSS}`
    : `opacity ${ms}ms ${EASE_OUT_CSS}, transform 0s ${ms}ms`;

  const closeOnBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      ref={rootRef}
      id="about-panel"
      role="dialog"
      aria-modal="true"
      aria-label="About"
      aria-hidden={!open}
      className="frost-strong fixed inset-x-0 bottom-0 top-[var(--header-height)] z-[45]"
      style={{ opacity: open ? 1 : 0, visibility: open ? "visible" : "hidden", transition: fade }}
    >
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overscroll-contain" data-lenis-prevent onClick={closeOnBackdrop}>
        <div
          className="grid-site px-margin pt-6 pb-28 desktop:pt-14 motion-reduce:transform-none!"
          onClick={closeOnBackdrop}
          style={{ transform: open ? "none" : "translateY(8px)", opacity: open ? 1 : 0, transition: lift }}
        >
          {lead && (
            <p className="col-span-full max-w-[44rem] text-h3 text-primary desktop:col-start-3 desktop:col-span-8 desktop:max-w-none desktop:text-center desktop:text-h2">
              {lead}
            </p>
          )}
          {body.length > 0 && (
            <div className="col-span-full mt-6 max-w-[44rem] text-body text-primary break-words desktop:col-start-4 desktop:col-span-6 desktop:mt-10 desktop:max-w-none desktop:text-lead [&_p+p]:mt-4">
              <PortableText value={body} />
            </div>
          )}
          <div className="col-span-full mt-6 flex flex-col items-start gap-1 text-body text-primary desktop:col-start-4 desktop:col-span-6">
            {about?.linkedinUrl && (
              <NextLink href={about.linkedinUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
                LinkedIn ↗<span className="sr-only"> (opens in a new tab)</span>
              </NextLink>
            )}
            {about?.githubUrl && (
              <NextLink href={about.githubUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
                GitHub ↗<span className="sr-only"> (opens in a new tab)</span>
              </NextLink>
            )}
            {about?.email && (
              <CopyButton value={about.email} label="Copy my email" className={`${LINK} cursor-pointer text-left`} />
            )}
          </div>
          <div className="col-span-full mt-8 w-full max-w-[400px] desktop:col-start-4 desktop:col-span-6">
            {open && <SpotifyWidget />}
          </div>
        </div>
      </div>
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        className="frost-soft absolute bottom-8 left-1/2 inline-flex h-9 -translate-x-1/2 cursor-pointer items-center rounded-full px-4 text-sub uppercase font-medium text-primary transition-[scale] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] select-none active:scale-[0.97]"
      >
        Close
      </button>
    </div>
  );
}
