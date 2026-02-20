import type { SanityImage } from "@/types";

interface ProjectGalleryProps {
  images: SanityImage[];
}

export default function ProjectGallery({ images }: ProjectGalleryProps) {
  return (
    <div className="grid grid-cols-2 gap-4 px-6">
      {images.length > 0 ? (
        images.map((_, i) => (
          <div
            key={i}
            className={`bg-tertiary ${i === images.length - 1 && images.length % 2 !== 0 ? "col-span-2 aspect-square" : "aspect-[163/347]"}`}
          />
        ))
      ) : (
        <>
          <div className="aspect-[163/347] bg-tertiary" />
          <div className="aspect-[163/347] bg-tertiary" />
          <div className="col-span-2 aspect-square bg-tertiary" />
        </>
      )}
    </div>
  );
}
