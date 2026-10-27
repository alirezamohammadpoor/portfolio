import Image from "next/image";
import type { PortableTextBlock } from "next-sanity";
import { PortableText } from "next-sanity";
import { imageUrl } from "@/sanity/lib/image";
import GlossaryTerm from "@/components/journal/GlossaryTerm";
import RichPreview from "@/components/journal/RichPreview";
import VideoPlayer from "@/components/player/VideoPlayer";

export const portableTextComponents = {
  marks: {
    underline: ({ children }: { children: React.ReactNode }) => (
      <span className="underline">{children}</span>
    ),
    link: ({
      value,
      children,
    }: {
      value?: { href?: string };
      children: React.ReactNode;
    }) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noopener noreferrer"
        className="link-highlight border-b border-primary"
      >
        {children}
      </a>
    ),
    glossary: ({
      value,
      children,
    }: {
      value?: { explanation?: string };
      children: React.ReactNode;
    }) => (
      <GlossaryTerm explanation={value?.explanation ?? ""}>
        {children}
      </GlossaryTerm>
    ),
    richPreview: ({
      value,
      children,
    }: {
      value?: {
        videoUrl?: string;
        image?: { asset?: { _ref: string }; alt?: string };
        url?: string;
        label?: string;
      };
      children: React.ReactNode;
    }) => {
      const imageSrc = value?.image?.asset
        ? imageUrl(value.image, 1200)
        : undefined;
      return (
        <RichPreview
          videoUrl={value?.videoUrl}
          imageUrl={imageSrc}
          imageAlt={value?.image?.alt}
          url={value?.url}
          label={value?.label}
        >
          {children}
        </RichPreview>
      );
    },
  },
  types: {
    videoBlock: ({
      value,
    }: {
      value: {
        videoUrl?: string;
        poster?: { asset?: { _ref: string } };
        label?: string;
        url?: string;
        hasAudio?: boolean;
      };
    }) => {
      if (!value?.videoUrl) return null;
      return (
        <VideoPlayer
          src={value.videoUrl}
          poster={value.poster?.asset ? imageUrl(value.poster, 1200) : undefined}
          label={value.label}
          linkUrl={value.url}
          aspect="16/9"
          hasAudio={value.hasAudio ?? undefined}
          trackId={value.label}
          className="my-8"
        />
      );
    },
    image: ({
      value,
    }: {
      value: {
        asset?: { _ref: string };
        hotspot?: unknown;
        crop?: unknown;
        alt?: string;
      };
    }) => {
      if (!value?.asset) return null;
      return (
        <div className="relative my-8 aspect-[4/3] w-full overflow-hidden">
          <Image
            src={imageUrl(value, 1200)}
            alt={value.alt ?? ""}
            fill
            className="object-contain"
            sizes="(min-width: 75rem) 50vw, 100vw"
          />
        </div>
      );
    },
    quote: ({
      value,
    }: {
      value: { text?: PortableTextBlock[]; attribution?: PortableTextBlock[] };
    }) => (
      <figure className="my-8 border-l border-primary pl-4">
        <blockquote className="text-sub desktop:text-body text-primary font-medium italic [&>p]:inline">
          &ldquo;
          {value.text && (
            <PortableText
              value={value.text}
              components={{
                ...portableTextComponents,
                marks: {
                  ...portableTextComponents.marks,
                  richPreview: ({
                    children,
                  }: {
                    children: React.ReactNode;
                  }) => <span>{children}</span>,
                  glossary: ({ children }: { children: React.ReactNode }) => (
                    <span>{children}</span>
                  ),
                },
              }}
            />
          )}
          &rdquo;
        </blockquote>
        {value.attribution && (
          <figcaption className="mt-2">
            <cite className="block text-sub desktop:text-body text-primary not-italic [&>p]:inline">
              —{" "}
              <PortableText
                value={value.attribution}
                components={portableTextComponents}
              />
            </cite>
          </figcaption>
        )}
      </figure>
    ),
  },
};
