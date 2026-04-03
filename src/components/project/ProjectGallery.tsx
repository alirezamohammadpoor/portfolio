import type { RefObject } from "react";
import Image from "next/image";
import type { PROJECT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { urlFor } from "@/sanity/lib/image";

type ProjectImages = NonNullable<NonNullable<PROJECT_BY_SLUG_QUERY_RESULT>["images"]>;

interface ProjectGalleryProps {
  images: ProjectImages;
  projectTitle: string | null;
  originalCount: number;
  galleryRef: RefObject<HTMLDivElement | null>;
  firstImageRef: RefObject<HTMLDivElement | null>;
  isTransitioning: boolean;
}

export default function ProjectGallery({
  images,
  projectTitle,
  originalCount,
  galleryRef,
  firstImageRef,
  isTransitioning,
}: ProjectGalleryProps) {
  return (
    <div
      ref={galleryRef}
      className={`flex flex-col gap-2 px-4 pb-10 desktop:px-6 desktop:ml-[50%] desktop:w-1/2${isTransitioning ? " invisible" : ""}`}
    >
      {images.map((image, i) => (
        <div
          key={image._key}
          ref={i === 0 ? firstImageRef : undefined}
          className="relative h-[70dvh] w-full bg-tertiary [content-visibility:auto] [contain-intrinsic-size:auto_70dvh]"
        >
          {image.asset && (
            <Image
              src={urlFor(image).width(1200).quality(85).url()}
              alt={`${projectTitle} — ${(i % originalCount) + 1}`}
              fill
              className="object-cover"
              sizes="(min-width: 75rem) 50vw, 100vw"
              priority={i === 0}
            />
          )}
        </div>
      ))}
    </div>
  );
}
