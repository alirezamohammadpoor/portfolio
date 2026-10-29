"use client";

/**
 * Root view transitions for link navigations: the `Link` and
 * `useTransitionRouter` of next-view-transitions (0.3.5), minus its popstate
 * hook. That hook started a view transition on every browser back/forward
 * and held the DOM update until the new pathname had rendered; with Next 16
 * keeping the previous pages mounted (Activity), that wait regularly ran
 * into the browser's 4 s limit ("Transition was aborted because of timeout
 * in DOM update"), during which nothing on screen could move, and the
 * restored page then snapped in. Back and forward are plain now; the clone
 * morph and the root slide only run on navigations this site starts.
 */

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  startTransition,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
} from "react";

type FinishSetter = (fn: () => void) => void;

const ViewTransitionsContext = createContext<FinishSetter | null>(null);

export function ViewTransitions({ children }: { children: React.ReactNode }) {
  // The route push resolves its view transition on the commit that follows
  // it: the resolver waits in a ref, a state bump guarantees that commit.
  const pending = useRef<(() => void) | null>(null);
  const [, bump] = useState(0);
  const setFinish = useCallback<FinishSetter>((fn) => {
    pending.current = fn;
    bump((n) => n + 1);
  }, []);
  useEffect(() => {
    const finish = pending.current;
    if (finish) {
      pending.current = null;
      finish();
    }
  });
  return <ViewTransitionsContext value={setFinish}>{children}</ViewTransitionsContext>;
}

function useSetFinishViewTransition(): FinishSetter {
  const context = use(ViewTransitionsContext);
  if (!context) throw new Error("useTransitionRouter must be used within <ViewTransitions>");
  return context;
}

type Router = ReturnType<typeof useRouter>;
type NavigateOptions = Parameters<Router["push"]>[1];
interface TransitionOptions {
  onTransitionReady?: () => void;
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (cb: () => Promise<void>) => { ready: Promise<void> };
};

export function useTransitionRouter() {
  const router = useRouter();
  const finishViewTransition = useSetFinishViewTransition();

  const triggerTransition = useCallback(
    (cb: () => void, { onTransitionReady }: TransitionOptions = {}) => {
      const doc = document as DocumentWithViewTransition;
      if (typeof doc.startViewTransition !== "function") {
        cb();
        return;
      }
      const transition = doc.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            startTransition(() => {
              cb();
              finishViewTransition(resolve);
            });
          }),
      );
      if (onTransitionReady) transition.ready.then(onTransitionReady);
    },
    [finishViewTransition],
  );

  const push = useCallback(
    (href: string, { onTransitionReady, ...options }: NavigateOptions & TransitionOptions = {}) => {
      triggerTransition(() => router.push(href, options), { onTransitionReady });
    },
    [triggerTransition, router],
  );

  const replace = useCallback(
    (href: string, { onTransitionReady, ...options }: NavigateOptions & TransitionOptions = {}) => {
      triggerTransition(() => router.replace(href, options), { onTransitionReady });
    },
    [triggerTransition, router],
  );

  return useMemo(() => ({ ...router, push, replace }), [push, replace, router]);
}

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>) {
  const target = event.currentTarget.getAttribute("target");
  return (
    (target && target !== "_self") ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    (event.nativeEvent && event.nativeEvent.which === 2)
  );
}

/** next/link that navigates through the router and runs the root view transition. */
export function Link(props: ComponentProps<typeof NextLink>) {
  const router = useTransitionRouter();
  const { href, as, replace, scroll, onClick } = props;
  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (!("startViewTransition" in document)) return;
      if (isModifiedEvent(e)) return;
      e.preventDefault();
      const navigate = replace ? router.replace : router.push;
      navigate(String(as ?? href), { scroll: scroll ?? true });
    },
    [onClick, href, as, replace, scroll, router],
  );
  return <NextLink {...props} onClick={handleClick} />;
}
