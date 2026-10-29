"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

type MediaType = "image" | "video";

interface TransitionState {
  isTransitioning: boolean;
  /**
   * Counts transitions. A page that mounted while one was running records
   * its id and is that transition's landing page; the page being left sees
   * the same flags flip and must not hide itself (see ProjectPageClient).
   */
  id: number;
  /**
   * True once the clone morph is far enough along (≈40 %) for the destination
   * text to start masking in underneath it. Resets with the transition.
   */
  contentRevealed: boolean;
  /**
   * The landing media (gallery item 1) has a frame to paint (image load /
   * video `loadeddata`, not `loadedmetadata`, which fires while a <video>
   * still paints black). The morph starts on layout alone; this only gates
   * when the clone may be removed.
   */
  targetReady: boolean;
  /**
   * The clone already sits on its landing rect (project → project): no morph,
   * the destination reveals at once and scroll unlocks early.
   */
  inPlace: boolean;
  /**
   * The clone has landed and the page under it may show. The clone itself
   * stays for a couple of frames more, so a <video> that was sitting in an
   * opacity-0 subtree gets composited before the cover goes (otherwise its
   * first visible frame is black).
   */
  pageRevealed: boolean;
  mediaType: MediaType | null;
  imageUrl: string | null;
  videoSrc: string | null;
  videoCurrentTime: number | null;
  sourceVideoElement: HTMLVideoElement | null;
  sourceRect: Rect | null;
  targetRect: Rect | null;
}

export interface StartTransitionArgs {
  mediaType: MediaType;
  imageUrl?: string;
  videoSrc?: string;
  videoCurrentTime?: number;
  sourceVideoElement?: HTMLVideoElement;
  sourceRect: Rect;
  inPlace?: boolean;
}

interface TransitionContextValue extends TransitionState {
  startTransition: (args: StartTransitionArgs) => void;
  animateClone: (targetRect: Rect) => void;
  revealContent: () => void;
  markTargetReady: () => void;
  revealPage: () => void;
  clearTransition: () => void;
}

const initial: TransitionState = {
  isTransitioning: false,
  id: 0,
  contentRevealed: false,
  targetReady: false,
  inPlace: false,
  pageRevealed: false,
  mediaType: null,
  imageUrl: null,
  videoSrc: null,
  videoCurrentTime: null,
  sourceVideoElement: null,
  sourceRect: null,
  targetRect: null,
};

const TransitionContext = createContext<TransitionContextValue>({
  ...initial,
  startTransition: () => {},
  animateClone: () => {},
  revealContent: () => {},
  markTargetReady: () => {},
  revealPage: () => {},
  clearTransition: () => {},
});

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TransitionState>(initial);

  const startTransition = useCallback((args: StartTransitionArgs) => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.customClone = "true";
    }
    setState((prev) => ({
      isTransitioning: true,
      id: prev.id + 1,
      contentRevealed: false,
      targetReady: false,
      inPlace: args.inPlace ?? false,
      pageRevealed: false,
      mediaType: args.mediaType,
      imageUrl: args.imageUrl ?? null,
      videoSrc: args.videoSrc ?? null,
      videoCurrentTime: args.videoCurrentTime ?? null,
      sourceVideoElement: args.sourceVideoElement ?? null,
      sourceRect: args.sourceRect,
      targetRect: null,
    }));
  }, []);

  const animateClone = useCallback((targetRect: Rect) => {
    setState((prev) => ({ ...prev, targetRect }));
  }, []);

  const revealContent = useCallback(() => {
    setState((prev) => (prev.contentRevealed ? prev : { ...prev, contentRevealed: true }));
  }, []);

  const markTargetReady = useCallback(() => {
    setState((prev) => (prev.targetReady || !prev.isTransitioning ? prev : { ...prev, targetReady: true }));
  }, []);

  const revealPage = useCallback(() => {
    setState((prev) => (prev.pageRevealed || !prev.isTransitioning ? prev : { ...prev, pageRevealed: true }));
  }, []);

  const clearTransition = useCallback(() => {
    if (typeof document !== "undefined") {
      delete document.documentElement.dataset.customClone;
    }
    setState((prev) => ({ ...initial, id: prev.id }));
  }, []);

  return (
    <TransitionContext
      value={{ ...state, startTransition, animateClone, revealContent, markTargetReady, revealPage, clearTransition }}
    >
      {children}
    </TransitionContext>
  );
}

export function usePageTransition() {
  return useContext(TransitionContext);
}
