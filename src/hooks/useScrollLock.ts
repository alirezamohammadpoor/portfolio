// Global scroll lock — registered once, enforced via preventDefault on wheel/touch.
// Pattern from julesmesnil.fr: a single mutable ref checked by a permanent listener.

let locked = false;

function handler(e: Event) {
  if (locked) {
    e.preventDefault();
  }
}

// Register global listeners once (module-level, runs on first import)
if (typeof window !== "undefined") {
  window.addEventListener("wheel", handler, { passive: false, capture: true });
  window.addEventListener("touchmove", handler, { passive: false, capture: true });
}

export function lockScroll() {
  locked = true;
}

export function unlockScroll() {
  locked = false;
}
