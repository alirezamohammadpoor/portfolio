import Image from "next/image";
import type { PROJECTS_QUERY_RESULT } from "@/sanity/types";
import { urlFor } from "@/sanity/lib/image";

interface MediaPanelProps {
  coverMedia: PROJECTS_QUERY_RESULT[number]["coverMedia"];
  title: string;
  priority?: boolean;
}

export default function MediaPanel({ coverMedia, title, priority = false }: MediaPanelProps) {
  if (coverMedia?.type === "video" && coverMedia.video?.asset) {
    return (
      <div className="relative w-full overflow-hidden bg-tertiary h-full">
        <video
          className="h-full w-full object-cover"
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
          src={urlFor(coverMedia.image).width(780).quality(85).url()}
          alt={title}
          fill
          className="object-cover"
          sizes="100vw"
          priority={priority}
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
