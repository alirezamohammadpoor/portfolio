import Image from "next/image";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import { urlFor, fileUrl } from "@/sanity/lib/image";

interface MediaPanelProps {
  coverMedia: PROJECTS_QUERY_RESULT[number]["coverMedia"];
  title: string;
  priority?: boolean;
}

export default function MediaPanel({
  coverMedia,
  title,
  priority = false,
}: MediaPanelProps) {
  if (coverMedia?.type === "video" && coverMedia.video?.asset?._ref) {
    return (
      <div className="relative w-full overflow-hidden bg-tertiary h-full">
        <video
          src={fileUrl(coverMedia.video.asset._ref)}
          className="h-full w-full object-cover"
          aria-label={`${title} cover video`}
          autoPlay
          muted
          loop
          playsInline
        />
      </div>
    );
  }

  if (coverMedia?.type === "image" && coverMedia.image?.asset) {
    return (
      <div className="relative w-full overflow-hidden bg-tertiary h-full">
        <Image
          src={urlFor(coverMedia.image).width(1400).quality(85).url()}
          alt={title}
          fill
          className="object-cover"
          sizes="(min-width: 75rem) 50vw, 100vw"
          priority={priority}
          fetchPriority="high"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden bg-tertiary h-full">
      <div className="flex h-full items-center justify-center text-sub text-secondary">
        {title} media
      </div>
    </div>
  );
}
