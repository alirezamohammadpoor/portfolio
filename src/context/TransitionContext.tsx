"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TransitionState {
  isTransitioning: boolean;
  imageUrl: string | null;
  sourceRect: Rect | null;
  targetRect: Rect | null;
}

interface TransitionContextValue extends TransitionState {
  startTransition: (imageUrl: string, sourceRect: Rect) => void;
  animateClone: (targetRect: Rect) => void;
  clearTransition: () => void;
}

const initial: TransitionState = {
  isTransitioning: false,
  imageUrl: null,
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

  const startTransition = useCallback((imageUrl: string, sourceRect: Rect) => {
    setState({ isTransitioning: true, imageUrl, sourceRect, targetRect: null });
  }, []);

  const animateClone = useCallback((targetRect: Rect) => {
    setState((prev) => ({ ...prev, targetRect }));
  }, []);

  const clearTransition = useCallback(() => {
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
