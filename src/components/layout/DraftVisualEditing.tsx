"use client";

import { useRouter } from "next/navigation";
import { VisualEditing } from "next-sanity/visual-editing";

/**
 * Visual editing overlays for the Presentation tool, with the refresh made
 * explicit: no token reaches the browser (defineLive browserToken: false),
 * so there is no live draft connection, and the default handler ignores
 * mutations. Each edit burst re-renders the draft page through
 * router.refresh(), throttled to one every 2.5 s: draft mode skips every
 * cache, so each refresh is a full server render, and a typing burst should
 * cost one or two of them, not one a second.
 */
const REFRESH_THROTTLE_MS = 2500;

export default function DraftVisualEditing() {
  const router = useRouter();
  return (
    <VisualEditing
      refresh={(payload) => {
        if (payload.source === "manual" || payload.source === "mutation") {
          router.refresh();
          return new Promise((resolve) => setTimeout(resolve, REFRESH_THROTTLE_MS));
        }
        return false;
      }}
    />
  );
}
