"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import type { FocusEvent, MouseEvent, PointerEvent } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useAnchoredMobileOverlay } from "@/hooks/useAnchoredMobileOverlay";
import VideoPlayer from "@/components/player/VideoPlayer";

interface RichPreviewProps {
  videoUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  url?: string;
  label?: string;
  children: React.ReactNode;
}

// Grace period when the pointer travels from the phrase to the popup.
const LEAVE_MS = 150;
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
// Hover intent: the pointer has to rest on the phrase this long before the
// card opens, so passing over a link on the way somewhere else does nothing.
const OPEN_MS = 120;
// Desktop card: full width when it fits, narrower when neither side of the
// phrase has room for it (the card used to clamp on top of the phrase).
const CARD_MAX = 600;
const CARD_MIN = 360;
// Caption row + control bar + caret gap + viewport padding, generous for a
// title that wraps to three lines.
const CARD_CHROME = 150;
// Where the pointer last was, updated after React's handlers run (window,
// bubble phase). Chrome sends pointermoves while the page scrolls under a
// still pointer; those repeat this position with zero movement.
let lastPointer: { x: number; y: number } | null = null;
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointermove",
    (e) => {
      lastPointer = { x: e.clientX, y: e.clientY };
    },
    { passive: true },
  );
}

/**
 * Pop-up preview on a phrase in a journal post. The card is portaled to
 * <body>: the mark sits inside a <p>, and the shared VideoPlayer renders
 * block elements, which a <p> cannot contain. The player mounts on the first
 * open, so previews nobody opens never fetch, and then stays mounted (paused,
 * hidden) between hovers: unmounting made Safari refetch the file on every
 * re-hover, flashing an empty box and losing the position.
 */
export default function RichPreview({
  videoUrl,
  imageUrl,
  imageAlt,
  url,
  label,
  children,
}: RichPreviewProps) {
  const hasVideo = Boolean(videoUrl);
  const hasImage = !hasVideo && Boolean(imageUrl);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [anchorPoint, setAnchorPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [cardWidth, setCardWidth] = useState(CARD_MAX);
  // Last measured position, kept through the fade-out (the hook clears it
  // the moment `visible` drops).
  const lastPosition = useRef<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const cardId = useId();
  // Set while focus is moved back to the phrase by script, so the focus
  // handler does not reopen the card that Escape just closed.
  const restoringFocus = useRef(false);
  // Enter/Space opened the card: move focus into it once it is in the DOM.
  const focusCardOnOpen = useRef(false);

  const close = useCallback(() => {
    setVisible(false);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    if (openTimer.current) clearTimeout(openTimer.current);
  }, []);

  const focusIntoCard = useCallback(() => {
    const first = popupRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    if (!first) return false;
    first.focus();
    return true;
  }, []);

  const restoreFocus = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    restoringFocus.current = true;
    trigger.focus();
    restoringFocus.current = false;
  }, []);

  // Escape closes the card; focus that was inside it goes back to the phrase.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const inCard = popupRef.current?.contains(document.activeElement) ?? false;
      close();
      if (inCard) restoreFocus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, close, restoreFocus]);

  useEffect(() => {
    if (!visible || !focusCardOnOpen.current) return;
    focusCardOnOpen.current = false;
    focusIntoCard();
  }, [visible, focusIntoCard]);

  const { isMobile, position, placement, caretLeft, ready } =
    useAnchoredMobileOverlay(triggerRef, popupRef, {
      visible,
      onClose: close,
      anchorPoint,
      anchorOnDesktop: true,
      followOnScroll: true,
    });

  // Mounting happens in `show` (same commit as `visible`), so the anchoring
  // hook can measure the card in its layout effect; an effect here would
  // mount it one commit too late and leave the card unpositioned.

  useGSAP(
    () => {
      const el = triggerRef.current;
      if (!el) return;

      gsap.set(el, {
        backgroundImage:
          "linear-gradient(var(--color-pistachio), var(--color-pistachio))",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left center",
        backgroundSize: "0% 100%",
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      });

      // See GlossaryTerm for rationale — IntersectionObserver avoids the
      // "already filled when I arrive" bug that ScrollTrigger + once + delay caused
      // during page transitions / fast scrolls.
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry?.isIntersecting) return;
          observer.disconnect();
          gsap.to(el, {
            backgroundSize: "100% 100%",
            duration: 0.8,
            ease: "power2.out",
          });
        },
        { threshold: 0.5 },
      );
      observer.observe(el);

      return () => observer.disconnect();
    },
    { scope: triggerRef, dependencies: [isMobile, videoUrl, imageUrl, label] },
  );

  const show = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    if (openTimer.current) clearTimeout(openTimer.current);
    if (!visible) {
      // Fit the 16:9 card into the roomier side of the phrase.
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const room = Math.max(rect.top, window.innerHeight - rect.bottom) - CARD_CHROME;
        setCardWidth(Math.round(Math.max(CARD_MIN, Math.min(CARD_MAX, (room * 16) / 9))));
      }
    }
    setMounted(true);
    setVisible(true);
  };

  /*
   * Desktop hover, as states (11-05 spec, from a real trackpad trace):
   *   idle    → intent   a pointer move over the phrase that actually moved
   *                      the pointer. A phrase sliding under a still pointer
   *                      (Lenis glides ~2 s after the wheel) is not a hover.
   *   intent  → open     after OPEN_MS, whether or not the page is moving.
   *   intent  → idle     pointer leaves the phrase first.
   *   open    → closing  pointer leaves phrase and card; scrolling alone
   *                      does not close it, the card follows the phrase.
   *   closing → open     pointer back on the phrase or the card in time.
   *   closing → idle     after LEAVE_MS.
   */
  const onPhraseMove = (e: PointerEvent<HTMLSpanElement>) => {
    if (e.pointerType !== "mouse" || isMobile) return;
    if (visible) {
      if (leaveTimer.current) clearTimeout(leaveTimer.current); // closing → open
      return;
    }
    if (openTimer.current) return; // already in intent
    const still =
      e.movementX === 0 &&
      e.movementY === 0 &&
      lastPointer !== null &&
      lastPointer.x === e.clientX &&
      lastPointer.y === e.clientY;
    if (still) return; // the page moved, not the pointer
    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      show();
    }, OPEN_MS);
  };

  const onCardEnter = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !visible) return;
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  };

  const hideSoon = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = null;
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setVisible(false), LEAVE_MS);
  };

  const handleClick = (event: MouseEvent<HTMLSpanElement>) => {
    setAnchorPoint({ x: event.clientX, y: event.clientY });
    if (visible) {
      close();
      return;
    }
    show();
  };

  const handleFocus = () => {
    if (restoringFocus.current) return;
    show();
  };

  // Focus events inside the portaled card reach this handler too (React
  // bubbles through portals). Close only when focus lands outside both the
  // phrase and the card; with no destination (a tap on plain text) the
  // outside-tap handler decides on touch.
  const handleFocusOut = (e: FocusEvent<HTMLElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && (triggerRef.current?.contains(next) || popupRef.current?.contains(next))) return;
    if (!next && isMobile) return;
    close();
  };

  useEffect(
    () => () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
      if (openTimer.current) clearTimeout(openTimer.current);
    },
    [],
  );

  const card = (width: string | number) => (
    <div className="relative flex flex-col" style={{ width }}>
      <div className="flex flex-col overflow-hidden rounded-2xl bg-lightpistachio">
        {hasVideo && mounted ? (
          <VideoPlayer
            src={videoUrl!}
            label={label}
            linkUrl={url}
            aspect="16/9"
            fit="cover"
            active={visible}
            trackId={label}
            className="rounded-none"
          />
        ) : hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={imageAlt ?? ""}
              className="aspect-video w-full object-contain"
            />
            {label && (
              <span className="px-3 pt-2 text-sub font-medium uppercase tracking-[0.02em] text-primary">
                {label}
              </span>
            )}
          </>
        ) : null}
        {url && !hasVideo && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label ? `See more about ${label}` : "See more"}
            onClick={(e) => e.stopPropagation()}
            className="mx-3 mb-2 mt-1 self-start border-b border-primary text-sub text-primary"
          >
            See more →
          </a>
        )}
      </div>

      {caretLeft !== null && placement === "above" && (
        <span
          className="absolute top-full size-0 -translate-x-1/2 border-x-[6px] border-x-transparent border-t-[6px] border-t-lightpistachio"
          style={{ left: caretLeft }}
        />
      )}
      {caretLeft !== null && placement === "below" && (
        <span
          className="absolute bottom-full size-0 -translate-x-1/2 border-x-[6px] border-x-transparent border-b-[6px] border-b-lightpistachio"
          style={{ left: caretLeft }}
        />
      )}
    </div>
  );

  if (position) lastPosition.current = { top: position.top, left: position.left };
  const place = position ?? lastPosition.current;
  const showPopup = visible && ready;
  const width = isMobile ? "min(420px, calc(100vw - 32px))" : cardWidth;

  return (
    <span
      className="relative inline"
      onFocus={isMobile ? undefined : handleFocus}
      onBlur={handleFocusOut}
    >
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popupRef}
            id={cardId}
            role="dialog"
            aria-label={label ? `Preview: ${label}` : "Preview"}
            aria-hidden={!visible || undefined}
            inert={!visible}
            onPointerEnter={isMobile ? undefined : onCardEnter}
            onPointerLeave={isMobile ? undefined : hideSoon}
            className={`fixed z-50 transition-[opacity,transform] duration-300 ease-[var(--ease-out)] ${
              showPopup
                ? "pointer-events-auto translate-y-0 opacity-100"
                : "pointer-events-none translate-y-1 opacity-0"
            }`}
            style={
              place
                ? { top: place.top, left: place.left }
                : { top: 0, left: 0, visibility: "hidden" as const }
            }
          >
            {card(width)}
          </div>,
          document.body,
        )}

      <span
        ref={triggerRef}
        onPointerMove={onPhraseMove}
        onPointerLeave={isMobile ? undefined : hideSoon}
        role="button"
        tabIndex={0}
        data-preview-label={label ?? ""}
        aria-haspopup="dialog"
        aria-expanded={visible}
        aria-controls={mounted ? cardId : undefined}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          // Enter goes into the preview (focus may have opened it already);
          // Escape closes it. With nothing to focus inside, toggle instead.
          if (visible) {
            if (!focusIntoCard()) close();
            return;
          }
          setAnchorPoint(null);
          focusCardOnOpen.current = true;
          show();
        }}
        className="cursor-pointer"
      >
        {children}
      </span>
    </span>
  );
}
