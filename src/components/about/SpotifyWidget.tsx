"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";

const CACHE_KEY = "spotify-last-track";

interface TrackData {
  isPlaying: boolean;
  title: string;
  artist: string;
  album: string;
  albumImageUrl: string | null;
  songUrl: string;
  playedAt: string | null;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "1m ago";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function SpotifyIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function TrackMarquee({
  title,
  artist,
  hovered,
  isActive,
}: {
  title: string;
  artist: string;
  hovered: boolean;
  isActive: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const trackKey = useMemo(() => `${title}\0${artist}`, [title, artist]);

  useEffect(() => {
    function measure() {
      const container = containerRef.current;
      const inner = innerRef.current;
      if (!container || !inner) return;
      const overflow = inner.scrollWidth - container.clientWidth;
      setOffset(overflow > 2 ? overflow + 24 : 0);
    }
    if (document.fonts?.ready) document.fonts.ready.then(measure);
    else measure();
  }, [trackKey]);

  const duration = offset > 0 ? `${Math.max(6, offset / 30)}s` : "10s";

  return (
    <div className="relative min-w-0 overflow-hidden" ref={containerRef}>
      {offset > 0 && (
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-6"
          style={{
            background: `linear-gradient(to left, ${hovered ? "var(--color-lightpistachio)" : "var(--color-pistachio)"}, transparent)`,
          }}
        />
      )}
      <div
        ref={innerRef}
        className={`flex w-fit items-center gap-1 whitespace-nowrap${offset > 0 && !hovered ? " spotify-marquee-active" : ""}`}
        style={{
          ...(offset > 0
            ? ({
                "--marquee-offset": `-${offset}px`,
                "--marquee-duration": duration,
              } as React.CSSProperties)
            : {}),
          ...(hovered
            ? {
                transform: "translateX(0)",
                transition: "transform 0.4s ease-out",
              }
            : {}),
        }}
      >
        <span
          className="inline-flex items-center overflow-hidden transition-[width,margin] duration-200"
          style={{
            width: hovered ? "14px" : "0px",
            marginRight: hovered ? "2px" : "-4px",
          }}
        >
          <SpotifyIcon
            className={`h-[14px] w-[14px] shrink-0 transition-[transform,opacity,filter] duration-200${isActive ? " text-spotify" : " text-primary/50"}`}
            style={
              {
                opacity: hovered ? 1 : 0,
                filter: hovered ? "blur(0px)" : "blur(4px)",
                transform: hovered ? "scale(1)" : "scale(0.8)",
              } as React.CSSProperties
            }
          />
        </span>
        <span className="text-sub text-primary">{title}</span>
        <span className="text-sub text-primary/50">&middot;</span>
        <span className="text-sub text-primary/50">{artist}</span>
      </div>
      {offset > 0 && (
        <div
          className="spotify-marquee-left-fade pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-6"
          style={
            {
              background: `linear-gradient(to right, ${hovered ? "var(--color-lightpistachio)" : "var(--color-pistachio)"}, transparent)`,
              "--marquee-duration": duration,
            } as React.CSSProperties
          }
        />
      )}
    </div>
  );
}

function useSpotifyData() {
  const [data, setData] = useState<TrackData | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastTrackRef = useRef<string | null>(null);
  const lastPlayingRef = useRef<boolean | null>(null);
  const cachedAtRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        setData({ ...cached.track, isPlaying: false });
        setCachedAt(cached.cachedAt);
        cachedAtRef.current = cached.cachedAt;
        lastTrackRef.current = cached.track.songUrl;
      }
    } catch {}
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/now-playing");
      if (!res.ok) return;
      const json = await res.json();
      if (json.error) return;
      const trackChanged = json.songUrl !== lastTrackRef.current;
      const statusChanged = lastPlayingRef.current !== json.isPlaying;
      if (trackChanged || statusChanged || lastPlayingRef.current === null) {
        setData(json);
      }
      lastPlayingRef.current = json.isPlaying;
      const now = new Date().toISOString();
      const newCachedAt = json.isPlaying ? now : (cachedAtRef.current ?? now);
      if (trackChanged || statusChanged) {
        setCachedAt(newCachedAt);
      }
      cachedAtRef.current = newCachedAt;

      // Only write localStorage when track changes
      if (json.songUrl !== lastTrackRef.current) {
        lastTrackRef.current = json.songUrl;
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ track: json, cachedAt: newCachedAt }),
          );
        } catch {}
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => {
      if (!document.hidden) fetchData();
    }, 10_000);
    return () => clearInterval(timer);
  }, [fetchData]);

  return { data, cachedAt, isLoading };
}

function useTimeLabel(data: TrackData | null, cachedAt: string | null) {
  if (!data) return "recently";
  if (data.isPlaying) return "Now";
  if (data.playedAt) return timeAgo(data.playedAt);
  if (cachedAt) return timeAgo(cachedAt);
  return "recently";
}

export default function SpotifyWidget() {
  const { data, cachedAt, isLoading } = useSpotifyData();
  const [hovered, setHovered] = useState(false);
  const timeLabel = useTimeLabel(data, cachedAt);

  if (isLoading && !data) {
    return (
      <div className="flex w-full animate-pulse items-center gap-2.5 rounded-full bg-pistachio px-2.5 py-2">
        <div className="h-8 w-8 rounded-lg bg-primary/10" />
        <div className="flex flex-1 flex-col gap-1">
          <div className="h-3 w-20 rounded bg-primary/10" />
          <div className="h-4 w-32 rounded bg-primary/10" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isActive = data.isPlaying;

  return (
    <a
      href={data.songUrl}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex w-full items-center gap-4 rounded-full py-2 pl-4 pr-5 outline-none transition-[background-color] duration-200 focus-visible:ring-2 bg-pistachio hover:bg-lightpistachio active:scale-[0.97]"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg shadow-[3px_3px_4px_0px_rgba(0,0,0,0.12)]">
          {data.albumImageUrl && (
            <Image
              src={data.albumImageUrl}
              alt={data.title}
              fill
              className="object-cover"
              sizes="32px"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sub text-primary/50">
            {isActive ? "Listening to..." : "Last listened to"}
          </span>
          <TrackMarquee
            title={data.title}
            artist={data.artist}
            hovered={hovered}
            isActive={isActive}
          />
        </div>
      </div>

      <div className="relative grid shrink-0 items-center pr-1">
        <div
          className="col-start-1 row-start-1 flex items-center justify-end gap-3 transition-[transform,opacity,filter] duration-200"
          style={{
            opacity: hovered ? 0 : 1,
            filter: hovered ? "blur(4px)" : "blur(0px)",
            transform: hovered ? "scale(0.9)" : "scale(1)",
          }}
        >
          {isActive && (
            <span className="h-1 w-1 animate-pulse rounded-full bg-spotify" />
          )}
          <span
            className={`font-mono text-sub ${isActive ? "text-spotify" : "text-primary/50"}`}
          >
            {timeLabel}
          </span>
        </div>
        <div
          className="col-start-1 row-start-1 flex items-center justify-end gap-3 transition-[transform,opacity,filter] duration-200"
          style={{
            opacity: hovered ? 1 : 0,
            filter: hovered ? "blur(0px)" : "blur(4px)",
            transform: hovered ? "scale(1)" : "scale(0.8)",
          }}
        >
          <span
            className={`font-mono text-sub ${isActive ? "text-spotify" : "text-primary/50"}`}
          >
            View
          </span>
        </div>
      </div>
    </a>
  );
}
