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
  mediaType: MediaType | null;
  imageUrl: string | null;
  videoSrc: string | null;
  videoCurrentTime: number | null;
  sourceVideoElement: HTMLVideoElement | null;
  sourceRect: Rect | null;
  targetRect: Rect | null;
}

interface StartTransitionArgs {
  mediaType: MediaType;
  imageUrl?: string;
  videoSrc?: string;
  videoCurrentTime?: number;
  sourceVideoElement?: HTMLVideoElement;
  sourceRect: Rect;
}

interface TransitionContextValue extends TransitionState {
  startTransition: (args: StartTransitionArgs) => void;
  animateClone: (targetRect: Rect) => void;
  clearTransition: () => void;
}

const initial: TransitionState = {
  isTransitioning: false,
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
  clearTransition: () => {},
});

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TransitionState>(initial);

  const startTransition = useCallback((args: StartTransitionArgs) => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.customClone = "true";
    }
    setState({
      isTransitioning: true,
      mediaType: args.mediaType,
      imageUrl: args.imageUrl ?? null,
      videoSrc: args.videoSrc ?? null,
      videoCurrentTime: args.videoCurrentTime ?? null,
      sourceVideoElement: args.sourceVideoElement ?? null,
      sourceRect: args.sourceRect,
      targetRect: null,
    });
  }, []);

  const animateClone = useCallback((targetRect: Rect) => {
    setState((prev) => ({ ...prev, targetRect }));
  }, []);

  const clearTransition = useCallback(() => {
    if (typeof document !== "undefined") {
      delete document.documentElement.dataset.customClone;
    }
    setState(initial);
  }, []);

  return (
    <TransitionContext value={{ ...state, startTransition, animateClone, clearTransition }}>
      {children}
    </TransitionContext>
  );
}

export function usePageTransition() {
  return useContext(TransitionContext);
}
