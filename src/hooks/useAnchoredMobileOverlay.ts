"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  type RefObject,
} from "react";
import { useIsMobile } from "@/hooks/useIsDesktop";

const SIDE_PADDING = 16;
const GAP = 10;
const TOP_PADDING = 12;
const BOTTOM_PADDING = 12;
const CARET_INSET = 16;

export interface OverlayPosition {
  top: number;
  left: number;
  caretLeft: number;
  placement: "above" | "below";
}

interface UseAnchoredMobileOverlayOptions {
  visible: boolean;
  onClose: () => void;
  anchorPoint?: { x: number; y: number } | null;
  forceAbove?: boolean;
  /** Anchor on every breakpoint, not only mobile (for portaled popups). */
  anchorOnDesktop?: boolean;
  /**
   * Desktop only: while open, follow the trigger when the page scrolls
   * (keeping the side it opened on) instead of closing. The host closes it
   * when the pointer leaves. Touch keeps closing on scroll.
   */
  followOnScroll?: boolean;
}

export function useAnchoredMobileOverlay(
  triggerRef: RefObject<HTMLElement | null>,
  popupRef: RefObject<HTMLElement | null>,
  {
    visible,
    onClose,
    anchorPoint = null,
    forceAbove = false,
    anchorOnDesktop = false,
    followOnScroll = false,
  }: UseAnchoredMobileOverlayOptions,
) {
  const isMobile = useIsMobile();
  const active = isMobile || anchorOnDesktop;
  const [position, setPosition] = useState<OverlayPosition | null>(null);
  const [ready, setReady] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const measurePosition = useCallback((keep?: "above" | "below") => {
    const trigger = triggerRef.current;
    const popup = popupRef.current;
    if (!trigger || !popup) {
      return null;
    }

    const triggerRects = Array.from(trigger.getClientRects());
    const triggerRect =
      triggerRects.length === 0
        ? trigger.getBoundingClientRect()
        : anchorPoint
          ? triggerRects.reduce((bestRect, rect) => {
              const containsPoint =
                anchorPoint.x >= rect.left &&
                anchorPoint.x <= rect.right &&
                anchorPoint.y >= rect.top &&
                anchorPoint.y <= rect.bottom;

              if (containsPoint) return rect;

              const bestCenterX = bestRect.left + bestRect.width / 2;
              const bestCenterY = bestRect.top + bestRect.height / 2;
              const rectCenterX = rect.left + rect.width / 2;
              const rectCenterY = rect.top + rect.height / 2;
              const bestDistance = Math.hypot(anchorPoint.x - bestCenterX, anchorPoint.y - bestCenterY);
              const rectDistance = Math.hypot(anchorPoint.x - rectCenterX, anchorPoint.y - rectCenterY);

              return rectDistance < bestDistance ? rect : bestRect;
            })
          : triggerRects[0];
    const popupRect = popup.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const triggerCenterX = triggerRect.left + triggerRect.width / 2;

    let left = triggerCenterX - popupRect.width / 2;
    left = Math.max(SIDE_PADDING, Math.min(left, vw - popupRect.width - SIDE_PADDING));

    const aboveTop = triggerRect.top - popupRect.height - GAP;
    const belowTop = triggerRect.bottom + GAP;
    const fitsAbove = aboveTop >= TOP_PADDING;
    const fitsBelow = belowTop + popupRect.height <= vh - BOTTOM_PADDING;

    let top = aboveTop;
    let placement: "above" | "below" = "above";

    if (keep) {
      // Following a scroll: stay on the same side, no clamping, so the card
      // moves with the phrase instead of flipping or sticking to an edge.
      top = keep === "above" ? aboveTop : belowTop;
      placement = keep;
    } else if (forceAbove) {
      // Always place above, clamp to viewport top
      top = Math.max(TOP_PADDING, aboveTop);
    } else if (!fitsAbove && fitsBelow) {
      top = belowTop;
      placement = "below";
    } else if (!fitsAbove && !fitsBelow) {
      const clampedAbove = Math.max(TOP_PADDING, Math.min(aboveTop, vh - popupRect.height - BOTTOM_PADDING));
      const clampedBelow = Math.max(TOP_PADDING, Math.min(belowTop, vh - popupRect.height - BOTTOM_PADDING));
      const aboveDistance = Math.abs(clampedAbove - aboveTop);
      const belowDistance = Math.abs(clampedBelow - belowTop);

      if (belowDistance < aboveDistance) {
        top = clampedBelow;
        placement = "below";
      } else {
        top = clampedAbove;
      }
    }

    let caretLeft = triggerCenterX - left;
    caretLeft = Math.max(CARET_INSET, Math.min(caretLeft, popupRect.width - CARET_INSET));

    return { top, left, caretLeft, placement };
  }, [anchorPoint, forceAbove, popupRef, triggerRef]);

  useLayoutEffect(() => {
    if (!visible || !active) {
      setPosition(null);
      setReady(false);
      return;
    }

    setReady(false);
    const nextPosition = measurePosition();
    if (nextPosition) {
      setPosition(nextPosition);
      setReady(true);
    }
  }, [visible, active, measurePosition]);

  useEffect(() => {
    if (!visible || !active) return;

    const handleOutsideTap = (e: Event) => {
      const trigger = triggerRef.current;
      const popup = popupRef.current;
      if (!trigger || !popup) return;
      const target = e.target as Node;
      if (!trigger.contains(target) && !popup.contains(target)) {
        onCloseRef.current();
      }
    };

    const follow = followOnScroll && !isMobile;
    let side: "above" | "below" | undefined;
    const handleDismiss = () => {
      if (!follow) {
        onCloseRef.current();
        return;
      }
      if (!side) {
        const p = popupRef.current?.getBoundingClientRect();
        const t = triggerRef.current?.getBoundingClientRect();
        side = p && t && p.top < t.top ? "above" : "below";
      }
      const next = measurePosition(side);
      if (next) {
        side = next.placement;
        setPosition(next);
      }
    };
    const handleReposition = () => {
      const nextPosition = measurePosition();
      if (nextPosition) {
        setPosition(nextPosition);
        setReady(true);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("touchstart", handleOutsideTap, { passive: true });
      document.addEventListener("mousedown", handleOutsideTap);
    }, 150);

    window.addEventListener("scroll", handleDismiss, { passive: true, capture: true });
    window.addEventListener("resize", handleReposition);
    window.addEventListener("orientationchange", handleReposition);
    window.visualViewport?.addEventListener("resize", handleReposition);

    // The popup can change height after it opens (a video reports its real
    // aspect ratio once metadata arrives); keep it anchored to the phrase.
    const popup = popupRef.current;
    const ro =
      popup && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(handleReposition)
        : null;
    if (popup && ro) ro.observe(popup);

    return () => {
      clearTimeout(timer);
      ro?.disconnect();
      document.removeEventListener("touchstart", handleOutsideTap);
      document.removeEventListener("mousedown", handleOutsideTap);
      window.removeEventListener("scroll", handleDismiss, { capture: true } as EventListenerOptions);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("orientationchange", handleReposition);
      window.visualViewport?.removeEventListener("resize", handleReposition);
    };
  }, [visible, active, measurePosition, popupRef, triggerRef, followOnScroll, isMobile]);

  return {
    isMobile,
    position,
    placement: position?.placement ?? null,
    caretLeft: position?.caretLeft ?? null,
    ready,
  };
}
