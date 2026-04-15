"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useAnchoredMobileOverlay } from "@/hooks/useAnchoredMobileOverlay";

interface GlossaryTermProps {
  explanation: string;
  children: React.ReactNode;
}

export default function GlossaryTerm({
  explanation,
  children,
}: GlossaryTermProps) {
  const [visible, setVisible] = useState(false);
  const [anchorPoint, setAnchorPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLSpanElement>(null);

  const close = useCallback(() => {
    setVisible(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const { isMobile, position, placement, caretLeft, ready } =
    useAnchoredMobileOverlay(triggerRef, popupRef, {
      visible,
      onClose: close,
      anchorPoint,
    });

  useGSAP(
    () => {
      const el = triggerRef.current;
      if (!el) return;

      gsap.set(el, {
        backgroundImage:
          "linear-gradient(var(--color-lightpistachio), var(--color-lightpistachio))",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left center",
        backgroundSize: "0% 100%",
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      });

      gsap.to(el, {
        backgroundSize: "100% 100%",
        duration: 0.8,
        delay: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          once: true,
        },
      });
    },
    { scope: triggerRef, dependencies: [isMobile] },
  );

  const handleClick = (event: MouseEvent<HTMLSpanElement>) => {
    setAnchorPoint({ x: event.clientX, y: event.clientY });

    if (visible) {
      close();
      return;
    }

    setVisible(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(false), 6000);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const mobileStyle =
    position === null
      ? { top: 0, left: 0, visibility: "hidden" as const }
      : { top: position.top, left: position.left };

  if (isMobile) {
    return (
      <span className="relative inline">
        {visible &&
          typeof document !== "undefined" &&
          createPortal(
            <span
              ref={popupRef}
              className={`fixed z-50 transition-opacity duration-300 ${
                ready ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              style={mobileStyle}
            >
              <span className="relative block">
                {placement === "below" && caretLeft !== null && (
                  <span
                    className="absolute bottom-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-x-transparent border-b-[6px] border-b-pistachio"
                    style={{ left: caretLeft }}
                  />
                )}

                <span
                  className="block rounded-2xl bg-pistachio px-4 py-2 text-left text-sub text-primary whitespace-normal"
                  style={{
                    maxWidth: "min(320px, calc(100vw - 32px))",
                    width: "max-content",
                  }}
                >
                  {explanation}
                </span>

                {placement === "above" && caretLeft !== null && (
                  <span
                    className="absolute top-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-x-transparent border-t-[6px] border-t-pistachio"
                    style={{ left: caretLeft }}
                  />
                )}
              </span>
            </span>,
            document.body,
          )}

        <span
          ref={triggerRef}
          role="button"
          tabIndex={0}
          aria-label={`Definition: ${explanation}`}
          aria-expanded={visible}
          onClick={handleClick}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(e as unknown as MouseEvent<HTMLSpanElement>); } }}
          className="cursor-pointer"
        >
          {children}
        </span>
      </span>
    );
  }

  return (
    <span className="relative inline">
      <span
        ref={popupRef}
        className={`pointer-events-none fixed bottom-auto left-1/2 top-1/2 z-50 mb-0 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] desktop:absolute desktop:bottom-full desktop:top-auto desktop:-translate-x-1/2 desktop:translate-y-0 ${
          visible ? "opacity-100" : "opacity-0 desktop:translate-y-1"
        }`}
      >
        <span className="w-max max-w-[300px] rounded-2xl bg-pistachio px-4 py-2 text-left text-sub text-primary whitespace-normal">
          {explanation}
        </span>
        <span className="hidden h-0 w-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-pistachio desktop:block" />
      </span>

      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-label={`Definition: ${explanation}`}
        aria-expanded={visible}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(e as unknown as MouseEvent<HTMLSpanElement>); } }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => {
          setVisible(false);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }}
        onFocus={() => setVisible(true)}
        onBlur={() => {
          setVisible(false);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }}
        className="cursor-pointer"
      >
        {children}
      </span>
    </span>
  );
}
