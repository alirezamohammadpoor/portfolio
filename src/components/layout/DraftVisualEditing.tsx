"use client";

import { useRouter } from "next/navigation";
import { VisualEditing } from "next-sanity/visual-editing";

/**
 * Visual editing overlays for the Presentation tool, with the refresh made
 * explicit: no token reaches the browser (defineLive browserToken: false),
 * so there is no live draft connection, and the default handler ignores
 * mutations. Each edit burst re-renders the draft page through
 * router.refresh(); the 1 s promise throttles it the way next-sanity's own
 * manual refresh does.
 */
export default function DraftVisualEditing() {
  const router = useRouter();
  return (
    <VisualEditing
      refresh={(payload) => {
        if (payload.source === "manual" || payload.source === "mutation") {
          router.refresh();
          return new Promise((resolve) => setTimeout(resolve, 1000));
        }
        return false;
      }}
    />
  );
}
