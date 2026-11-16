import { useEffect, type RefObject } from "react";

/**
 * A modal dialog for the keyboard: focus moves to `initial` on open, Tab
 * cycles inside `root`, Escape closes, and on close focus goes back to the
 * control that opened it (or stays wherever it was, on unmount).
 */
export function useModalFocus(
  open: boolean,
  rootRef: RefObject<HTMLElement | null>,
  initialRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      );
      if (!focusables.length) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", onKey);
    initialRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      const active = document.activeElement;
      if (opener && opener.isConnected && (!active || active === document.body || root?.contains(active))) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [open, onClose, rootRef, initialRef]);
}
