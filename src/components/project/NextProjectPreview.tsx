"use client";

import { useEffect, useRef, type RefObject } from "react";
import Image from "next/image";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { imageUrl, fileUrl } from "@/sanity/lib/image";
import { isPlainLeftClick } from "@/lib/clicks";

export type NextProject = NonNullable<NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>["nextProject"]>;

interface NextProjectPreviewProps {
  nextProject: NextProject;
  /** The block's root: its media rect is the source of the clone morph. */
  previewRef?: RefObject<HTMLDivElement | null>;
  /** Fired on click instead of a plain navigation. */
  onNavigate: () => void;
  /** Image width hint for the Sanity URL (desktop 1200, stage 900). */
  imageWidth?: number;
  sizes?: string;
  /** The box ratio: 4:3 on the gallery page, 16:10 on the chapter page (flush covers). */
  aspect?: number;
}

/**
 * The preview's <video> is created and owned here, imperatively, not by
 * React. The project → project transition moves that element out of this
 * block (into the clone, then into the next page's first item, see
 * adoptVideo.ts), and this page stays mounted in a hidden Activity while the
 * next one is up. Were React the owner it would still believe the element
 * is here: a later prop update would hit a detached node, and on browser
 * back the preview box would stay empty. Owning it here, each time the page
 * shows (effects run again on return) a missing element is simply re-created.
 */
function PreviewVideo({
  src,
  poster,
  hostRef,
  aspect,
}: {
  src: string;
  poster?: string;
  hostRef?: RefObject<HTMLDivElement | null>;
  aspect: number;
}) {
  const localRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = localRef.current;
    if (!host) return;
    let video = host.querySelector("video");
    if (!video) {
      video = document.createElement("video");
      video.className = "h-full w-full object-cover";
      video.setAttribute("aria-hidden", "true");
      // Content attributes, not only IDL properties: Safari's autoplay policy
      // reads the markup state, and the `muted` property does not reflect to
      // the attribute. This is the element React used to render, built by
      // hand. No `autoplay`: with it every browser fetches at once whatever
      // `preload` says; the observer below starts playback instead.
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("loop", "");
      // Nothing is fetched until the block comes near the viewport (below):
      // on a chapter page it sits at the very bottom, on the stage at the far
      // end of the strip, and a decoder it may never reach is not kept running.
      video.setAttribute("preload", "none");
      video.muted = true;
      if (poster) video.poster = poster;
      video.src = src;
      host.appendChild(video);
    }
    const el = video;
    let asked = false;
    // On the stage the block sits in the horizontal strip: measured against
    // the viewport it would count as hidden until it scrolls into the strip's
    // clip, so the strip is the root there and the margin is one strip-width
    // sideways. On a chapter page it is in the page flow, one screen ahead.
    const strip = host.closest<HTMLElement>("[data-stage-strip]");
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        // Once carried away by the transition the clip is the clone's, then
        // the landing page's: this page going hidden must not pause it.
        if (el.parentElement !== host) return;
        if (!entry?.isIntersecting) {
          el.pause();
          return;
        }
        // iOS Safari treats preload as a hint and may not fetch until asked; a
        // preview that is still black when tapped cannot be carried as the
        // clone. Asked once: load() restarts a fetch that is under way.
        if (el.readyState < 2 && !asked) {
          asked = true;
          el.preload = "auto";
          el.load();
        }
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      },
      // One card or one screen ahead, so the clip has that scroll to load.
      strip ? { root: strip, rootMargin: "0px 100%" } : { rootMargin: "100%" },
    );
    io.observe(host);
    return () => {
      io.disconnect();
      // Only ours to pause while it is still here; once carried away by the
      // transition it belongs to the clone and then to the landing page.
      if (el.parentElement === host) el.pause();
    };
  }, [src, poster]);
  return (
    <div
      ref={(el) => {
        localRef.current = el;
        if (hostRef) hostRef.current = el;
      }}
      data-next-project-preview
      className="relative w-full overflow-hidden bg-tertiary"
      style={{ aspectRatio: aspect }}
    />
  );
}

/**
 * Nudges the preview's clip before it is carried away: a clip that is still
 * loading lands as a black card. Asked on the gesture itself, iOS fetches
 * where it ignored the preload hint; a fetch already under way is left
 * alone (load() would restart it).
 */
export function warmPreviewVideo(host: HTMLElement | null): void {
  const video = host?.querySelector("video");
  if (!video || video.readyState >= 2 || video.networkState === HTMLMediaElement.NETWORK_LOADING) return;
  video.preload = "auto";
  video.load();
  const p = video.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

/**
 * The next project's first gallery media at the end of the current gallery.
 * Looks like one more gallery item (4:3, object-cover) because it is the
 * morph source for the project → project transition: scrolling or tapping
 * past it carries this exact box up into the first-item slot of the next
 * page. A real link underneath, so it works without JS and for crawlers.
 */
export default function NextProjectPreview({
  nextProject,
  previewRef,
  onNavigate,
  imageWidth = 1200,
  sizes = "(min-width: 75rem) 50vw, 100vw",
  aspect = 4 / 3,
}: NextProjectPreviewProps) {
  const slug = nextProject.slug?.current;
  const media = nextProject.firstMedia;
  if (!slug || !media) return null;

  const isImage = media._type === "galleryImage";
  const videoSrc = !isImage && media.video?.asset?._ref ? fileUrl(media.video.asset._ref) : null;
  const poster = !isImage && media.poster?.asset ? imageUrl(media.poster, imageWidth) : undefined;
  const label = `Next project – ${nextProject.title ?? ""}`;

  return (
    <a
      href={`/project/${slug}`}
      aria-label={label}
      className="block"
      onClick={(e) => {
        if (!isPlainLeftClick(e)) return;
        e.preventDefault();
        onNavigate();
      }}
    >
      {videoSrc ? (
        <PreviewVideo src={videoSrc} poster={poster} hostRef={previewRef} aspect={aspect} />
      ) : (
        <div
          ref={previewRef}
          data-next-project-preview
          className="relative w-full overflow-hidden bg-tertiary"
          style={{ aspectRatio: aspect }}
        >
          {isImage && media.image?.asset && (
            <Image
              src={imageUrl(media.image, imageWidth)}
              alt=""
              fill
              className="object-cover"
              sizes={sizes}
            />
          )}
        </div>
      )}
    </a>
  );
}
